#!/usr/bin/env python3
"""Publish a built release of the blog.

Uploads ``blog-dist-<RELEASE>.tar.gz`` to OSS, then has the ECS host pull it,
swap the ``current`` symlink and reload nginx.

Credentials are never stored here. They are read at runtime from
``~/.aliyun/config.json`` (or the ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET
environment variables, which take precedence).

Usage:
    python scripts/deploy.py <release-tag>
    BLOG_RELEASE=<release-tag> python scripts/deploy.py
"""
import base64
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import oss2
from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.request import RpcRequest

INSTANCE = "i-2zeb1p4opgtt6d5kb2hs"
REGION = "cn-beijing"
OSS_ENDPOINT = "https://oss-cn-hangzhou.aliyuncs.com"
OSS_BUCKET = "intellex-pdfs"
SITE_ROOT = "/var/www/me.oopsbox.cn"
SITE_URL = "https://me.oopsbox.cn"
SMOKE_PATHS = ["/", "/posts/", "/essays/", "/about/"]


def load_credentials():
    """The aliyun CLI profile first, then the environment. Never a literal.

    Deliberately *not* environment-first: this machine has ALIYUN_ACCESS_KEY_ID
    exported for an unrelated, more restricted key, and picking it up silently
    produces confusing AccessDenied failures partway through a deploy. The CLI
    profile is the credential this project has always deployed with.
    """
    config_path = Path.home() / ".aliyun" / "config.json"

    if not config_path.exists():
        env_id = os.environ.get("ALIYUN_ACCESS_KEY_ID")
        env_secret = os.environ.get("ALIYUN_ACCESS_KEY_SECRET")
        if env_id and env_secret:
            return env_id, env_secret
        raise SystemExit(
            f"No credentials: create {config_path} or set "
            "ALIYUN_ACCESS_KEY_ID / ALIYUN_ACCESS_KEY_SECRET"
        )

    config = json.loads(config_path.read_text(encoding="utf-8"))
    profiles = config.get("profiles", [])
    current = config.get("current")
    profile = next(
        (p for p in profiles if p.get("name") == current),
        next((p for p in profiles if p.get("name") == "default"), None),
    )
    if not profile or not profile.get("access_key_id"):
        raise SystemExit(f"No usable profile in {config_path}")

    return profile["access_key_id"], profile["access_key_secret"]


def already_uploaded(bucket, key, payload):
    """True when the bucket already holds these exact bytes.

    For a single-part PUT the ETag is the MD5 of the content, so this is an
    exact check rather than a size heuristic.
    """
    try:
        meta = bucket.head_object(key)
    except oss2.exceptions.NoSuchKey:
        return False
    except oss2.exceptions.OssError:
        return False

    return meta.etag.strip('"').lower() == hashlib.md5(payload).hexdigest()


def upload_with_retry(bucket, key, path, attempts=4):
    """Upload the tarball as one in-memory PUT.

    Two constraints force this shape: the deploy key's policy rejects multipart
    (InitiateMultipartUpload returns AccessDenied), and streaming from a file
    handle via put_object_from_file dies in the TLS layer on this host. The
    remaining single PUT is still flaky here, hence the retries and the
    resume-friendly check against what is already in the bucket.
    """
    payload = Path(path).read_bytes()

    for attempt in range(1, attempts + 1):
        if already_uploaded(bucket, key, payload):
            print("  bucket already holds this exact build; skipping upload")
            return
        try:
            bucket.put_object(key, payload)
            return
        except oss2.exceptions.RequestError as error:
            if attempt == attempts:
                raise
            wait = 2 ** attempt
            print(f"  upload attempt {attempt} failed ({error.details}); retrying in {wait}s")
            time.sleep(wait)


def remote_script(release, tarball, url):
    checks = "\n".join(
        f"curl -sk -o /dev/null -w '{path} %{{http_code}}\\n' {SITE_URL}{path}"
        for path in SMOKE_PATHS
    )
    return f"""#!/bin/bash
set -e
D={SITE_ROOT}/releases/{release}
STAGE=/tmp/bx-{release}
T=/tmp/{tarball}

mkdir -p "$D" "$STAGE"
find "$D" -mindepth 1 -delete 2>/dev/null || true
find "$STAGE" -mindepth 1 -delete 2>/dev/null || true

curl -fsSL -o "$T" '{url}'
tar -xzf "$T" -C "$STAGE"/
cp -a "$STAGE"/. "$D"/

find "$STAGE" -mindepth 1 -delete 2>/dev/null || true
rmdir "$STAGE" 2>/dev/null || true
rm -f "$T"

ln -sfn "$D" {SITE_ROOT}/current
nginx -t && nginx -s reload
sleep 1
{checks}
echo DEPLOY_OK
"""


def wait_for_invocation(client, invoke_id, timeout=180):
    printed = ""
    deadline = time.time() + timeout

    while time.time() < deadline:
        time.sleep(5)
        request = RpcRequest("Ecs", "2014-05-26", "DescribeInvocationResults")
        request.set_accept_format("json")
        request.add_query_param("InvokeId", invoke_id)
        request.add_query_param("InstanceId", INSTANCE)
        request.add_query_param("MaxResults", "1")

        payload = json.loads(client.do_action_with_exception(request))
        results = (
            payload.get("Invocation", {})
            .get("InvocationResults", {})
            .get("InvocationResult", [])
        )
        if not results:
            continue

        result = results[0]
        output = base64.b64decode(result.get("Output", "") or "").decode("utf-8", "replace")
        if output != printed:
            print(output[len(printed):], end="", flush=True)
            printed = output

        status = result.get("InvocationStatus", "")
        if status in ("Finished", "Failed", "Stopped", "PartialFailed"):
            exit_code = result.get("ExitCode")
            print(f"\nStatus {status} ExitCode {exit_code}")
            ok = status == "Finished" and exit_code == 0 and "DEPLOY_OK" in printed
            return 0 if ok else 1

        # The remote script prints DEPLOY_OK as its last line. Cloud Assistant
        # can lag before flipping the invocation to Finished, so trust the
        # sentinel rather than reporting a false timeout on a good deploy.
        if "DEPLOY_OK" in printed:
            print(f"\nRemote script finished (status still {status or 'Running'}).")
            return 0

    print("\nTimed out waiting for the remote command.")
    return 1


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}

    release = args[0] if args else os.environ.get("BLOG_RELEASE")
    if not release:
        raise SystemExit("Usage: python scripts/deploy.py <release-tag> [--skip-upload]")

    tarball = f"blog-dist-{release}.tar.gz"
    if not Path(tarball).exists():
        raise SystemExit(f"Missing {tarball} — run `npm run build` and pack dist/ first.")

    access_id, access_secret = load_credentials()
    key = f"blog-deploy/{tarball}"

    bucket = oss2.Bucket(oss2.Auth(access_id, access_secret), OSS_ENDPOINT, OSS_BUCKET)

    if "--skip-upload" in flags:
        # Only safe because we re-verify the bytes already in the bucket.
        payload = Path(tarball).read_bytes()
        if not already_uploaded(bucket, key, payload):
            raise SystemExit(
                f"--skip-upload given but {key} does not match the local build; "
                "re-run without the flag."
            )
        print(f"{tarball} already in the bucket and matches locally; skipping upload")
    else:
        print(f"uploading {tarball} …")
        upload_with_retry(bucket, key, tarball)
    # Short-lived: the host only needs it for the length of this deploy.
    url = bucket.sign_url("GET", key, 900)

    client = AcsClient(access_id, access_secret, REGION)
    request = RpcRequest("Ecs", "2014-05-26", "RunCommand")
    request.set_accept_format("json")
    request.add_query_param("Type", "RunShellScript")
    request.add_query_param("ContentEncoding", "Base64")
    request.add_query_param(
        "CommandContent",
        base64.b64encode(remote_script(release, tarball, url).encode()).decode(),
    )
    request.add_query_param("InstanceId.1", INSTANCE)
    request.add_query_param("Timeout", "180")

    invoke_id = json.loads(client.do_action_with_exception(request))["InvokeId"]
    print("InvokeId", invoke_id)
    raise SystemExit(wait_for_invocation(client, invoke_id))


if __name__ == "__main__":
    main()
