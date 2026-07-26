import { describe, expect, it } from "vitest";
import { monotoneAreaPath, monotoneLinePath, sampleMonotoneCurve, type Point } from "./spline";

const series = (values: number[]): Point[] =>
  values.map((value, index) => ({ x: index * 50, y: 100 - value * 10 }));

describe("monotoneLinePath", () => {
  it("returns an empty string without points", () => {
    expect(monotoneLinePath([])).toBe("");
  });

  it("emits a bare move for a single point", () => {
    expect(monotoneLinePath([{ x: 4, y: 8 }])).toBe("M 4 8");
  });

  it("starts at the first point and ends at the last", () => {
    const path = monotoneLinePath(series([0, 2, 1, 6]));
    expect(path.startsWith("M 0 100")).toBe(true);
    expect(path.endsWith("150 40")).toBe(true);
  });
});

describe("sampleMonotoneCurve", () => {
  it("never overshoots a flat run followed by a spike", () => {
    // The real archive shape: five silent months, then everything at once.
    const points = series([0, 0, 0, 0, 0, 6]);
    const ys = sampleMonotoneCurve(points).map((point) => point.y);

    // y grows downward, so the baseline (value 0) is the maximum y.
    expect(Math.max(...ys)).toBeLessThanOrEqual(100.001);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(40 - 0.001);
  });

  it("stays within the data range for an arbitrary series", () => {
    const values = [3, 1, 4, 1, 5, 2];
    const points = series(values);
    const ys = sampleMonotoneCurve(points).map((point) => point.y);

    const top = 100 - Math.max(...values) * 10;
    const bottom = 100 - Math.min(...values) * 10;
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(top - 0.001);
    expect(Math.max(...ys)).toBeLessThanOrEqual(bottom + 0.001);
  });

  it("passes through every sample point", () => {
    const points = series([0, 0, 0, 0, 0, 6]);
    const samples = sampleMonotoneCurve(points, 10);
    for (const point of points) {
      const hit = samples.find((sample) => Math.abs(sample.x - point.x) < 0.001);
      expect(hit?.y).toBeCloseTo(point.y, 6);
    }
  });
});

describe("monotoneAreaPath", () => {
  it("closes the curve down to the baseline", () => {
    const path = monotoneAreaPath(series([1, 2]), 100);
    expect(path.endsWith("L 50 100 L 0 100 Z")).toBe(true);
  });

  it("returns an empty string without points", () => {
    expect(monotoneAreaPath([], 100)).toBe("");
  });
});
