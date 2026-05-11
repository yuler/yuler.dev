# Design: Extract `DesignTokenTable` from `src/pages/design.astro`

- **Status:** approved (design only — implementation plan separate)
- **Date:** 2026-05-11
- **Author:** yule (with agent)
- **Scope:** `src/pages/design.astro` only. Does **not** touch shared `prose` styles or the mode-switch script duplicated with `src/pages/agents.astro`.

## Problem

`src/pages/design.astro` is 370 lines, with two concerns tangled together:

1. **Page shell** — layout, breadcrumb, header card, mode switch, prose render, mode-switch script.
2. **Design tokens table** — flattening YAML frontmatter into rows, resolving `{token.refs}`, deriving preview types (color / px / rem / fontFamily / fontSize / fontWeight / lineHeight), and rendering a per-group table with a deeply nested preview cell.

The token table accounts for roughly **~270 of the 370 lines** (~140 TS in frontmatter + ~135 in the template). It makes the page hard to scan and hard to evolve (adding a new preview type means editing both halves of one large file).

This refactor extracts the token-table concern into a dedicated component so the page can be read top-to-bottom as a page, and the table can be reasoned about on its own.

## Goals

- **Reduce cognitive load** on `design.astro`: its frontmatter and template should describe page layout only.
- **Encapsulate** the token-flattening / ref-resolution / preview-derivation pipeline behind one component.
- **Zero behavioral change**: identical DOM output, identical styling, identical interactions.

## Non-goals

- Splitting preview rendering by type (e.g. `<ColorSwatch />`, `<PxBar />`). Out of scope this iteration.
- De-duplicating the `prose-*` class block shared with `agents.astro`.
- Extracting a shared "render markdown page" shell shared with `agents.astro`.
- Extracting helpers to a separate `.ts` module. Helpers follow the component.
- Adding tests, types-package, or other infrastructure.

## Approach

One new component, `src/components/DesignTokenTable.astro`. Page iterates over the group names and renders one component per group. All token logic lives inside the component.

### Component API

```ts
type TokenGroup = 'colors' | 'typography' | 'rounded' | 'spacing' | 'components'

interface Props {
  group: TokenGroup
  frontmatter: Record<string, unknown>
}
```

Page usage:

```astro
{TOKEN_GROUPS.map(group => (
  <DesignTokenTable group={group} frontmatter={frontmatter} />
))}
```

**Why pass the full `frontmatter` instead of just `frontmatter[group]`?** Token values can reference each other across groups, e.g. `components.card.backgroundColor: "{colors.surface}"`. The component builds a flat path → value lookup from the entire frontmatter so cross-group refs resolve correctly.

### Component internals

Inside `DesignTokenTable.astro`, the frontmatter is organized in the following sections (in this order):

1. **Constants** — regexes: `HEX_COLOR_RE`, `PX_VALUE_RE`, `REM_VALUE_RE`, `FONT_WEIGHT_RE`, `TOKEN_REF_RE`.
2. **Types** — `TokenRow`, `TokenPreview`, `TokenRowResolved`.
3. **Pure helpers** — `isPlainObject`, `stringifyTokenValue`.
4. **Data pipeline** — `flattenTokenObject`, `getTokenPreview`, `resolveTokenValue`. `resolveTokenValue` closes over a `tokenValueByPath` table built once from the full `props.frontmatter` (covers cross-group refs).
5. **Per-instance execution**:
   - Read `props.frontmatter[props.group]`.
   - Flatten → resolve refs → compute previews → produce `rows: TokenRowResolved[]` (returns `[]` if the group is missing or not a plain object).
   - Compute `title` from `props.group` (capitalize first letter).

The template is the existing per-group table block (the `<div class="mb-6">…</div>` from the current page, lines ~190–307), unchanged in markup and classes — wrapped in a top-level `{rows.length > 0 && (…)}` conditional so an empty group renders nothing (Astro components render nothing via conditional template expressions, not by `return null` in frontmatter). Conditional preview branches inside the `<td>` stay as they are — splitting them by preview type is out of scope.

### After-refactor `design.astro` shape

Frontmatter shrinks from ~140 lines to roughly:

```astro
---
import DesignContent, { frontmatter } from '../../DESIGN.md'
import rawDesignMd from '../../DESIGN.md?raw'
import DesignTokenTable from '../components/DesignTokenTable.astro'
import Switch from '../components/Switch.astro'
import Layout from '../layouts/Layout.astro'

const TOKEN_GROUPS = ['colors', 'typography', 'rounded', 'spacing', 'components'] as const

const designDescription = typeof frontmatter?.description === 'string'
  ? frontmatter.description
  : ''
---
```

The token region of the template shrinks from ~135 lines to roughly:

```astro
<section class="mb-8">
  <h2 class="text-lg font-semibold font-mono text-gray-900 mb-3">Design Tokens (YAML)</h2>
  {TOKEN_GROUPS.map(group => (
    <DesignTokenTable group={group} frontmatter={frontmatter} />
  ))}
</section>
```

Everything else in the page (Layout wrapper, breadcrumb, header card with `<Switch>`, `<DesignContent />` prose article, raw-markdown panel, mode-switch script) stays byte-identical.

## Edge cases

- **Empty group** — `rows` is `[]`, template's top-level conditional skips rendering. No table, no title.
- **All groups empty** (no tokens at all in frontmatter) — the outer `<h2>Design Tokens (YAML)</h2>` still renders with nothing under it. Accepted: `DESIGN.md` is author-controlled and always has tokens; the cost of a conditional in the page (re-deriving "are there any tokens" outside the component) isn't justified.
- **Frontmatter missing entirely** — `frontmatter` is undefined or non-object. Component's group lookup yields `undefined`; flatten short-circuits to `[]`; template renders nothing. Same outcome as empty group.
- **Cross-group token ref** (e.g. `{colors.surface}`) — resolved via the full lookup built from `props.frontmatter`. Behavior matches current code.
- **Self-referential / cyclic refs** — current `resolveTokenValue` already guards with a `visited` set; that logic moves verbatim.

## Tradeoffs

- **Re-computing the lookup per instance**: each `<DesignTokenTable>` builds its own `tokenValueByPath` from the full frontmatter. For 5 small groups this is negligible (build time, no client-side cost — it's all in Astro frontmatter). Accepted in exchange for keeping the component self-contained.
- **Logic in component, not in `src/lib`**: harder to unit-test in isolation, and the helpers can't be reused by future pages without extracting them later. Accepted — no second consumer exists today, no test infra exists today, YAGNI.
- **Single component, not split by preview type**: the nested preview `<td>` keeps its conditional branches. Reading the table renderer still requires holding multiple preview types in mind. Accepted for this iteration; a future split into `<ColorSwatch />`, `<PxBar />`, etc., can build on this foundation.

## Verification

After implementation:

1. `pnpm dev`, open `/design`, visually diff token tables against `main`: same groups, same rows, same preview affordances (color swatches, bar widths, font samples, `= resolved` lines for refs).
2. Toggle the Preview / Markdown switch — behavior unchanged.
3. `pnpm build` succeeds with no TypeScript or Astro errors.
4. `git diff --stat` on `src/pages/design.astro` shows a net reduction of roughly 250+ lines; `src/components/DesignTokenTable.astro` is added.

## Out of scope (future work)

- Extract shared `prose-*` class string + mode-switch script into a `<MdRenderPage>` component used by both `design.astro` and `agents.astro`.
- Split `DesignTokenTable`'s preview cell into preview-type-specific subcomponents.
- Move data helpers to `src/lib/design-tokens.ts` once a second consumer or test suite appears.
