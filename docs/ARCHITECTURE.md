# Oops 开源博客前端架构设计

> 状态：拟采用  
> 适用范围：`E:\brief2great\blog` 生产前端  
> 视觉基线：`docs/PRD-UIUX.md`、`docs/brand-spec.md`、`modules/visual-effects/`

## 1. 目标

本架构将当前多页面 HTML 原型升级为可持续维护的真实博客前端，同时保持已经确认的视觉和交互结果。

核心目标：

- 使用独立路由承载首页、文稿、随笔、文章详情和深层页面，不退回单页长页面。
- 以 Markdown / MDX 作为第一阶段内容源，并为未来接入 Mix Space 保留适配层。
- 文稿时间线、分类统计、更新时间图表和首页写作轨迹全部由内容数据构建生成，不在页面中维护第二份数字。
- 默认输出静态 HTML；只有搜索、主题、移动导航和视图切换等必要能力加载客户端脚本。
- 以现有视觉模块为迁移与回归参考，将确认后的颜色、字体、背景、排版、响应式和动效等价实现到 `src/`，框架迁移不触发视觉重做。
- 保持开源边界清晰：原创前端使用 MIT，个人头像不随代码许可授权，第三方字体单独保留声明。

## 2. 当前状态与主要问题

当前实现由六个静态 HTML 页面与一个共享视觉模块组成：

```text
HTML 页面
  ├─ index.html
  ├─ posts.html
  ├─ essays.html
  ├─ article-lowering.html
  ├─ projects.html
  └─ about.html
        ↓
modules/visual-effects/
  ├─ assets/site.css
  ├─ assets/site.js
  ├─ assets/marble-light.svg
  ├─ assets/avatar.png
  └─ assets/fonts/
```

这套结构适合作为视觉原型，但不适合作为长期内容系统：

- 导航、搜索对话框和页脚在每个 HTML 文件中重复。
- 文章标题、分类、状态和统计值直接写在页面里，容易互相失真。
- `site.js` 同时承担主题、导航、搜索、动画和文稿页签，职责过宽。
- 页面文件名就是路由，新增文章需要手工复制页面结构。
- 视觉模块有明确结果，但尚未形成可被组件稳定消费的接口。

因此迁移重点不是“把 HTML 改成组件”，而是先建立内容与表现的边界。

## 3. 架构结论

采用 **Astro + Content Collections + 静态生成 + 最小 Islands** 的模块化单体前端。

```text
┌──────────────────────────────────────────────────────────┐
│ 内容源                                                    │
│ Markdown / MDX                    Mix Space API（未来）   │
└──────────────┬──────────────────────────────┬────────────┘
               │                              │
               └────────── Content Adapter ───┘
                              │
                     Astro Content Collections
                              │
             ┌────────────────┴────────────────┐
             │ 构建期查询与派生数据             │
             │ 时间线 / 分类 / 图表 / 写作轨迹  │
             └────────────────┬────────────────┘
                              │
                 Astro 页面、布局与组件
                              │
         ┌────────────────────┴────────────────────┐
         │ 生产视觉与交互层                         │
         │ src/styles + src/scripts                │
         └────────────────────┬────────────────────┘
                              │
               静态 HTML + 必要的客户端 Islands
                              │
             阿里云 ECS / Nginx / me.oopsbox.cn
```

这是一个模块化单体，不引入独立前端服务、数据库或微服务。博客当前没有需要这些复杂度的业务状态。

## 4. 分层设计

### 4.1 内容域

内容域只描述事实，不包含布局类名、图表高度或动画参数。

建议建立三个集合：

| 集合 | 用途 | 主要字段 |
| --- | --- | --- |
| `posts` | 长文与技术文稿 | `title`、`description`、`publishedAt`、`updatedAt`、`category`、`tags`、`status`、`draft` |
| `essays` | 短随笔 | `title`、`publishedAt`、`topic`、`sourceNote`、`draft` |
| `projects` | 项目档案 | `title`、`summary`、`role`、`stack`、`period`、`status` |

第一批 `posts` 从 `KDZZZZZZ/KDZZZZZZ.github.io` 的 `content/posts/*.md` 筛选导入（首次导入基线提交：`ddac7c379d7a4f4071bb9a8e9bb1a34353a95482`）。该仓库只作为文章内容来源：

- 导入标题、发布日期、更新时间、分类、标签和 Markdown 正文。
- 只保留具有实质正文的文章；`hello-world`、`my-first-post`、`welcome-to-my-blog` 等建站初始化内容不导入。
- 将 Hugo 的 YAML/TOML frontmatter 归一为本站 `posts` Schema。
- 不导入原站首页、About、Contact、Hugo 配置、layouts、templates、Tailwind、CSS、JavaScript 或 `public/` 生成产物。
- 导入完成后，生产构建不依赖 GitHub Pages 仓库；后续同步必须继续经过相同内容边界和 Schema 校验。

文章状态使用稳定枚举，而不是直接保存展示文案：

```ts
type ContentStatus = "published" | "draft" | "outline";
```

中文界面中的“已发布全文”“写作中”“提纲”由展示层映射。这样以后修改文案不会污染内容数据。

内容文件示例：

```md
---
title: 两级 IR 之间，Lowering 到底负责什么
description: 讨论 Lowering 在语义收敛、合法化与目标映射之间的边界。
publishedAt: 2026-07-18
updatedAt: 2026-07-18
category: 编译器
tags: [LLVM, IR, Lowering]
status: published
draft: false
---
```

Schema 在构建时校验日期、状态、slug 和必填字段。无效内容直接阻止发布，避免页面静默缺字段。

### 4.2 内容适配层

页面组件不能直接读取文件系统，也不能直接调用 Mix Space API。统一通过内容仓储接口访问：

```ts
interface ContentRepository {
  listPosts(): Promise<Post[]>;
  getPost(slug: string): Promise<Post | undefined>;
  listEssays(): Promise<Essay[]>;
  listProjects(): Promise<Project[]>;
}
```

第一阶段实现 `LocalContentRepository`，内部读取 Astro Content Collections。未来需要 Mix Space 时新增 `MixSpaceContentRepository`，页面与统计函数保持不变。

适配层必须把远端数据归一成站内模型；页面不得感知 Mix Space 的字段名、分页格式或接口错误结构。

### 4.3 构建期派生数据

以下数据在构建期从内容集合计算：

- 首页最近三篇文稿。
- 首页最近两则随笔。
- 文稿按年份、月份排序后的时间线。
- 文稿按类别分组及类别数量。
- 最近六个月的公开文章更新时间序列。
- 首页一维写作轨迹上的真实发布节点。
- 搜索索引中的标题、摘要、分类与目标 URL。

建议集中在纯函数中：

```text
src/lib/content/
  ├─ queries.ts       # 过滤、排序和选取
  ├─ statistics.ts    # 类别与更新时间统计
  ├─ trace.ts         # 一维写作轨迹映射
  └─ presenters.ts    # 状态到中文展示文案的映射
```

统计规则：

- 类别分布可以计入 `published`、`draft` 和 `outline`，但页面必须说明口径。
- 更新时间图只计入公开正文，不能用草稿填充空月份。
- 写作轨迹只渲染能从内容元数据确认的节点；没有内容的区间保持空白。
- 图表数值与无障碍文本使用同一份派生结果，避免视觉与朗读内容不一致。

### 4.4 页面与路由层

目标路由：

| 路由 | 页面职责 | 渲染方式 |
| --- | --- | --- |
| `/` | 头像首屏、近期文稿、近期随笔、一维写作轨迹 | 静态生成 |
| `/posts/` | 按时间、按类别、概览 | 静态生成 + 页签增强 |
| `/posts/[slug]/` | 独立文章阅读页 | 静态生成 |
| `/essays/` | 随笔流 | 静态生成 |
| `/projects/` | 项目档案 | 静态生成 |
| `/about/` | 关于与开源说明 | 静态生成 |

顶部导航维持“首页 / 文稿 / 随笔 / 更多”。“更多”在有明确内容前仍是不可点击文本，不创建空路由或假菜单。

页面只组合布局和组件，不在页面文件中复制导航、搜索对话框或主题脚本。

### 4.5 组件层

建议组件边界：

```text
BaseLayout
├─ SiteHeader
│  ├─ DesktopNav
│  ├─ ThemeToggle
│  ├─ SearchTrigger
│  └─ MobileNav
├─ 页面主体
│  ├─ HomeHero
│  ├─ EntryList / EntryRow
│  ├─ EssayPreview
│  ├─ WritingTrace
│  ├─ ManuscriptTabs
│  ├─ CategoryChart
│  ├─ UpdateChart
│  └─ ArticleShell
├─ SearchDialog
└─ SiteFooter
```

边界原则：

- `EntryRow` 负责统一所有文章的字号、间距和元信息位置，防止再次出现一篇大、一篇小。
- `WritingTrace` 接收节点数组，只负责“一条线 + 零星圆点”的表达，不显示已被删除的图注、月份或贡献墙说明。
- `CategoryChart` 与 `UpdateChart` 接收数值，不自行读取文章集合。
- `ArticleShell` 统一标题、元信息、目录、正文宽度与前后文章导航。
- 页面组件默认是 `.astro`，只有确实需要运行时状态的组件才成为客户端 Island。

## 5. 视觉参考如何迁移到真实前端

### 5.1 视觉参考与生产实现的边界

`modules/visual-effects/` 保存当前静态原型和已经确认的视觉结果，用于迁移对照与视觉回归，不是 Astro 生产前端的长期代码目录。它记录的参考范围包括：

- 颜色与主题 token。
- Inter、中文衬线和等宽字体角色。
- 浅色背景的低比例蓝色流体纹理。
- 最大页面宽度、阅读列宽、分隔线和留白节奏。
- 低幅入场、列表悬停与首屏退出动效。
- 360px 到 1920px 的响应式表现。

真实前端必须等价实现这些结果，但实际运行代码归属如下：

- `src/styles/`：生产样式、设计 token、页面样式和动效表现。
- `src/scripts/`：主题、导航、搜索、入场触发和滚动联动等浏览器端渐进增强。
- `src/assets/`：被生产样式或组件导入的头像、字体和背景纹理。
- `src/components/`：只提供语义结构、类名和 `data-*` 挂载点，不复制全局动画实现。

迁移验收完成后，生产构建不得继续导入 `modules/visual-effects/`。否则参考原型与生产实现会形成两个可执行来源，后续修改容易产生视觉漂移。

### 5.2 迁移方式

迁移分两步，避免一次性重写导致视觉漂移。

**第一步：原样接入**

- `BaseLayout.astro` 临时全局导入当前 `site.css`，只作为迁移过渡。
- 头像、字体和 `marble-light.svg` 在迁移期保持原资源路径。
- Astro 组件先沿用当前稳定类名。
- 以现有静态页面作为视觉回归基准。

**第二步：按职责拆分**

在页面结构稳定后，将确认过的规则迁移到生产 `src/`：

```text
src/
├─ styles/                        # 生产样式；页面组件只消费，不复制全局规则
│  ├─ global.css                 # BaseLayout 唯一全局样式入口，按顺序导入下列文件
│  ├─ tokens.css                 # 颜色、字体、间距、尺寸、缓动等设计变量
│  ├─ foundation.css             # reset、基础元素、焦点样式与无障碍基线
│  ├─ typography.css             # 标题、正文、代码块等排版角色
│  ├─ components.css             # 导航、按钮、列表、对话框等跨页面组件样式
│  ├─ pages/                     # 确实只属于某类页面的规则，不能反向定义全局 token
│  │  ├─ home.css                # 首页首屏、内容流、写作轨迹及首页专属动效样式
│  │  ├─ posts.css               # 文稿时间线、分类和概览图表样式
│  │  ├─ essays.css              # 随笔流与随笔正文样式
│  │  └─ article.css             # 独立文章标题、目录、正文和前后篇导航样式
│  └─ motion.css                 # 全站通用入场、悬停、过渡及 reduced-motion 降级
├─ scripts/                       # 浏览器端渐进增强；脚本失败时核心内容仍须可用
│  ├─ theme.ts                   # 主题初始化、切换、持久化及按钮可访问状态
│  ├─ reveal.ts                  # data-enter 与 IntersectionObserver 通用入场触发
│  └─ hero-motion.ts             # 首页滚动进度等不可由纯 CSS 完成的专属增强
└─ assets/                        # 生产组件和样式实际导入的图片、字体与背景纹理
```

该目录树是完成 Astro 构建流程后的目标结构，不代表这些文件当前已经存在。迁移期可暂时使用 `modules/visual-effects/assets/site.css` 和 `site.js`，但第二步完成后必须移除这些运行时导入。

迁移只改变文件职责和运行入口，不改变 token 值、类的视觉结果或动效参数。

### 5.3 必须保持的视觉合同

| 设计要求 | 架构适配方式 |
| --- | --- |
| 页面主要读作纯白，局部出现淡蓝流体纹理 | `BaseLayout` 在浅色主题加载固定背景资源；深色主题明确关闭背景图 |
| 首页使用 Oops 头像 | `HomeHero` 从站点配置读取头像路径和公开署名，禁止从文章内容推导身份 |
| 首屏英文问候与 `Oops 👋` | 文案进入 `site.config.ts`，组件只负责排版 |
| 字体要细 | 标题 token 使用 300，导航与文章标题使用 400；组件不得硬编码更粗权重 |
| 尽量无标语和解释性图注 | 组件 API 不提供 eyebrow/说明槽位，除非页面任务确实需要 |
| 文章行排版一致 | 所有文章入口复用 `EntryRow`，不支持 featured 尺寸变体 |
| 首页轨迹是一条线串少量圆点 | `WritingTrace` 使用统一数据模型与固定视觉语法，不退化成卡片或方格贡献墙 |
| 动效接近参考站但保持原创 | 复用低幅参数和阅读节奏，不复制品牌组件或私有实现 |
| 内容独立路由 | Astro 文件路由生成真实页面，不用首页锚点模拟路由 |

### 5.4 主题与背景

主题状态使用 `data-theme="light|dark"`，持久化键继续使用 `oops-theme`。为避免首屏闪烁，在 `<head>` 中运行极小的内联主题初始化脚本；完整主题按钮逻辑延后加载。

浅色背景规则必须保持：

- 基础色接近白色。
- 蓝色纹理只占局部区域，不能形成通栏蓝底。
- 纹理固定在视口底层，不随内容重复拼接。
- 正文内容不额外叠加不透明大卡片遮挡纹理。

### 5.5 动效与渐进增强

动效分为三类：

1. CSS 可完成：悬停位移、颜色和透明度过渡。
2. 小型原生脚本：首屏滚动退出、IntersectionObserver 入场。
3. 不需要客户端状态：文章列表、图表和时间线全部在构建期生成。

实际文件归属：通用动效样式放在 `src/styles/motion.css`，通用入场触发放在 `src/scripts/reveal.ts`；首页专属表现放在 `src/styles/pages/home.css`，对应滚动逻辑放在 `src/scripts/hero-motion.ts`。其他页面若只需要通用入场，组件添加 `data-enter` 或 `.reveal` 挂载点即可，不新建页面级脚本。

`prefers-reduced-motion: reduce` 下取消位移、交错和滚动联动。JavaScript 失败时，内容必须默认可见；`.js` 类只用于启用增强后的初始状态。

## 6. 客户端交互边界

不默认引入 React。Astro 组件输出 HTML，交互优先使用小型 TypeScript 模块。

| 能力 | 实现 | 客户端脚本 |
| --- | --- | --- |
| 主题切换 | 原生 TypeScript + `localStorage` | 需要 |
| 移动导航 | 原生 TypeScript + dialog/ARIA 状态 | 需要 |
| 文稿三视图 | 原生 TypeScript；无 JS 时三个区块按顺序展示 | 需要增强 |
| 站内搜索 | Pagefind 静态索引 + 搜索对话框 | 按需加载 |
| 首页入场与滚动 | IntersectionObserver / scroll listener | 需要增强 |
| 分类与更新图表 | 构建期 HTML + CSS | 不需要 |
| 文章目录 | 构建期生成锚点 | 不需要 |

只有当未来出现复杂编辑器、评论输入或需要共享运行时状态的功能时，才局部引入 React Island。不能为了组件化而让所有页面 hydration。

## 7. 建议目录

```text
blog/                              # 博客项目根目录
├─ astro.config.mjs                # Astro 构建、集成、站点地址和输出模式配置
├─ package.json                    # 依赖、开发命令、检查命令和发布脚本
├─ public/                         # 不经过构建转换、按原路径复制的公开静态文件
│  ├─ favicon.svg                  # 浏览器标签页与收藏夹图标
│  └─ images/                      # 可直接通过 URL 访问的公开图片
├─ modules/                        # 迁移参考与非生产辅助模块
│  └─ visual-effects/             # 迁移与视觉回归参考；迁移完成后不进入生产构建
├─ src/                            # 参与 Astro 构建的站点源代码
│  ├─ assets/                     # 生产样式和组件实际导入的图片、字体与背景纹理
│  │  ├─ avatar.png               # 首页与关于页的身份图像
│  │  ├─ marble-light.svg         # 浅色主题背景纹理
│  │  └─ fonts/                   # 本地字体文件及许可
│  ├─ content/                    # Content Collections 内容源与构建期 Schema
│  │  ├─ posts/                   # 长文与技术文章的 Markdown/MDX 文件
│  │  ├─ essays/                  # 短随笔内容文件
│  │  ├─ projects/                # 项目档案内容文件
│  │  └─ config.ts                # 内容字段、枚举和必填项的 Schema 校验
│  ├─ components/                 # 只负责展示与交互组合的可复用 Astro 组件
│  │  ├─ navigation/              # 页头、桌面导航、移动导航和主题入口
│  │  ├─ entries/                 # 文章、随笔和项目的统一条目组件
│  │  ├─ charts/                  # 消费派生数据的统计图表组件
│  │  ├─ search/                  # 搜索入口、对话框和结果视图
│  │  └─ home/                    # 首页首屏、内容流和写作轨迹组件
│  ├─ styles/                     # Astro 生产样式的唯一来源
│  │  ├─ global.css               # BaseLayout 导入的全局样式入口
│  │  ├─ tokens.css               # 颜色、字体、间距、尺寸与缓动变量
│  │  ├─ foundation.css           # reset、基础元素和无障碍基线
│  │  ├─ typography.css           # 标题、正文与代码排版
│  │  ├─ components.css           # 跨页面组件样式
│  │  ├─ motion.css               # 通用动效及 reduced-motion 降级
│  │  └─ pages/                   # 只放确实属于单类页面的视觉规则
│  │     ├─ home.css              # 首页布局与首页专属动效表现
│  │     ├─ posts.css             # 文稿归档、时间线和图表样式
│  │     ├─ essays.css            # 随笔流样式
│  │     └─ article.css           # 文章阅读页样式
│  ├─ scripts/                    # 原生 TypeScript 渐进增强模块
│  │  ├─ theme.ts                 # 主题初始化、切换与持久化
│  │  ├─ navigation.ts            # 移动导航、ARIA 状态和焦点管理
│  │  ├─ archive-views.ts         # 文稿筛选和视图页签
│  │  ├─ search.ts                # 搜索对话框及结果交互
│  │  ├─ reveal.ts                # 通用首屏与视口入场触发
│  │  └─ hero-motion.ts           # 首页滚动进度等专属动效逻辑
│  ├─ layouts/                    # 页面共享外壳，集中处理 head、导航和页脚
│  │  ├─ BaseLayout.astro         # 普通页面的基础布局与全局资源入口
│  │  └─ ArticleLayout.astro      # 文章标题、元信息、目录和正文宽度布局
│  ├─ lib/                        # 与具体页面结构无关的查询、派生和站点配置逻辑
│  │  ├─ content/                 # 内容仓储、过滤、排序、统计和展示映射
│  │  ├─ search/                  # 搜索索引生成及搜索数据适配
│  │  └─ site-config.ts           # 公开署名、链接、站点标题等全局公开配置
│  └─ pages/                      # Astro 文件路由；文件路径直接决定公开 URL
│     ├─ index.astro              # 首页 `/`
│     ├─ posts/                   # 文稿路由分组
│     │  ├─ index.astro           # 文稿归档页 `/posts/`
│     │  └─ [slug].astro          # 独立文章页 `/posts/[slug]/`
│     ├─ essays/index.astro       # 随笔页 `/essays/`
│     ├─ projects/index.astro     # 项目档案页 `/projects/`
│     └─ about/index.astro        # 关于页 `/about/`
├─ tests/                         # 不进入生产产物的自动化验证
│  ├─ unit/                       # 排序、过滤、统计等纯函数单元测试
│  ├─ integration/                # 内容到路由、页面和搜索索引的集成测试
│  └─ visual/                     # 关键页面和视口的视觉回归测试
└─ docs/                          # PRD、品牌规范、架构决策和迁移说明
```

站点级公开信息集中在 `src/lib/site-config.ts`：

```ts
export const siteConfig = {
  name: "Oops",
  greeting: "Hi, I'm Oops 👋.",
  headline: "Make sense of the world, and make the world make sense.",
  github: "https://github.com/KDZZZZZZ",
  email: "2112335382@qq.com",
};
```

这样页面不会重复硬编码身份信息，也能防止未来误用实名。

## 8. 构建与部署方案

> 状态：方案已确认，尚未执行实际部署、DNS 新增或证书签发。以下基础设施数据来自 2026-07-23 对阿里云 CLI `default` 配置的只读盘点。

### 8.1 部署目标

| 项目 | 方案 |
| --- | --- |
| 云平台 | 阿里云 ECS |
| CLI 配置 | 所有命令显式使用 `--profile default`，不依赖当前激活配置 |
| 地域 | `cn-beijing` |
| ECS 实例 | `<ECS_INSTANCE_ID>`（部署时从环境变量注入）|
| 公网地址 | `<SERVER_IP>`（部署时从环境变量注入）|
| 操作系统 | Alibaba Cloud Linux 3 |
| 资源 | 2 vCPU、2 GiB 内存、40 GiB 系统盘 |
| Web 层 | Nginx 1.24.0，由 systemd 管理 |
| TLS 工具 | Certbot 已安装；首次部署时必须验证自动续期任务 |
| 目标域名 | `https://me.oopsbox.cn/` |

该服务器已经承载 `<其他共存服务域名>`。博客必须使用独立目录、独立 Nginx 配置、独立访问日志和独立 TLS 证书，不修改现有 其他共存服务 upstream、容器、数据库或证书。安全组已经允许公网 `80/443`，博客不新增对外应用端口。

博客采用 Astro 静态输出，不在服务器运行 Node、Astro dev server、Python HTTP server 或额外容器。服务器只托管构建后的 `dist/`，不能暴露 `src/`、Markdown、测试、文档或仓库元数据。

### 8.2 域名与 DNS

`oopsbox.cn` 已完成备案，并由阿里云 DNS 托管。目标记录为：

| 字段 | 值 |
| --- | --- |
| 主机记录 | `me` |
| 记录类型 | `A` |
| 线路 | 默认 |
| 记录值 | `<SERVER_IP>` |
| TTL | 600 秒 |

盘点时 `me.oopsbox.cn` 尚无现存记录，因此无需覆盖旧值。新增记录时不得修改 `<其他共存服务>`、根域、`www` 或邮件相关记录。站点唯一 canonical 为 `https://me.oopsbox.cn/`；`astro.config.mjs` 的 `site`、sitemap、RSS、Open Graph 与文章 canonical 都从该地址生成。

DNS 与证书按以下顺序启用：

1. 先部署静态产物并建立仅 HTTP 的 Nginx 虚拟主机。
2. 使用 Host 头或 `curl --resolve` 验证站点，不依赖 DNS 提前生效。
3. 新增 `me` A 记录并确认阿里云权威 DNS 返回目标公网 IP。
4. 使用 Certbot 为 `me.oopsbox.cn` 单独签发证书，再启用 HTTP 到 HTTPS 的 301 跳转。
5. 验证证书域名、完整链、续期任务与 HTTPS 页面后，才将发布标记为完成。

### 8.3 构建产物

```text
内容提交
  ↓
Schema、slug 与链接校验
  ↓
派生时间线、分类、图表和写作轨迹
  ↓
Astro 静态构建
  ↓
Pagefind 建立搜索索引
  ↓
类型检查、测试、可访问性与视觉回归
  ↓
只打包 dist/
```

发布流水线至少执行 `npm ci`、Astro/TypeScript 检查、测试和生产构建。只有全部通过后才生成 `dist/` 发布包；构建机与服务器使用相同锁文件，发布包记录 Git commit 和 SHA-256 校验值。

### 8.4 服务器目录与 Nginx

```text
/var/www/me.oopsbox.cn/
├─ releases/
│  ├─ <UTC 时间>-<Git commit>/   # 不可变的完整 dist/ 发布版本
│  └─ ...
└─ current -> releases/<版本>/   # Nginx 永远读取的当前版本软链接
```

首次上线新建 `/etc/nginx/conf.d/me-oopsbox.conf`，不复用或覆盖现有 `<其他服务>*.conf`。HTTP 阶段的核心配置形状为：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name me.oopsbox.cn;

    root /var/www/me.oopsbox.cn/current;
    index index.html;

    access_log /var/log/nginx/me-oopsbox.access.log;
    error_log  /var/log/nginx/me-oopsbox.error.log;

    location /_astro/ {
        try_files $uri =404;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ =404;
        add_header Cache-Control "no-cache";
    }
}
```

TLS 配置和 `80 -> 443` 跳转由 Certbot 在该独立虚拟主机上管理，证书名使用 `me.oopsbox.cn`，不扩展或替换 `<其他共存服务域名>` 的现有证书。任何配置变更必须先通过 `nginx -t`；仅切换 `current` 软链接时不需要重启 Nginx。

### 8.5 发布与回滚

1. 将发布包上传到新的 `releases/<版本>/`，校验 SHA-256 后设置目录可读权限。
2. 在新目录上检查 `index.html`、`_astro/`、文章路由和本地链接。
3. 原子切换 `current` 软链接，避免原地覆盖导致半新半旧文件。
4. 分别验证首页、文章页、静态资源、404、HTTPS 和 canonical。
5. 回归检查 ``<其他共存服务域名>``，确认现有服务未受影响。
6. 保留最近 3 个成功版本；新版本稳定后再清理更早版本。

回滚只把 `current` 原子切回上一个成功版本。若问题来自 Nginx 或证书，则恢复对应配置备份并执行 `nginx -t` 后 reload；不得通过重装服务器或覆盖现有 其他共存服务 配置回滚。

云助手用于首次引导、故障恢复和无 SSH 凭据时的受控运维。长期自动发布应使用独立的非 root 部署用户和受限 SSH 密钥，密钥只存放在 CI secret 中；阿里云 AccessKey、私钥和服务器密码不得进入仓库或构建产物。

### 8.6 发布阻断条件

部署必须阻止以下情况：

- 内容 Schema 校验失败，或本地链接、文章 slug 冲突。
- TypeScript、Astro 检查、测试或生产构建失败。
- 页面出现横向溢出、关键内容不可见或主题闪烁回归。
- 可访问性 P0 问题，例如按钮无名称、对话框不可关闭或当前页状态丢失。
- 发布包包含 `src/`、Markdown、测试、密钥或其他非 `dist/` 文件。
- 新版本 Host 头预检失败、`nginx -t` 失败、DNS 未指向目标 IP 或证书校验失败。
- `<其他共存服务域名>` 回归检查失败。

## 9. 非功能要求

以下是目标门槛，不是对当前站点的测量结果。

### 性能

- 阅读页默认零框架 hydration。
- 首页和索引页的初始客户端 JavaScript 保持在必要交互范围内。
- 本地字体只加载实际使用的字重范围，保留 `font-display: swap`。
- 头像提供明确尺寸，避免布局偏移。
- 背景纹理使用单一可缓存资源，不在主线程持续绘制 Canvas。

### 可访问性

- 满足 WCAG 2.2 AA 的文本对比度和键盘操作要求。
- 主题、搜索、页签与移动导航具有明确的 ARIA 状态。
- 图表同时提供可读文本，不只依赖颜色或柱形高度。
- 360px 宽度下触控目标不小于 44px。
- 禁用“更多”保持文本语义，不能伪装成可点击按钮。

### SEO 与内容可发现性

- 每篇文章生成唯一 canonical、标题、描述和 Open Graph 元信息。
- 构建 RSS、sitemap 和结构化文章数据。
- 草稿不进入路由、RSS、sitemap 或搜索索引。
- URL 使用稳定 slug，标题修改不强制改变地址。

### 安全与隐私

- Markdown 中的原始 HTML 默认关闭或经过允许列表处理。
- 外链统一补充安全的 `rel` 属性。
- 不在客户端包中放置 API 密钥或 Mix Space 管理令牌。
- 邮箱和 QQ 属于主动公开信息；若未来引入分析，只使用无 Cookie 或明确告知的方案。

### 可维护性

- 内容数据、展示文案、视觉 token 和交互脚本分别归属不同模块。
- 不新增页面级全局 token。
- 不复制 `SiteHeader`、`SearchDialog`、`EntryRow` 和页脚结构。
- 每个图表统计函数都有确定性单元测试。

## 10. 测试策略

### 单元测试

- 内容排序与草稿过滤。
- 类别聚合。
- 最近六个月更新时间序列。
- 写作轨迹节点映射。
- 状态展示文案映射。

### 集成测试

- 每个公开内容文件生成唯一页面。
- 导航当前页状态正确。
- “更多”没有链接和点击行为。
- 无 JavaScript 时仍能浏览文章和三个文稿视图。
- 搜索结果 URL 指向真实页面。

### 端到端与视觉回归

重点视口：`360`、`390`、`430`、`768`、`1024`、`1366`、`1440`、`1920`。

重点基线：

- 首页头像和英文标题的首屏关系。
- 浅色背景主要为白色，蓝色纹理只在局部可见。
- 三篇文章使用相同字号和行结构。
- 一维轨迹保持细线和零星圆点，没有图注回归。
- 文稿三视图的统计与内容集合一致。
- 深色主题关闭浅色纹理。

## 11. 失败模式与处理

| 失败模式 | 影响 | 处理方式 |
| --- | --- | --- |
| 内容元数据缺失 | 构建不完整页面 | Schema 校验失败并阻止发布 |
| Mix Space 暂时不可用 | 无法获取远端内容 | 构建使用最近一次成功快照；本地内容模式不受影响 |
| 搜索索引加载失败 | 搜索不可用 | 页面导航和归档仍可完整浏览 |
| 客户端脚本失败 | 主题按钮或页签增强失效 | 默认内容可见，链接和阅读不依赖脚本 |
| 背景资源加载失败 | 浅色纹理消失 | 回退到纯白背景，不影响可读性 |
| 字体加载失败 | 字形变化 | 使用已定义的系统中文衬线与无衬线回退链 |
| `src/styles` 被页面私有规则覆盖 | 视觉漂移 | lint 禁止页面级 token，视觉回归检查关键页面 |
| 新发布版本异常 | 页面不可用或资源不一致 | 原子切回上一版 `current` 软链接 |
| Nginx 配置错误 | 新域名无法访问或影响现有服务 | `nginx -t` 阻止 reload，并恢复独立配置备份 |
| DNS 或证书签发失败 | HTTPS 无法启用 | 保持旧状态，不提前启用 HTTPS 跳转或宣布发布完成 |
| 共享 ECS 上的现有服务回归 | 其他共存服务 受影响 | 立即回滚博客配置或版本，并验证 `<其他共存服务域名>` |

## 12. 迁移计划

### 阶段 1：建立 Astro 骨架

- 初始化 Astro、TypeScript 和 Content Collections。
- 建立 `BaseLayout`、站点配置与真实路由。
- 临时接入 `modules/visual-effects/assets/site.css` 和现有资源，作为迁移对照而非最终目录。
- 保留旧 HTML 作为迁移期视觉对照，不立即删除。

### 阶段 2：迁移共享组件

- 抽取 `SiteHeader`、`SiteFooter`、`SearchDialog` 和 `EntryRow`。
- 迁移首页，先确保视觉一致，再迁移其他页面。
- 将确认后的样式迁入 `src/styles/`，资源迁入 `src/assets/`。
- 将主题、移动导航和入场动效从 `site.js` 拆入 `src/scripts/`。
- 视觉回归通过后移除生产代码对 `modules/visual-effects/` 的导入。

### 阶段 3：内容化

- 把现有文章、随笔和项目移入内容集合。
- 用动态路由生成文章详情。
- 从内容集合生成时间线、类别、概览图表和首页轨迹。
- 删除 HTML 中的手写统计值。

### 阶段 4：搜索与发布

- 接入 Pagefind、RSS、sitemap 和 SEO 元信息。
- 添加单元、集成、可访问性与视觉回归测试。
- 将 `dist/` 原子发布到阿里云 ECS 的 `/var/www/me.oopsbox.cn/`。
- 新增 `me.oopsbox.cn` A 记录、签发独立证书并启用 HTTPS。
- 验证所有旧地址的重定向，同时回归检查现有 `<其他共存服务域名>`。

### 阶段 5：可选的 Mix Space 接入

- 实现内容适配器，不改页面组件。
- 明确构建时拉取、缓存和失败回退策略。
- 在确认写作流程确实需要后再启用，避免过早引入运行时依赖。

## 13. 架构决策记录

### ADR-001：采用 Astro 而不是 Next.js

**状态：** 拟采用

**背景：** 当前产品是内容优先的公开博客，核心页面可以静态生成，运行时状态很少。

**决定：** 使用 Astro 生成页面，并只对必要交互加载客户端脚本。

**收益：** 默认静态 HTML、低 hydration、Markdown 集成直接、适合现有多页面结构。

**代价：** 团队需要熟悉 Astro 文件约定；未来若出现大量登录态应用功能，可能需要增加服务端能力或独立应用边界。

**其他方案：** Next.js 功能更全，但当前会引入不必要的缓存、服务端和 hydration 复杂度；继续维护手写 HTML 则缺乏内容模型与组件复用。

### ADR-002：本地内容优先，Mix Space 通过适配层接入

**状态：** 拟采用

**背景：** 博客需要先稳定开源与写作流程，但未来可能复用 Mix Space 的内容管理能力。

**决定：** 第一阶段使用 Content Collections，页面只依赖站内 `ContentRepository`。

**收益：** 开发和部署不依赖外部服务，未来更换内容源不重写页面。

**代价：** 需要维护一层数据映射；远端内容能力不会在第一阶段出现。

### ADR-003：视觉参考与生产实现分离

**状态：** 拟采用

**背景：** 当前视觉已多轮确认，真实前端必须对齐，而不是框架迁移后重新设计。

**决定：** `modules/visual-effects` 只保存迁移与视觉回归参考；`src/styles` 是生产视觉实现的唯一来源，`src/scripts` 是生产轻交互与动效触发的唯一来源。页面组件只能提供结构和挂载点，不能复制全局 token 或通用动效。迁移完成后生产构建不再导入参考模块。

**收益：** 保留可靠视觉回归基线，同时让生产代码、类型检查和 Astro 构建边界保持清晰，避免参考原型与生产实现同时生效。

**代价：** 初期组件需要适配现有类名；迁移 CSS、脚本和资源时必须逐页做等价验证。

### ADR-004：统计与图表在构建期生成

**状态：** 拟采用

**背景：** 当前统计写在 HTML 中，容易与文章事实不一致。

**决定：** 所有统计从内容集合的同一份元数据派生，客户端只负责视图切换。

**收益：** 无虚构数字、无需运行时 API、SEO 和无障碍内容完整。

**代价：** 内容更新后需要重新构建站点；对于博客这是可接受的发布模型。

### ADR-005：默认不引入 React

**状态：** 拟采用

**背景：** 当前交互都能由浏览器原生能力和小型 TypeScript 完成。

**决定：** Astro 组件负责静态结构，原生脚本负责局部增强；复杂状态出现后再按组件引入 React Island。

**收益：** 客户端代码更少，阅读页更稳定，视觉动效不受框架运行时约束。

**代价：** 交互模块需要自行维护清晰的 DOM 与状态边界。

### ADR-006：使用现有阿里云 ECS 托管静态产物

**状态：** 拟采用，尚未部署

**背景：** `default` 账号已有北京 ECS、Nginx、Certbot 与已备案域名 `oopsbox.cn`，服务器资源足够承载静态博客，同时已经运行 其他共存服务。

**决定：** Astro 只生成静态 `dist/`，通过独立目录、独立 Nginx 虚拟主机和独立证书发布到 `https://me.oopsbox.cn/`。版本使用不可变 release 目录与 `current` 软链接切换，不在服务器运行 Node 服务。

**收益：** 复用已有服务器和 TLS 运维能力，运行时简单，静态内容资源占用低，并可通过软链接快速回滚。

**代价：** 博客与 其他共存服务 共享单台 ECS，Nginx 变更具有共享故障域；因此每次发布都必须执行配置预检、独立日志验证和 其他共存服务 回归检查。

## 14. 架构验收条件

完成迁移时必须同时满足：

- 新增文章只需创建一份内容文件，不需要改首页、归档、图表或搜索代码。
- 首页、文稿、随笔、文章详情都是独立 URL。
- 视觉与当前原型保持一致，尤其是头像首屏、字体重量、浅色背景和写作轨迹。
- 所有文章入口统一使用同一组件，不存在精选文章放大变体。
- 文稿统计与内容元数据自动一致，没有手工数字。
- JavaScript 关闭后仍可阅读、导航和查看完整归档。
- 生产构建不再引用 `modules/visual-effects/`，实际样式、动效和资源均来自 `src/`。
- 生产构建、链接检查、可访问性检查和关键视口视觉回归通过。
- `https://me.oopsbox.cn/` 使用有效独立证书提供服务，HTTP 永久跳转到 HTTPS。
- 发布可通过 `current` 软链接回滚，并且 `<其他共存服务域名>` 保持正常。
- 页面和元信息公开署名统一为 `Oops`。

## 15. 结论

这套架构把“内容”和“视觉效果”分开，但不把视觉降级成可随意替换的皮肤：

- 内容集合决定站点有什么。
- 构建期查询决定内容如何组织和统计。
- Astro 页面决定真实路由与语义结构。
- `src/styles` 与 `src/scripts` 决定站点如何被看见和感知。
- 最小客户端脚本只补足浏览器原生页面无法完成的交互。

因此，后续无论内容来自 Git、MDX 还是 Mix Space，已经确认的 Oops 视觉语言都不需要重写；反过来，调整背景、字体或动效时，也不会污染文章数据和路由逻辑。
