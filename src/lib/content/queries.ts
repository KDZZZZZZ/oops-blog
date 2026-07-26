import type { Essay, Post, Project, TimelineMonth } from "./types";

export function isPublicPost(post: Post): boolean {
  return post.status === "published" && !post.draft;
}

export function isPublicEssay(essay: Essay): boolean {
  return !essay.draft;
}

export function isPublicProject(project: Project): boolean {
  return !project.draft;
}

export function getPostDisplayDate(post: Post): Date {
  return post.publishedAt;
}

export function getPostUpdatedDate(post: Post): Date {
  return post.updatedAt ?? post.publishedAt;
}

export function sortPostsByPublishedDesc(posts: readonly Post[]): Post[] {
  return [...posts].sort((left, right) => {
    const publishedDiff = right.publishedAt.getTime() - left.publishedAt.getTime();

    if (publishedDiff !== 0) {
      return publishedDiff;
    }

    const updatedDiff = getPostUpdatedDate(right).getTime() - getPostUpdatedDate(left).getTime();

    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return left.slug.localeCompare(right.slug);
  });
}

export function sortPostsByPublishedAsc(posts: readonly Post[]): Post[] {
  return [...posts].sort((left, right) => {
    const publishedDiff = left.publishedAt.getTime() - right.publishedAt.getTime();

    if (publishedDiff !== 0) {
      return publishedDiff;
    }

    const updatedDiff = getPostUpdatedDate(left).getTime() - getPostUpdatedDate(right).getTime();

    if (updatedDiff !== 0) {
      return updatedDiff;
    }

    return left.slug.localeCompare(right.slug);
  });
}

export function listPublicPosts(posts: readonly Post[]): Post[] {
  return sortPostsByPublishedDesc(posts.filter(isPublicPost));
}

export function selectRecentPosts(posts: readonly Post[], limit: number): Post[] {
  return listPublicPosts(posts).slice(0, limit);
}

export function sortEssaysByOrder(essays: readonly Essay[]): Essay[] {
  return [...essays].sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug));
}

export function listPublicEssays(essays: readonly Essay[]): Essay[] {
  return sortEssaysByOrder(essays.filter(isPublicEssay));
}

export function selectRecentEssays(essays: readonly Essay[], limit: number): Essay[] {
  return listPublicEssays(essays).slice(0, limit);
}

export function sortProjectsByOrder(projects: readonly Project[]): Project[] {
  return [...projects].sort((left, right) => left.order - right.order || left.slug.localeCompare(right.slug));
}

export function listPublicProjects(projects: readonly Project[]): Project[] {
  return sortProjectsByOrder(projects.filter(isPublicProject));
}

export function buildPostTimeline(posts: readonly Post[]): TimelineMonth[] {
  const months = new Map<string, TimelineMonth>();

  for (const post of listPublicPosts(posts)) {
    const year = post.publishedAt.getFullYear();
    const month = post.publishedAt.getMonth() + 1;
    const key = `${year}-${month}`;
    const existing = months.get(key);

    if (existing) {
      existing.posts.push(post);
      continue;
    }

    months.set(key, {
      year,
      month,
      label: formatMonthLabel(year, month),
      posts: [post],
    });
  }

  return [...months.values()].sort((left, right) => {
    if (left.year !== right.year) {
      return right.year - left.year;
    }

    return right.month - left.month;
  });
}

export function formatMonthLabel(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
