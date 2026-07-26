# Oops 开源博客

[me.oopsbox.cn](https://me.oopsbox.cn) 的前端源码。基于 Astro 的静态博客，内容用 Markdown 管理，构建期生成时间线、分类统计与写作轨迹等派生数据。

## 技术栈

- **Astro 7** — 静态输出（`output: "static"`），仅在必要处加载客户端脚本
- **Content Collections** — Markdown 内容源，Zod schema 校验
- **Pagefind** — 构建期生成的全站搜索索引
- **KaTeX** — 数学公式渲染（`remark-math` + `rehype-katex`）
- **Shiki** — 代码高亮，明暗双主题
- **TypeScript** strict + ESLint + Vitest + Playwright

## 本地开发

```bash
npm install
npm run dev          # 开发服务器，默认 http://localhost:4321
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建站点并生成 Pagefind 搜索索引 |
| `npm run preview` | 预览构建产物 |
| `npm run check` | Astro 类型检查 |
| `npm run lint` | ESLint（零警告要求）|
| `npm test` | Vitest 单元测试 |
| `npm run test:e2e` | Playwright 端到端测试（含 axe 无障碍检查）|
| `npm run verify` | lint + check + test + build + 产物校验，提交前跑这个 |

## 项目结构

```
src/
├─ content/          # Markdown 内容源（posts / essays / projects）
├─ content.config.ts # Content Collections schema 定义
├─ lib/
│  ├─ content/       # 内容仓储、查询、统计、展示映射（纯函数 + 单测）
│  ├─ page-context.ts# 页面共享数据装配
│  └─ site-config.ts # 站点名称、链接等公开配置
├─ layouts/          # BaseLayout / ArticleLayout
├─ components/       # 可复用 Astro 组件
├─ pages/            # 文件路由
├─ scripts/          # 客户端渐进增强（主题、导航、搜索、动效）
├─ styles/           # tokens → foundation → typography → components → pages
└─ assets/           # 参与构建的字体、图片
```

设计约定：`src/styles/tokens.css` 是颜色、间距、字体、缓动的唯一来源，其他样式只消费 `var(--*)`，不定义裸色值。

## 写作

在 `src/content/posts/` 新建 Markdown 文件，frontmatter 需满足 `src/content.config.ts` 中的 schema：

```yaml
---
title: 文章标题
description: 一句话摘要
slug: stable-url-slug      # 小写字母、数字、连字符
publishedAt: 2026-07-26
category: 分类名
tags: [标签1, 标签2]
status: published          # published | draft | outline
---
```

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 前端架构设计与分层边界
- [`docs/PRD-UIUX.md`](docs/PRD-UIUX.md) — UI/UX 设计规范
- [`docs/brand-spec.md`](docs/brand-spec.md) — 设计 token 与许可边界

## 遗留内容

根目录的 `*.html` 与 `modules/visual-effects/` 是迁移到 Astro 之前的静态原型，已不参与构建（`tsconfig.json` 与 `eslint.config.js` 均已排除），仅作视觉回归参考保留。

## 许可

原创代码使用 [MIT License](LICENSE)。字体与参考设计系统的许可边界见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。`src/assets/avatar.png` 是个人内容资产，不随 MIT 代码许可授权再分发。
