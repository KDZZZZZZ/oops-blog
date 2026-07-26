import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "@/lib/site-config";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts");
  const publicPosts = posts
    .filter((post) => post.data.status === "published" && !post.data.draft)
    .sort(
      (left, right) =>
        new Date(right.data.publishedAt).getTime() -
        new Date(left.data.publishedAt).getTime(),
    );

  return rss({
    title: siteConfig.title,
    description: siteConfig.description,
    site: context.site ?? siteConfig.url,
    trailingSlash: true,
    items: publicPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.publishedAt),
      link: `/posts/${post.data.slug}/`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
