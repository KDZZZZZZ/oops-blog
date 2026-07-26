import type { ContentStatus, Essay, Post, Project, SearchFallbackEntry } from "./types";
import { listPublicEssays, listPublicPosts, listPublicProjects } from "./queries";

export const statusLabels: Record<ContentStatus, string> = {
  published: "已发布全文",
  draft: "写作中",
  outline: "提纲",
};

export const contentKindLabels = {
  post: "文章",
  essay: "随笔",
  project: "项目",
} as const;

export function getStatusLabel(status: ContentStatus): string {
  return statusLabels[status];
}

export function presentSearchFallbackEntries(input: {
  posts?: readonly Post[];
  essays?: readonly Essay[];
  projects?: readonly Project[];
}): SearchFallbackEntry[] {
  const posts = listPublicPosts(input.posts ?? []).map((post) => ({
    type: "post" as const,
    title: post.title,
    description: post.description,
    category: post.category,
    url: post.url,
  }));

  const essays = listPublicEssays(input.essays ?? []).map((essay) => ({
    type: "essay" as const,
    title: essay.title,
    description: essay.sourceNote,
    category: essay.topic,
    url: essay.url,
  }));

  const projects = listPublicProjects(input.projects ?? []).map((project) => ({
    type: "project" as const,
    title: project.title,
    description: project.summary,
    category: project.role,
    url: project.url,
  }));

  return [...posts, ...essays, ...projects];
}
