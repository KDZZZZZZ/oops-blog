export interface Point {
  x: number;
  y: number;
}

/**
 * Fritsch–Carlson monotone cubic tangents.
 *
 * A plain Catmull-Rom curve overshoots badly on the shapes this archive
 * produces — five empty months followed by a spike would swing the curve below
 * the zero baseline. Monotone interpolation cannot overshoot between samples,
 * so the ink never claims months that published nothing.
 */
function monotoneTangents(points: readonly Point[]): number[] {
  const count = points.length;
  if (count < 2) return new Array(count).fill(0);

  const slopes: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const dx = points[index + 1].x - points[index].x;
    slopes.push(dx === 0 ? 0 : (points[index + 1].y - points[index].y) / dx);
  }

  const tangents: number[] = new Array(count).fill(0);
  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];

  for (let index = 1; index < count - 1; index += 1) {
    const left = slopes[index - 1];
    const right = slopes[index];
    tangents[index] = left * right <= 0 ? 0 : (left + right) / 2;
  }

  for (let index = 0; index < count - 1; index += 1) {
    if (slopes[index] === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }

    const alpha = tangents[index] / slopes[index];
    const beta = tangents[index + 1] / slopes[index];
    const magnitude = Math.hypot(alpha, beta);
    if (magnitude > 3) {
      const scale = 3 / magnitude;
      tangents[index] = scale * alpha * slopes[index];
      tangents[index + 1] = scale * beta * slopes[index];
    }
  }

  return tangents;
}

const round = (value: number) => Math.round(value * 100) / 100;

/** SVG path data for a smooth line through every point, in order. */
export function monotoneLinePath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${round(points[0].x)} ${round(points[0].y)}`;

  const tangents = monotoneTangents(points);
  let path = `M ${round(points[0].x)} ${round(points[0].y)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const third = (end.x - start.x) / 3;

    path += ` C ${round(start.x + third)} ${round(start.y + third * tangents[index])}`;
    path += ` ${round(end.x - third)} ${round(end.y - third * tangents[index + 1])}`;
    path += ` ${round(end.x)} ${round(end.y)}`;
  }

  return path;
}

/** The same curve closed down to `baseline`, ready to be filled. */
export function monotoneAreaPath(points: readonly Point[], baseline: number): string {
  const line = monotoneLinePath(points);
  if (!line) return "";

  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${round(last.x)} ${round(baseline)} L ${round(first.x)} ${round(baseline)} Z`;
}

/** Sample the curve so tests can assert it stays inside the data's range. */
export function sampleMonotoneCurve(points: readonly Point[], stepsPerSegment = 12): Point[] {
  if (points.length < 2) return [...points];

  const tangents = monotoneTangents(points);
  const samples: Point[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;

    for (let step = 0; step <= stepsPerSegment; step += 1) {
      const t = step / stepsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;

      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      samples.push({
        x: start.x + dx * t,
        y: h00 * start.y + h10 * dx * tangents[index] + h01 * end.y + h11 * dx * tangents[index + 1],
      });
    }
  }

  return samples;
}
