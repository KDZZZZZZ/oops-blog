# Weekly Lunar Writing Trace

## Intent

Replace the weekly publication bubbles with a four-phase lunar visual while keeping the existing quantitative encoding. Each visible node still represents one calendar week containing published posts. Circle area remains proportional to the number of posts in that week.

## Phase mapping

Weeks are Monday-based. The phase is derived from the week start's ordinal position in its month and cycles every four weeks:

1. new moon
2. first quarter
3. full moon
4. last quarter

A fifth week starts the sequence again at new moon.

## Theme treatment

Moon faces use only the current theme's foreground color or transparency, never a gray fill. Light mode draws the dark portion in black and leaves the illuminated portion transparent. Dark mode draws the illuminated portion in white and leaves the dark portion transparent. A thin foreground-colored outline keeps every phase visible, so a full moon in light mode and a new moon in dark mode read as outlined circles.

## Layout and interaction

Nodes retain their relative timeline positions, with a small deterministic minimum horizontal gap applied to adjacent active weeks. The first and last nodes stay inside the line bounds. Hover and keyboard focus reveal the week, post count, phase, and titles. No visible legend or date labels are added.

## Verification

- Unit tests cover Monday-based grouping and the four-phase cycle.
- Browser tests verify the phase classes, fixed lunar colors, theme-aware outlines, proportional areas, no labels, and minimum adjacent spacing.
- Desktop and mobile screenshots confirm the line stays balanced and the latest node remains visible.
