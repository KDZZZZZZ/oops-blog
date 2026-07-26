import { getCollection, type CollectionEntry } from "astro:content";
import type { ContentRepository, Essay, Post, Project } from "./types";

export class LocalContentRepository implements ContentRepository {
  async listPosts(): Promise<Post[]> {
    const entries = await getCollection("posts");
    return entries.map(mapPost);
  }

  async getPost(slug: string): Promise<Post | undefined> {
    const posts = await this.listPosts();
    return posts.find((post) => post.slug === slug);
  }

  async listEssays(): Promise<Essay[]> {
    const entries = await getCollection("essays");
    return entries.map(mapEssay);
  }

  async listProjects(): Promise<Project[]> {
    const entries = await getCollection("projects");
    return entries.map(mapProject);
  }
}

export const localContentRepository = new LocalContentRepository();

function mapPost(entry: CollectionEntry<"posts">): Post {
  return {
    kind: "post",
    id: entry.id,
    slug: entry.data.slug,
    title: entry.data.title,
    description: entry.data.description,
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    category: entry.data.category,
    tags: entry.data.tags,
    status: entry.data.status,
    draft: entry.data.draft,
    url: `/posts/${entry.data.slug}/`,
  };
}

function mapEssay(entry: CollectionEntry<"essays">): Essay {
  return {
    kind: "essay",
    id: entry.id,
    slug: entry.data.slug,
    title: entry.data.title,
    topic: entry.data.topic,
    sourceNote: entry.data.sourceNote,
    body: entry.body?.trim() ?? "",
    order: entry.data.order,
    publishedAt: entry.data.publishedAt,
    draft: entry.data.draft,
    url: `/essays/#${entry.data.slug}`,
  };
}

function mapProject(entry: CollectionEntry<"projects">): Project {
  return {
    kind: "project",
    id: entry.id,
    slug: entry.data.slug,
    title: entry.data.title,
    summary: entry.data.summary,
    role: entry.data.role,
    stack: entry.data.stack,
    period: entry.data.period,
    status: entry.data.status,
    order: entry.data.order,
    draft: entry.data.draft,
    url: `/projects/#${entry.data.slug}`,
  };
}
