import type { EssayShare } from "@/lib/content/types";

export type NavKey = "home" | "posts" | "essays" | "projects" | "about" | "more";

export interface NavLink {
  label: string;
  href?: string;
  key?: NavKey | string;
  description?: string;
  disabled?: boolean;
}

export interface SocialLink {
  label: string;
  href: string;
  shortLabel?: string;
}

export interface SearchIndexItem {
  type: string;
  title: string;
  summary?: string;
  href: string;
  terms?: string;
}

export interface EntryItem {
  title: string;
  href?: string;
  summary?: string;
  meta?: string | string[];
  side?: string;
  category?: string;
  id?: string;
  status?: string;
}

export interface ProjectItem extends EntryItem {
  stack?: string[];
  stateLabel?: string;
  state?: string;
}

export interface EssayItem {
  id?: string;
  title: string;
  body: string;
  topic?: string;
  sourceNote?: string;
  href?: string;
  shares?: EssayShare[];
}

export interface TraceNode {
  label: string;
  count: number;
  titles: string[];
  position: number;
  displayPosition: number;
  phase: "new" | "first-quarter" | "full" | "last-quarter";
  current?: boolean;
  muted?: boolean;
}

export interface CategoryStat {
  label: string;
  value: number;
  max?: number;
}

export interface UpdateStat {
  label: string;
  value: number;
  max?: number;
  current?: boolean;
}

export interface TimelineItem extends EntryItem {
  dateLabel: string;
  datetime?: string;
  muted?: boolean;
}

export interface CategoryGroup {
  index?: string;
  label: string;
  count: number;
  entries: EntryItem[];
}

export interface ManuscriptOverview {
  categoryStats?: CategoryStat[];
  updateStats?: UpdateStat[];
  categoryCaption?: string;
  updateCaption?: string;
  categoryNote?: string;
  chartNote?: string;
}
