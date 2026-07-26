# Visual Effects Module

该目录是博客的共享视觉与交互层，不是独立页面。

## 内容

- `assets/site.css`：设计 token、布局、响应式和动效
- `assets/site.js`：主题、导航、搜索、筛选和视图切换
- `assets/marble-light.svg`：浅色主题的低对比液态纹理
- `assets/fonts/`：本地 Inter 字体及许可
- `assets/avatar.png`：首页身份图像

## 使用

页面通过以下资源接入模块：

```html
<link rel="stylesheet" href="modules/visual-effects/assets/site.css" />
<script src="modules/visual-effects/assets/site.js" defer></script>
```

所有用户可见页面必须遵循 `docs/PRD-UIUX.md` 与 `docs/brand-spec.md`。不要在单页中重新定义全局 token、页面背景、字体体系或通用动效。
