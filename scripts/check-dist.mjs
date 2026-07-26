import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parse } from "parse5";

const root = path.resolve("dist");
const expectedOrigin = "https://me.oopsbox.cn";
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolute) : [absolute];
    }),
  );
  return files.flat();
}

function visit(node, callback) {
  callback(node);
  for (const child of node.childNodes ?? []) visit(child, callback);
  if (node.content) visit(node.content, callback);
}

function attributes(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

function routeCandidates(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const clean = decoded.replace(/^\/+/, "");
  const target = path.join(root, clean);
  if (path.extname(clean)) return [target];
  return [target, path.join(target, "index.html"), `${target}.html`];
}

const allFiles = await walk(root);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));

for (const file of allFiles) {
  if (/\.(?:md|mdx|ts|tsx|map)$/i.test(file)) {
    errors.push(`生产产物包含源文件：${path.relative(root, file)}`);
  }
}

for (const file of htmlFiles) {
  const relative = path.relative(root, file);
  const source = await readFile(file, "utf8");
  const document = parse(source);
  const ids = new Set();
  const links = [];
  const canonicals = [];

  if (source.includes("modules/visual-effects")) {
    errors.push(`${relative} 仍引用视觉参考目录`);
  }

  for (const removedTitle of [
    "两级 IR 之间，Lowering 到底负责什么",
    "WebSocket 不是状态机",
    "为什么远离 frontier 的 token 不该被过早相信",
  ]) {
    if (source.includes(removedTitle)) errors.push(`${relative} 仍包含已移除占位文章：${removedTitle}`);
  }

  visit(document, (node) => {
    const attrs = attributes(node);
    if (attrs.id) {
      if (ids.has(attrs.id)) errors.push(`${relative} 存在重复 id：${attrs.id}`);
      ids.add(attrs.id);
    }
    if (node.nodeName === "link" && attrs.rel === "canonical") canonicals.push(attrs.href);
    if (attrs.href) links.push(attrs.href);
    if (attrs.src) links.push(attrs.src);
  });

  if (canonicals.length !== 1 || !canonicals[0]?.startsWith(expectedOrigin)) {
    errors.push(`${relative} 必须且只能有一个 ${expectedOrigin} canonical`);
  }

  for (const rawLink of links) {
    if (
      rawLink.startsWith("#") ||
      rawLink.startsWith("mailto:") ||
      rawLink.startsWith("tel:") ||
      rawLink.startsWith("javascript:") ||
      rawLink.startsWith("data:")
    ) {
      continue;
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawLink, new URL(`/${relative.replace(/\\/g, "/")}`, expectedOrigin));
    } catch {
      errors.push(`${relative} 包含无法解析的链接：${rawLink}`);
      continue;
    }
    if (targetUrl.origin !== expectedOrigin) continue;

    const candidates = routeCandidates(targetUrl.pathname);
    if (!(await Promise.any(candidates.map(async (candidate) => ((await exists(candidate)) ? true : Promise.reject()))).catch(() => false))) {
      errors.push(`${relative} 的内部链接不存在：${rawLink}`);
    }
  }
}

const requiredRoutes = [
  "index.html",
  "posts/index.html",
  "essays/index.html",
  "projects/index.html",
  "about/index.html",
  "rss.xml",
  "sitemap-index.xml",
  "pagefind/pagefind.js",
];

for (const route of requiredRoutes) {
  if (!(await exists(path.join(root, route)))) errors.push(`缺少构建产物：${route}`);
}

const articleDirectories = [
  "tvm-function-objects-and-registration",
  "tvm-relay-structure-and-optimization-pass",
  "tvm-relay-ir-optimization-methods",
];

for (const slug of articleDirectories) {
  if (!(await exists(path.join(root, "posts", slug, "index.html")))) {
    errors.push(`缺少文章路由：/posts/${slug}/`);
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`dist 检查通过：${htmlFiles.length} 个 HTML 页面，内部链接与关键产物完整。`);
}
