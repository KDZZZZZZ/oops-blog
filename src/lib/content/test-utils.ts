import type { ContentStatus, Post } from "./types";

export function makePost(overrides: Partial<Post> = {}): Post {
  const slug = overrides.slug ?? "example";
  const publishedAt = overrides.publishedAt ?? new Date("2026-01-01T00:00:00Z");

  return {
    kind: "post",
    id: `${slug}.md`,
    slug,
    title: `Title ${slug}`,
    description: `Description ${slug}`,
    publishedAt,
    updatedAt: overrides.updatedAt,
    category: overrides.category ?? "Default",
    tags: overrides.tags ?? [],
    status: (overrides.status ?? "published") as ContentStatus,
    draft: overrides.draft ?? false,
    url: `/posts/${slug}/`,
    ...overrides,
  };
}
