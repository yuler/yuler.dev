---
version: alpha
name: yuler.dev's website design
description: Personal site — Astro, Tailwind CSS 4, Inter + monospace accents. Light, editorial cards on a neutral canvas.
colors:
  primary: "#1a1a1a"
  secondary: "#6b7280"
  tertiary: "#3b82f6"
  neutral: "#f5f5f5"
  surface: "#ffffff"
  border: "#e5e7eb"
  border-muted: "#f3f4f6"
  muted-ui: "#9ca3af"
  heatmap-low: "#f3f4f6"
  heatmap-mid: "#d1d5db"
  heatmap-high: "#4b5563"
  heatmap-max: "#000000"
typography:
  body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.6
  mono-label:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.25
  card-title:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 1.125rem
    fontWeight: 600
    lineHeight: 1.375
  profile-name:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 1.5rem
    fontWeight: 700
    lineHeight: 1.2
  post-title:
    fontFamily: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
    fontSize: 1.875rem
    fontWeight: 700
    lineHeight: 1.2
  prose-body:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.625
rounded:
  none: 0px
  hairline: 2px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  section: 48px
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.none}"
    padding: 24px
  list-row-interactive:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    padding: 12px
  secondary-button:
    backgroundColor: "{colors.border-muted}"
    textColor: "#374151"
    typography: "{typography.mono-label}"
    padding: 12px 16px
  caption-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.body}"
    padding: 0px
  divider-rule:
    backgroundColor: "{colors.border}"
    textColor: "{colors.primary}"
    height: 1px
    padding: 0px
  page-canvas:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.primary}"
    padding: 0px
  meta-muted:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.mono-label}"
    padding: 0px
  heatmap-empty:
    backgroundColor: "{colors.heatmap-low}"
    padding: 0px
  heatmap-light:
    backgroundColor: "{colors.heatmap-mid}"
    padding: 0px
  heatmap-dark:
    backgroundColor: "{colors.heatmap-high}"
    padding: 0px
  heatmap-full:
    backgroundColor: "{colors.heatmap-max}"
    padding: 0px
  focus-accent:
    backgroundColor: transparent
    textColor: "{colors.tertiary}"
    padding: 0px
---

## Overview

yuler.dev is a **light, content-first** personal site: soft neutral canvas, white **surfaces** with **hairline borders**, and **monospace** for navigation, section titles, and article headings so the UI reads like a clean terminal or README. Body copy stays in **Inter** for readability. Motion is subtle (border darkens on hover, short transitions). There are almost no rounded “app” cards—corners stay **square**; optional **corner bracket** markers reinforce a drafted, editorial frame. Use this file when adding pages or components so new UI matches existing Tailwind usage and global styles in `src/styles/global.css`.

## Colors

- **Primary (`#1a1a1a`):** Default text on the canvas and on white surfaces; matches `body` in `global.css`.
- **Secondary (`#6b7280`):** Metadata, footer, timestamps, and de-emphasized labels (Tailwind `text-gray-500` class family).
- **Tertiary (`#3b82f6`):** Focus and selection affordances only—`::selection` and `:focus-visible` use this hue at partial opacity; do not flood large areas with blue.
- **Neutral (`#f5f5f5`):** Page background for home, posts, and workouts (`bg-[#f5f5f5]` / same as body background).
- **Surface (`#ffffff`):** All primary cards and article shells.
- **Border (`#e5e7eb`) / border-muted (`#f3f4f6`):** Default card and list borders; lighter rules for section dividers (`border-gray-100`).
- **Muted UI (`#9ca3af`, Tailwind `gray-400`):** Chevron icons, corner markers, decorative separators, and inactive controls. Use for short UI chrome only, not long text on white (contrast).
- **Heatmap scale (`heatmap-*`):** Workout contribution cells only—from empty light gray through black for intensity; today’s cell may use an inset ring, not a fifth fill color.

## Typography

- **Body:** Inter, 400, comfortable line height (1.6 globally). This is the default for paragraphs, descriptions, and long-form `prose`.
- **Monospace stack** (`font-mono`): Section titles (“Posts”, “Workouts”), profile name, post H1, breadcrumbs, meta lines (`date:`, `read:`), and small UI labels. Keeps the site feeling like structured logs or docs.
- **Weights:** Semibold for card section titles and post H2 in prose; bold for profile name and post title; medium for list item titles.
- **Article prose:** Use `@tailwindcss/typography` with the existing `prose-gray` overrides in `src/pages/posts/[...slug].astro`: headings monospace and gray-900, links underlined with gray decoration, blockquotes left border + gray-50 fill, tables with gray borders and mono table headers.

## Layout

- **Canvas:** Full-width neutral background; content centered with horizontal padding (`px-4`), vertical rhythm `py-8` / `md:py-12`.
- **Home:** `max-w-7xl` container; **3-column** grid on large screens (profile column + two-column main), **single column** on small screens; consistent `gap-4` between cards.
- **Posts list / post detail / workouts:** `max-w-4xl` for reading width on article flows; breadcrumbs above the first card.
- **Cards:** Prefer **single white panel** with `p-6` (or `md:p-8` / `lg:p-12` for long article bodies). Headers often include a bottom rule (`border-b border-gray-100 pb-4`).
- **Spacing scale:** Use Tailwind’s 4-based rhythm aligned to tokens: `gap-4`, `p-6`, `mb-8`, etc.; avoid arbitrary large gaps unless matching an existing page.

## Elevation & Depth

- **No drop shadows** on standard cards; depth comes from **1px borders** and hover state (`hover:border-gray-400`).
- **Corner markers:** Optional `CornerMarkers`—small L-shaped borders at card corners; use together with cards, not on plain divs.
- **Lightbox / overlays:** Follow existing `LightBox` behavior; keep backdrop consistent with rest of site (do not introduce new blur tints without updating this doc).

## Shapes

- **Corners:** Default **square** (`rounded-none`) for cards, code blocks, and primary panels. Small rounded corners are acceptable only where already used (e.g. tiny badges, thought tags).
- **Borders:** 1px solid gray-200 default; lighten to gray-100 for internal dividers; interactive rows use transparent border then `hover:border-gray-200`.

## Components

- **Card (default):** White background, `border border-gray-200`, `p-6`, `relative`, transition on border color; include `CornerMarkers` when the pattern matches profile/posts/workouts cards.
- **Card header:** Flex row, space-between; title uses `card-title` token (mono, semibold); optional count badge `text-sm bg-gray-100 text-gray-600 font-mono px-2 py-0.5`.
- **List row (link):** `p-3`, `min-h-[3.25rem]`, hover `bg-gray-50`, optional border on hover; trailing chevron `text-gray-400` with slight translate on hover.
- **Secondary button / footer link:** `bg-gray-100 text-gray-600`, hover `bg-gray-200 text-gray-900`, `font-mono`, inline-flex with icon gap (see “View more” on posts).
- **Text link (muted):** `text-xs text-gray-400`, underline with `decoration-gray-200`, hover to gray-600 and stronger decoration (workouts “View all”).
- **Tags:** `border border-gray-300 text-gray-600`, hover darkens border and text to gray-900.
- **Status chips:** Draft = gray-200/gray-600; WIP = amber-100/amber-700; align padding `text-xs`.
- **Heatmap cells:** Four gray/black steps only; “today” uses inset ring; future days muted empty state.
- **Icons:** Implement as **small Astro components** under `src/components/icons/`; stroke/fill colors follow `muted` / `secondary`, inheriting `currentColor` where possible.

## Do's and Don'ts

**Do**

- Keep **Inter + monospace** split: prose body in Inter; UI chrome and headings in mono where the codebase already does.
- Reuse **gray border** vocabulary (`200` default, `100` dividers, `400` on card hover).
- Match **focus-visible** to global outline (blue tint, 2px-equivalent offset).
- Add new **icons** as dedicated Astro components in `src/components/icons/`.

**Don’t**

- Don’t introduce **dark mode** or new primary hues in one-off components without updating tokens and this file.
- Don’t default to **heavy rounding** or **shadow-heavy** cards; they conflict with the current editorial flat look.
- Don’t use **tertiary blue** as large fills; it’s for focus/selection semantics.
- Don’t paste **inline SVG** in random pages when an icon component pattern exists.
