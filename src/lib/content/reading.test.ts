import { describe, expect, it } from "vitest";
import { estimateReadingStats, formatCharacterCount, stripMarkdown } from "./reading";

describe("stripMarkdown", () => {
  it("drops fenced code, inline code and link targets", () => {
    const source = [
      "# 标题",
      "",
      "看 [文档](https://example.com/very/long/url) 与 `inline_code`。",
      "",
      "```ts",
      "const dropped = 1;",
      "```",
    ].join("\n");

    const text = stripMarkdown(source);

    expect(text).toContain("文档");
    expect(text).not.toContain("example.com");
    expect(text).not.toContain("inline_code");
    expect(text).not.toContain("dropped");
  });
});

describe("estimateReadingStats", () => {
  it("counts CJK per character and latin per word", () => {
    const { characters } = estimateReadingStats("你好世界 hello brave new world");
    expect(characters).toBe(8);
  });

  it("never reports less than one minute", () => {
    expect(estimateReadingStats("短").minutes).toBe(1);
  });

  it("scales with length", () => {
    const long = "字".repeat(2400);
    expect(estimateReadingStats(long).minutes).toBe(5);
  });
});

describe("formatCharacterCount", () => {
  it("switches to thousands above 1000", () => {
    expect(formatCharacterCount(940)).toBe("940 字");
    expect(formatCharacterCount(2450)).toBe("2.5 千字");
  });
});
