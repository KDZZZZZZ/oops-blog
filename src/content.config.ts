import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const stableSlug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug 必须使用小写字母、数字和连字符");

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    slug: stableSlug,
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    category: z.string().min(1),
    tags: z.array(z.string().min(1)).default([]),
    status: z.enum(["published", "draft", "outline"]),
    draft: z.boolean().default(false),
  }),
});

const essays = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/essays" }),
  schema: z.object({
    title: z.string().min(1),
    slug: stableSlug,
    topic: z.string().min(1),
    sourceNote: z.string().min(1),
    order: z.number().int().positive(),
    publishedAt: z.coerce.date().optional(),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string().min(1),
    slug: stableSlug,
    summary: z.string().min(1),
    role: z.string().min(1),
    stack: z.array(z.string().min(1)).min(1),
    period: z.string().min(1),
    status: z.string().min(1),
    order: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts, essays, projects };
