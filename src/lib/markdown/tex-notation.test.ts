import { describe, expect, it } from "vitest";
// Plain ESM so astro.config.mjs can share it.
import { normalizeTexNotation as normalize } from "./tex-notation.mjs";

describe("normalizeTexNotation", () => {
  it("turns ```math fences into display math", () => {
    const source = ["```math", "a^2 + b^2", "```"].join("\n");
    expect(normalize(source)).toBe(["$$", "a^2 + b^2", "$$"].join("\n"));
  });

  it("keeps the original indentation of a math fence", () => {
    const source = ["  ```math", "  x = 1", "  ```"].join("\n");
    expect(normalize(source)).toBe(["  $$", "  x = 1", "  $$"].join("\n"));
  });

  it("leaves other code fences untouched", () => {
    const source = ["```cpp", "int a[2];", "auto f = \\(x\\);", "```"].join("\n");
    expect(normalize(source)).toBe(source);
  });

  it("converts standalone display delimiters", () => {
    const source = ["  \\[", "  E = mc^2", "  \\]"].join("\n");
    expect(normalize(source)).toBe(["  $$", "  E = mc^2", "  $$"].join("\n"));
  });

  it("converts balanced inline delimiters", () => {
    expect(normalize("表达式 \\( e \\) 可外提")).toBe("表达式 $ e $ 可外提");
  });

  it("ignores unbalanced inline delimiters", () => {
    expect(normalize("a \\( b")).toBe("a \\( b");
  });

  it("does not touch inline code spans", () => {
    expect(normalize("见 `\\(raw\\)` 写法")).toBe("见 `\\(raw\\)` 写法");
  });

  it("leaves dollar math alone", () => {
    const source = ["$$", "\\frac{1}{2}", "$$", "", "inline $x$ here"].join("\n");
    expect(normalize(source)).toBe(source);
  });
});
