import { getPostUpdatedDate, isPublicPost, formatMonthLabel } from "./queries";
import type { CategoryStat, Post, UpdateSeriesPoint } from "./types";

export function countPostsByCategory(posts: readonly Post[]): CategoryStat[] {
  const counts = new Map<string, number>();

  for (const post of posts) {
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((left, right) => right.count - left.count || left.category.localeCompare(right.category));
}

export function buildRecentSixMonthUpdateSeries(
  posts: readonly Post[],
  referenceDate = new Date(),
): UpdateSeriesPoint[] {
  const months = buildMonthWindow(referenceDate, 6);
  const points = months.map(({ year, month }) => ({
    year,
    month,
    label: formatMonthLabel(year, month),
    count: 0,
    updatedPosts: [] as Post[],
  }));
  const pointByLabel = new Map(points.map((point) => [point.label, point]));

  for (const post of posts.filter(isPublicPost)) {
    const updatedAt = getPostUpdatedDate(post);
    const label = formatMonthLabel(updatedAt.getFullYear(), updatedAt.getMonth() + 1);
    const point = pointByLabel.get(label);

    if (!point) {
      continue;
    }

    point.count += 1;
    point.updatedPosts.push(post);
  }

  for (const point of points) {
    point.updatedPosts.sort((left, right) => getPostUpdatedDate(right).getTime() - getPostUpdatedDate(left).getTime());
  }

  return points;
}

function buildMonthWindow(referenceDate: Date, size: number): Array<{ year: number; month: number }> {
  const months: Array<{ year: number; month: number }> = [];
  const referenceYear = referenceDate.getFullYear();
  const referenceMonthIndex = referenceDate.getMonth();

  for (let offset = size - 1; offset >= 0; offset -= 1) {
    const date = new Date(referenceYear, referenceMonthIndex - offset, 1);
    months.push({ year: date.getFullYear(), month: date.getMonth() + 1 });
  }

  return months;
}
