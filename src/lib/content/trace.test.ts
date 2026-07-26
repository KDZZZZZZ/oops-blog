import { describe, expect, it } from "vitest";
import { buildWritingTrace } from "./trace";
import { makePost } from "./test-utils";

describe("writing trace", () => {
  it("groups public posts into calendar weeks on a one-dimensional timeline", () => {
    const posts = [
      makePost({ slug: "middle-a", publishedAt: new Date("2026-04-01T00:00:00Z") }),
      makePost({ slug: "middle-b", publishedAt: new Date("2026-04-05T00:00:00Z") }),
      makePost({ slug: "hidden", draft: true, publishedAt: new Date("2026-05-01T00:00:00Z") }),
      makePost({ slug: "first", publishedAt: new Date("2026-01-01T00:00:00Z") }),
      makePost({ slug: "last", publishedAt: new Date("2026-07-01T00:00:00Z") }),
    ];

    const trace = buildWritingTrace(posts);

    expect(trace).toHaveLength(3);
    expect(trace.map((node) => node.count)).toEqual([1, 2, 1]);
    expect(trace[1]?.titles).toEqual(["Title middle-a", "Title middle-b"]);
    expect(trace[0]?.position).toBe(0);
    expect(trace[1]?.position).toBeGreaterThan(0);
    expect(trace[1]?.position).toBeLessThan(100);
    expect(trace[2]?.position).toBe(100);
    expect(trace[0]?.displayPosition).toBeGreaterThanOrEqual(2);
    expect((trace[1]?.displayPosition ?? 0) - (trace[0]?.displayPosition ?? 0)).toBeGreaterThanOrEqual(2.75);
    expect(trace[2]?.displayPosition).toBeLessThanOrEqual(98);
  });

  it("separates Sunday and Monday into adjacent Monday-based weeks", () => {
    const trace = buildWritingTrace([
      makePost({ slug: "sunday", publishedAt: new Date("2026-01-04T00:00:00Z") }),
      makePost({ slug: "monday", publishedAt: new Date("2026-01-05T00:00:00Z") }),
    ]);

    expect(trace).toHaveLength(2);
    expect(trace.map((node) => node.count)).toEqual([1, 1]);
    expect(trace.map((node) => node.position)).toEqual([0, 100]);
  });

  it("centers a single active week and keeps its titles deterministic", () => {
    const trace = buildWritingTrace([
      makePost({ slug: "beta", title: "Beta", publishedAt: new Date("2026-04-01T08:02:00Z") }),
      makePost({ slug: "alpha", title: "Alpha", publishedAt: new Date("2026-04-01T08:00:00Z") }),
    ]);

    expect(trace).toHaveLength(1);
    expect(trace[0]?.position).toBe(50);
    expect(trace[0]?.count).toBe(2);
    expect(trace[0]?.titles).toEqual(["Alpha", "Beta"]);
  });

  it("cycles through four lunar phases by the week ordinal within a month", () => {
    const trace = buildWritingTrace([
      makePost({ slug: "week-1", publishedAt: new Date("2026-06-01T08:00:00Z") }),
      makePost({ slug: "week-2", publishedAt: new Date("2026-06-08T08:00:00Z") }),
      makePost({ slug: "week-3", publishedAt: new Date("2026-06-15T08:00:00Z") }),
      makePost({ slug: "week-4", publishedAt: new Date("2026-06-22T08:00:00Z") }),
      makePost({ slug: "week-5", publishedAt: new Date("2026-06-29T08:00:00Z") }),
    ]);

    expect(trace.map((node) => node.phase)).toEqual([
      "new",
      "first-quarter",
      "full",
      "last-quarter",
      "new",
    ]);
  });
});
