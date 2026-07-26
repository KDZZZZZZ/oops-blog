import { describe, expect, it } from "vitest";
import { buildRecentSixMonthUpdateSeries, countPostsByCategory } from "./statistics";
import { makePost } from "./test-utils";

describe("content statistics", () => {
  it("counts categories across all post statuses", () => {
    const posts = [
      makePost({ slug: "a", category: "Compiler" }),
      makePost({ slug: "b", category: "Compiler", status: "outline" }),
      makePost({ slug: "c", category: "Runtime" }),
    ];

    expect(countPostsByCategory(posts)).toEqual([
      { category: "Compiler", count: 2 },
      { category: "Runtime", count: 1 },
    ]);
  });

  it("builds six update buckets from public posts only", () => {
    const posts = [
      makePost({ slug: "may", updatedAt: new Date("2026-05-11T00:00:00Z") }),
      makePost({ slug: "jul", updatedAt: new Date("2026-07-01T00:00:00Z") }),
      makePost({ slug: "draft", draft: true, updatedAt: new Date("2026-07-02T00:00:00Z") }),
      makePost({ slug: "old", updatedAt: new Date("2025-12-31T00:00:00Z") }),
    ];

    const series = buildRecentSixMonthUpdateSeries(posts, new Date("2026-07-23T00:00:00Z"));

    expect(series.map((point) => [point.label, point.count])).toEqual([
      ["2026-02", 0],
      ["2026-03", 0],
      ["2026-04", 0],
      ["2026-05", 1],
      ["2026-06", 0],
      ["2026-07", 1],
    ]);
    expect(series.at(-1)?.updatedPosts.map((post) => post.slug)).toEqual(["jul"]);
  });
});
