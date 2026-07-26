import { describe, expect, it } from "vitest";
import { buildPostTimeline, listPublicPosts, selectRecentPosts } from "./queries";
import { makePost } from "./test-utils";

describe("content queries", () => {
  it("filters drafts and unpublished statuses, then sorts public posts newest first", () => {
    const posts = [
      makePost({ slug: "old", publishedAt: new Date("2025-01-01T00:00:00Z") }),
      makePost({ slug: "draft", draft: true, publishedAt: new Date("2025-03-01T00:00:00Z") }),
      makePost({ slug: "outline", status: "outline", publishedAt: new Date("2025-04-01T00:00:00Z") }),
      makePost({ slug: "new", publishedAt: new Date("2025-02-01T00:00:00Z") }),
    ];

    expect(listPublicPosts(posts).map((post) => post.slug)).toEqual(["new", "old"]);
    expect(selectRecentPosts(posts, 1).map((post) => post.slug)).toEqual(["new"]);
  });

  it("groups public posts into a descending year-month timeline", () => {
    const posts = [
      makePost({ slug: "jan", publishedAt: new Date("2025-01-02T00:00:00Z") }),
      makePost({ slug: "feb", publishedAt: new Date("2025-02-02T00:00:00Z") }),
      makePost({ slug: "feb-two", publishedAt: new Date("2025-02-03T00:00:00Z") }),
      makePost({ slug: "hidden", draft: true, publishedAt: new Date("2025-03-02T00:00:00Z") }),
    ];

    const timeline = buildPostTimeline(posts);

    expect(timeline.map((month) => month.label)).toEqual(["2025-02", "2025-01"]);
    expect(timeline[0]?.posts.map((post) => post.slug)).toEqual(["feb-two", "feb"]);
  });
});
