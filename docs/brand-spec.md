# Oops Blog - Reference-derived Brand Spec

## Source boundary

- Visual reference: `https://innei.in`
- Open design contract: `https://github.com/Innei/Yohaku/tree/main/design-system` (MIT)
- Full Yohaku application: not treated as reusable source code.
- Shiro application: not copied; its AGPLv3 license and additional terms are intentionally avoided in this clean implementation.

## Core tokens

```css
:root {
  --bg: oklch(97.91% 0.0041 91.4);
  --surface: oklch(99.70% 0.0041 91.4);
  --fg: oklch(25.58% 0.0075 95.4);
  --muted: oklch(46.78% 0.0083 88.7);
  --border: oklch(85.07% 0.0111 95.2);
  --accent: oklch(62.13% 0.1241 11.6);

  --font-display: "Noto Serif CJK SC", "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, Georgia, serif;
  --font-body: "Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", "Hiragino Sans GB", sans-serif;
  --font-mono: "Operator Mono", "Cascadia Code PL", "JetBrains Mono", "Fira Code", Consolas, Monaco, monospace;
}
```

`Inter` is self-hosted from `modules/visual-effects/assets/fonts/`; the CJK serif role uses the locally available `Noto Serif SC` before falling back to the Yohaku-compatible serif chain.

## Layout posture

1. Content reads as a continuous paper-like editorial flow, not a card wall.
2. Keep the main reading column narrow (`65ch`); use wide whitespace and one secondary rail only where it adds context.
3. Use 1px rings and dividers for structure; avoid hard shadows. Radius is capped at 16px and most content rows remain unboxed.
4. Accent stays below 5% of each screen and is reserved for the mark, focus, and one primary action.
5. Motion is low-amplitude and stateful: 12px entrance travel, `cubic-bezier(.22, 1, .36, 1)`, one-time staged entry, scroll-linked hero exit, and a reduced-motion path.

## Originality rules

- Preserve principles, not branded composition: whitespace, restrained color, serif hierarchy, gentle motion, reading-first interaction.
- Do not copy Innei's wordmark, personal copy, avatar treatment, navigation labels, article taxonomy, or proprietary Yohaku components.
- Build new information architecture around Oops's work, notes, experiments, and open-source activity.
