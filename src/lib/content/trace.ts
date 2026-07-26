import { isPublicPost, sortPostsByPublishedAsc } from "./queries";
import type { MoonPhase, Post, WritingTraceNode } from "./types";

const TRACE_EDGE_INSET = 2;
const TRACE_MIN_GAP = 2.75;
const MOON_PHASES: readonly MoonPhase[] = [
  "new",
  "first-quarter",
  "full",
  "last-quarter",
];

export function buildWritingTrace(posts: readonly Post[]): WritingTraceNode[] {
  const publicPosts = sortPostsByPublishedAsc(posts.filter(isPublicPost));

  if (publicPosts.length === 0) {
    return [];
  }

  const weeks = new Map<string, { date: Date; posts: Post[] }>();
  publicPosts.forEach((post) => {
    const weekStart = getWeekStart(post.publishedAt);
    const key = formatDayKey(weekStart);
    const bucket = weeks.get(key);
    if (bucket) bucket.posts.push(post);
    else weeks.set(key, { date: weekStart, posts: [post] });
  });

  const weeklyBuckets = Array.from(weeks.entries())
    .map(([key, bucket]) => ({ key, ...bucket }))
    .sort((left, right) => left.date.getTime() - right.date.getTime());
  const firstTime = weeklyBuckets[0]?.date.getTime() ?? 0;
  const lastTime = weeklyBuckets.at(-1)?.date.getTime() ?? 0;
  const span = lastTime - firstTime;

  const positions = weeklyBuckets.map((week) => {
    const rawPosition = span === 0 ? 50 : ((week.date.getTime() - firstTime) / span) * 100;
    return roundPosition(rawPosition);
  });
  const displayPositions = spreadTracePositions(positions);

  return weeklyBuckets.map((week, index) => {
    return {
      key: week.key,
      date: week.date,
      label: formatTraceLabel(week.date),
      count: week.posts.length,
      titles: week.posts.map((post) => post.title),
      position: positions[index] ?? 50,
      displayPosition: displayPositions[index] ?? 50,
      phase: getMoonPhase(week.date),
    };
  });
}

function getWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay();
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
  return start;
}

function roundPosition(position: number): number {
  return Math.round(position * 100) / 100;
}

function spreadTracePositions(positions: readonly number[]): number[] {
  if (positions.length === 0) return [];
  if (positions.length === 1) return [50];

  const usableSpan = 100 - TRACE_EDGE_INSET * 2;
  const gap = Math.min(TRACE_MIN_GAP, usableSpan / (positions.length - 1));
  const displayed = positions.map((position) =>
    TRACE_EDGE_INSET + (position / 100) * usableSpan
  );

  for (let index = 1; index < displayed.length; index += 1) {
    displayed[index] = Math.max(displayed[index] ?? 0, (displayed[index - 1] ?? 0) + gap);
  }

  const lastIndex = displayed.length - 1;
  if ((displayed[lastIndex] ?? 0) > 100 - TRACE_EDGE_INSET) {
    displayed[lastIndex] = 100 - TRACE_EDGE_INSET;
    for (let index = lastIndex - 1; index >= 0; index -= 1) {
      displayed[index] = Math.min(displayed[index] ?? 0, (displayed[index + 1] ?? 0) - gap);
    }
  }

  return displayed.map(roundPosition);
}

function getMoonPhase(weekStart: Date): MoonPhase {
  const weekOrdinal = Math.floor((weekStart.getDate() - 1) / 7);
  return MOON_PHASES[weekOrdinal % MOON_PHASES.length] ?? "new";
}

function formatDayKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTraceLabel(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日当周`;
}
