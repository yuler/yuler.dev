# Repo optimization & refactor backlog

Scan date: 2026-04-02. Personal Astro site (`yuler.dev`). Items are ordered roughly by impact vs. effort; pick what matches your goals.

---

## Refactor / DRY

- [x] **Centralize Strava activity loading** — The same `import.meta.glob('.../activities/*.json')` + `_index.json` + `default`-unwrap pattern appears in `src/components/cards/Workout.astro`, `src/pages/workouts/index.astro`, and `src/pages/workouts/[id].astro`. Extract a small module (e.g. `src/utils/strava-activities.ts`) that returns typed activities and reuse everywhere.
- [x] **Unify workout display helpers** — `formatDuration`, `formatDistance`, pace/speed helpers, `sportIcons`, and `deviceEmoji` are duplicated or diverge between workout list and detail (`index.astro` vs `[id].astro`). Move to one module and keep a single `Activity`-ish type (aligned with `src/utils/strava.ts` interfaces where possible).
- [x] **Reuse corner chrome** — `CornerMarkers.astro` exists but many cards still duplicate four absolute corner divs by hand (`posts/[...slug].astro`, `workouts/[id].astro`, stats/footer blocks, `MapRoute.astro`). Prefer the component (or a shared “card shell”) for consistency and less markup noise.
- [x] **Consolidate “year / week grid” logic** — Building ISO-week-style ranges from Jan 1 appears in both `Workout.astro` (heatmap) and `workouts/index.astro` (filter). Consider one helper that returns week boundaries; each page can still filter or aggregate differently.

## Correctness / behavior

- [x] **Fix workouts filter count string** — In `workouts/index.astro` inline script, `countEl.textContent = from ? visible + 'matched' : ''` is missing a space (shows e.g. `5matched`). Should be readable text like `5 matched` or `5 activities`.
- [x] **Review incremental Strava sync** — `scripts/sync-strava-activities.mjs` uses full pagination only when `_index.json` is empty; otherwise it calls `getStravaActivities()` once (default first page). Document this assumption or paginate on incremental runs so edge cases (many new activities, or API ordering quirks) do not drop IDs.

## Performance / bundles

- [x] **Defer heavy client JS on posts** — `LayoutPost.astro` loads and runs Mermaid on every post. Consider lazy init (e.g. `requestIdleCallback` / Intersection Observer) or only including the script when the page has Mermaid blocks.
- [x] **Workout detail: Leaflet + share** — `MapRoute.astro` and `ShareWorkout.astro` pull in non-trivial client code. Audit whether poster/QR/html-to-image can load only when the share dialog opens.
- [x] **Font/CSS** — `global.css` imports four Inter weights; confirm all weights are used and trim unused `@fontsource` imports if any.

## Types & tooling

- [x] **Tighten `any` usage** — `getStaticPaths` in `workouts/[id].astro` uses `as any` / loose casts; `MapRoute.astro` client script uses `any` for Leaflet helpers. Prefer proper types or narrow interfaces.
- [x] **Dependency placement** — `@astrojs/check` lives in `dependencies`; it is usually a dev-only tool. Moving to `devDependencies` keeps production install lean (verify nothing relies on it at runtime).
- [x] **Expand tests beyond scripts** — Vitest covers `scripts/*.test.mjs` only. Add unit tests for `src/utils/polyline.ts`, date helpers, and any extracted Strava/format helpers after refactors.

## Security / SEO / meta

- [ ] **Mermaid `securityLevel`** — `LayoutPost.astro` sets `securityLevel: 'loose'`. For untrusted MDX content this is permissive; if posts are only author-controlled, document that; otherwise consider stricter settings per Mermaid docs.
- [ ] **Social / SEO metadata** — `Layout.astro` sets basic `og:title` / `og:description` / `og:image`. Optional improvements: `og:url`, `twitter:card`, canonical URL, and `article:published_time` on posts.

## UX / accessibility

- [ ] **Keyboard / focus for custom UI** — Share dialog and map controls: verify focus trap, Escape to close, and visible focus rings match `global.css` `:focus-visible` patterns.
- [ ] **External links** — Spot-check `target="_blank"` links include `rel="noopener noreferrer"` where appropriate (many already do).

---

## Quick wins (same session)

1. Fix the `matched` string in `workouts/index.astro`.
2. Extract Strava JSON loader + types to `src/utils/` and switch three call sites.
3. Replace duplicated corner divs with `CornerMarkers` on one page as a pattern, then roll out.
