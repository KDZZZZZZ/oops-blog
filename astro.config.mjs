import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { remarkTexNotation } from "./src/lib/markdown/tex-notation.mjs";

/**
 * Article pages render the frontmatter title themselves, so a document that
 * opens with an H1 would print the same title twice.
 */
function remarkDropLeadingTitle() {
  return (tree) => {
    const first = tree.children?.[0];
    if (first && first.type === "heading" && first.depth === 1) {
      tree.children.shift();
    }
  };
}

export default defineConfig({
  site: "https://me.oopsbox.cn",
  output: "static",
  trailingSlash: "always",
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkTexNotation, remarkMath, remarkDropLeadingTitle],
    rehypePlugins: [[rehypeKatex, { strict: false }]],
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark-dimmed",
      },
      defaultColor: false,
      wrap: true,
    },
  },
});
