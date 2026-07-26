export type ContentStatus = "published" | "draft" | "outline";

export type ContentKind = "post" | "essay" | "project";

export interface Post {
  kind: "post";
  id: string;
  slug: string;
  title: string;
  description: string;
  publishedAt: Date;
  updatedAt?: Date;
  category: string;
  tags: string[];
  status: ContentStatus;
  draft: boolean;
  url: string;
}

export interface Essay {
  kind: "essay";
  id: string;
  slug: string;
  title: string;
  topic: string;
  sourceNote: string;
  body: string;
  order: number;
  publishedAt?: Date;
  draft: boolean;
  url: string;
}

export interface Project {
  kind: "project";
  id: string;
  slug: string;
  title: string;
  summary: string;
  role: string;
  stack: string[];
  period: string;
  status: string;
  order: number;
  draft: boolean;
  url: string;
}

export interface ContentRepository {
  listPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | undefined>;
  listEssays(): Promise<Essay[]>;
  listProjects(): Promise<Project[]>;
}

export interface TimelineMonth {
  year: number;
  month: number;
  label: string;
  posts: Post[];
}

export interface CategoryStat {
  category: string;
  count: number;
}

export interface UpdateSeriesPoint {
  year: number;
  month: number;
  label: string;
  count: number;
  updatedPosts: Post[];
}

export type MoonPhase = "new" | "first-quarter" | "full" | "last-quarter";

export interface WritingTraceNode {
  key: string;
  date: Date;
  label: string;
  count: number;
  titles: string[];
  position: number;
  displayPosition: number;
  phase: MoonPhase;
}

export interface SearchFallbackEntry {
  type: ContentKind;
  title: string;
  description: string;
  category: string;
  url: string;
}
