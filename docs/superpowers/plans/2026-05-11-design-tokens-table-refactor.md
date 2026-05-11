# DesignTokenTable Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the Design Tokens preview table from `src/pages/design.astro` into a dedicated `DesignTokenTable` Astro component, with zero behavioral / visual change.

**Architecture:** One new component `src/components/DesignTokenTable.astro` owns the entire token pipeline (flatten YAML frontmatter → resolve `{token.refs}` → derive preview types → render one per-group `<table>`). `src/pages/design.astro` becomes a thin page: it iterates a `TOKEN_GROUPS` constant and renders one `<DesignTokenTable group=... frontmatter={frontmatter} />` per group. Each instance receives the full `frontmatter` object so cross-group refs like `{colors.surface}` resolve correctly. Empty groups render nothing via a top-level `{rows.length > 0 && (…)}` conditional in the component template.

**Tech Stack:** Astro 6, TypeScript, Tailwind CSS 4, MDX, pnpm.

**Reference spec:** `docs/superpowers/specs/2026-05-11-design-tokens-table-refactor-design.md`

**Verification model:** This codebase has no unit-test infrastructure. Each task verifies via `pnpm build` (catches TS / Astro errors) plus visual check at `/design` via `pnpm dev`. Frequent commits give us cheap rollback.

---

## Task 1: Create `DesignTokenTable.astro` component

**Files:**
- Create: `src/components/DesignTokenTable.astro`

This task introduces the component containing all token logic and markup. Nothing imports it yet, so the existing `/design` page renders unchanged. Verification: build still passes, page still renders as before.

- [ ] **Step 1: Create `src/components/DesignTokenTable.astro` with full implementation**

Write the file at `src/components/DesignTokenTable.astro`. Full content (the component must be self-contained — do not split helpers into another file):

```astro
---
type TokenGroup = 'colors' | 'typography' | 'rounded' | 'spacing' | 'components'

interface Props {
  group: TokenGroup
  frontmatter: Record<string, unknown>
}

const { group, frontmatter } = Astro.props

type TokenRow = {
  path: string
  value: string
}

type TokenPreview = {
  colorHex: string | null
  pxValues: number[]
  remValues: number[]
  fontSize: string | null
  fontFamily: string | null
  fontWeight: number | null
  lineHeight: string | null
}

type TokenRowResolved = TokenRow & { preview: TokenPreview, resolvedValue: string }

const HEX_COLOR_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i
const PX_VALUE_RE = /(\d+(?:\.\d+)?)px/g
const REM_VALUE_RE = /(\d+(?:\.\d+)?)rem/g
const FONT_WEIGHT_RE = /^\d{2,3}$/
const TOKEN_REF_RE = /^\{([^}]+)\}$/

const TOKEN_GROUPS: readonly TokenGroup[] = ['colors', 'typography', 'rounded', 'spacing', 'components']

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringifyTokenValue(value: unknown): string {
  if (value === null || value === undefined)
    return ''
  if (typeof value === 'string')
    return value
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  return JSON.stringify(value)
}

function flattenTokenObject(input: unknown, parents: string[] = []): TokenRow[] {
  if (!isPlainObject(input))
    return []

  const rows: TokenRow[] = []
  for (const [key, value] of Object.entries(input)) {
    const path = [...parents, key]
    if (isPlainObject(value)) {
      rows.push(...flattenTokenObject(value, path))
    }
    else {
      rows.push({ path: path.join('.'), value: stringifyTokenValue(value) })
    }
  }
  return rows
}

function getTokenPreview(tokenPath: string, value: string): TokenPreview {
  const normalized = value.trim()
  const colorHex = HEX_COLOR_RE.test(normalized) ? normalized : null

  const pxValues: number[] = []
  for (const match of normalized.matchAll(PX_VALUE_RE)) {
    const parsed = Number.parseFloat(match[1])
    if (Number.isFinite(parsed))
      pxValues.push(parsed)
  }

  const remValues: number[] = []
  for (const match of normalized.matchAll(REM_VALUE_RE)) {
    const parsed = Number.parseFloat(match[1])
    if (Number.isFinite(parsed))
      remValues.push(parsed)
  }

  const leafKey = tokenPath.split('.').at(-1) ?? ''
  const fontSize = leafKey === 'fontSize' ? normalized : null
  const remValuesForPreview = leafKey === 'fontSize' ? [] : remValues
  const fontFamily = leafKey === 'fontFamily' ? normalized : null

  const fontWeight = leafKey === 'fontWeight' && FONT_WEIGHT_RE.test(normalized)
    ? Number.parseInt(normalized, 10)
    : null

  const lineHeight = leafKey === 'lineHeight' ? normalized : null

  return { colorHex, pxValues, remValues: remValuesForPreview, fontSize, fontFamily, fontWeight, lineHeight }
}

const allRows: TokenRow[] = TOKEN_GROUPS.flatMap(g =>
  flattenTokenObject(frontmatter?.[g], [g]),
)

const tokenValueByPath = allRows.reduce<Record<string, string>>((acc, row) => {
  acc[row.path] = row.value
  return acc
}, {})

function resolveTokenValue(rawValue: string, visited = new Set<string>()): string {
  const normalized = rawValue.trim()
  const refMatch = normalized.match(TOKEN_REF_RE)
  if (!refMatch)
    return normalized

  const refPath = refMatch[1].trim()
  if (!refPath)
    return normalized

  if (visited.has(refPath))
    return normalized

  const next = tokenValueByPath[refPath]
  if (!next)
    return normalized

  visited.add(refPath)
  return resolveTokenValue(next, visited)
}

const groupRows: TokenRow[] = flattenTokenObject(frontmatter?.[group], [group])

const rows: TokenRowResolved[] = groupRows.map((row) => {
  const resolvedValue = resolveTokenValue(row.value)
  return {
    ...row,
    resolvedValue,
    preview: getTokenPreview(row.path, resolvedValue),
  }
})

const title = group[0].toUpperCase() + group.slice(1)
---

{rows.length > 0 && (
  <div class="mb-6">
    <h3 class="text-base font-semibold font-mono text-gray-900 mb-2">{title}</h3>
    <div class="overflow-x-auto border border-gray-300 bg-white">
      <table class="w-full border-collapse text-xs text-gray-800">
        <thead class="bg-gray-100">
          <tr>
            <th class="border border-gray-300 p-2 text-left font-mono">Token Path</th>
            <th class="border border-gray-300 p-2 text-left font-mono">Value</th>
            <th class="border border-gray-300 p-2 text-left font-mono">Preview</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const preview = row.preview
            return (
              <tr>
                <td class="border border-gray-300 p-2 font-mono">{row.path}</td>
                <td class="border border-gray-300 p-2 break-all">{row.value}</td>
                <td class="border border-gray-300 p-2">
                  <div class="space-y-2">
                    {row.resolvedValue !== row.value.trim() && (
                      <div class="font-mono text-[11px] text-gray-400 break-all">
                        = {row.resolvedValue}
                      </div>
                    )}
                    {preview.fontFamily && (
                      <div class="flex items-center gap-2">
                        <div
                          class="h-5 w-12 border border-gray-300 bg-gray-50 flex items-center justify-center text-[11px] text-gray-900"
                          style={`font-family: ${preview.fontFamily};`}
                        >
                          Aa
                        </div>
                        <span class="font-mono text-[11px] text-gray-500">{preview.fontFamily}</span>
                      </div>
                    )}
                    {preview.fontSize && (
                      <div class="flex items-center gap-2">
                        <div
                          class="border border-gray-300 bg-gray-50 px-2 text-gray-900"
                          style={`font-size: ${preview.fontSize}; line-height: 1;`}
                        >
                          {preview.fontSize}
                        </div>
                        <span class="font-mono text-[11px] text-gray-500">{preview.fontSize}</span>
                      </div>
                    )}

                    {preview.fontWeight !== null && (
                      <div class="flex items-center gap-2">
                        <div
                          class="h-5 w-12 border border-gray-300 bg-gray-50 flex items-center justify-center text-[11px] text-gray-900"
                          style={`font-weight: ${preview.fontWeight}; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;`}
                        >
                          Aa
                        </div>
                        <span class="font-mono text-[11px] text-gray-500">{preview.fontWeight}</span>
                      </div>
                    )}
                    {preview.lineHeight && (
                      <div class="flex items-center gap-2">
                        <div
                          class="w-12 border border-gray-300 bg-gray-50 px-1 text-[11px] text-gray-900"
                          style={`line-height: ${preview.lineHeight}; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;`}
                        >
                          A<br />
                          a
                        </div>
                        <span class="font-mono text-[11px] text-gray-500">{preview.lineHeight}</span>
                      </div>
                    )}
                    {preview.colorHex && (
                      <div class="flex items-center gap-2">
                        <div
                          class="h-5 w-12 border border-gray-300"
                          style={`background-color: ${preview.colorHex};`}
                        />
                        <span class="font-mono text-[11px] text-gray-500">{preview.colorHex}</span>
                      </div>
                    )}
                    {preview.pxValues.length > 0 && (
                      <div class="space-y-1">
                        {preview.pxValues.map((px) => {
                          const width = Math.max(2, Math.min(160, px))
                          return (
                            <div class="flex items-center gap-2">
                              <div class="h-1.5 bg-gray-700" style={`width: ${width}px;`} />
                              <span class="font-mono text-[11px] text-gray-500">{px}px</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {preview.remValues.length > 0 && (
                      <div class="space-y-1">
                        {preview.remValues.map((rem) => {
                          const width = Math.max(2, Math.min(160, rem * 16))
                          return (
                            <div class="flex items-center gap-2">
                              <div class="h-1.5 bg-gray-500" style={`width: ${width}px;`} />
                              <span class="font-mono text-[11px] text-gray-500">{rem}rem</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {!preview.colorHex && preview.pxValues.length === 0 && preview.remValues.length === 0 && !preview.fontSize && !preview.fontFamily && preview.fontWeight === null && !preview.lineHeight && (
                      <span class="font-mono text-[11px] text-gray-400">-</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  </div>
)}
```

Notes on what's intentional in this code:

- `TOKEN_GROUPS` is duplicated inside the component (mirroring the page's list) on purpose. The component must build a global lookup table from ONLY the five token-bearing groups, NOT the top-level metadata fields (`version`, `name`, `description`). Including them would make `{name}` etc. resolvable as token refs, changing behavior.
- The markup inside `<div class="mb-6">…</div>` is copied verbatim from `src/pages/design.astro:190-307` of the pre-refactor file. The only structural addition is the outer `{rows.length > 0 && (…)}` conditional. Do not rearrange, restyle, or "improve" classes.

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: Build succeeds with no TypeScript or Astro errors. The component is valid even though no page imports it yet.

If the build fails: read the error, fix the component file, re-run. Do NOT modify any other file.

- [ ] **Step 3: Verify `/design` still renders identically to `main`**

Run: `pnpm dev`. Visit `http://localhost:4321/design` (or whatever port `pnpm dev` reports).
Expected: page looks identical to the pre-refactor version — five token tables (Colors, Typography, Rounded, Spacing, Components) followed by the rendered DESIGN.md prose. The new component is not yet wired in, so this is a sanity check that nothing regressed.

- [ ] **Step 4: Commit**

```bash
git add src/components/DesignTokenTable.astro
git commit -m "$(cat <<'EOF'
✨ Add DesignTokenTable component
EOF
)"
```

---

## Task 2: Migrate `src/pages/design.astro` to use `DesignTokenTable`

**Files:**
- Modify: `src/pages/design.astro` (full rewrite — frontmatter shrinks from ~140 lines to ~12; token-region template shrinks from ~135 lines to ~6)

- [ ] **Step 1: Replace `src/pages/design.astro` with the simplified version**

Write the file at `src/pages/design.astro`. Full content (replacing the entire current file):

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

<Layout title="Design System" description="Rendered DESIGN.md for yuler.dev UI consistency.">
  <div class="min-h-screen bg-[#f5f5f5] text-gray-900">
    <div class="max-w-4xl mx-auto px-4 py-8 md:py-12">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8 font-mono">
        <a href="/" class="hover:text-gray-900 transition-colors">~</a>
        <span class="text-gray-300">/</span>
        <span class="text-gray-900">design</span>
      </nav>

      <div class="bg-white border border-gray-200 p-6 md:p-8 mb-6">
        <div class="mb-2 flex items-center justify-between gap-3">
          <h1 class="text-2xl md:text-3xl font-bold font-mono text-gray-900">DESIGN.md</h1>
          <Switch
            switchId="render-mode-switch"
            ariaLabel="Render mode"
            value="preview"
            eventName="render-mode:change"
            options={[
              { label: 'Preview', value: 'preview' },
              { label: 'Markdown', value: 'markdown' },
            ]}
          />
        </div>
        <p class="text-sm text-gray-500 font-mono mb-5">
          {designDescription || 'Rendered from DESIGN.md at repository root.'}
        </p>
      </div>

      <div class="bg-white border border-gray-200 p-6 md:p-8" data-render-root data-mode="preview">
        <section data-mode-panel="preview">
          <section class="mb-8">
            <h2 class="text-lg font-semibold font-mono text-gray-900 mb-3">Design Tokens (YAML)</h2>
            {TOKEN_GROUPS.map(group => (
              <DesignTokenTable group={group} frontmatter={frontmatter as Record<string, unknown>} />
            ))}
          </section>

          <section>
            <article
              class="prose prose-gray max-w-none
                prose-headings:font-bold prose-headings:text-gray-900 prose-headings:font-mono
                prose-h2:text-xl prose-h2:md:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-gray-200 prose-h2:pb-2
                prose-p:text-gray-700 prose-p:leading-relaxed prose-p:mb-4
                prose-a:break-all prose-a:text-gray-900 prose-a:underline! prose-a:underline-offset-4 prose-a:decoration-gray-400 prose-a:hover:decoration-gray-900
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-code:border-gray-300 prose-code:text-rose-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-gray-200 prose-pre:p-4 prose-pre:rounded-none prose-pre:border prose-pre:border-gray-300
                prose-pre:code:text-gray-800 prose-pre:code:bg-transparent prose-pre:code:p-0 prose-pre:code:rounded-none
                prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6
                prose-li:my-1 prose-li:text-gray-700
                prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:bg-gray-50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-blockquote:my-4 prose-blockquote:not-italic prose-blockquote:text-gray-600
                prose-hr:border-gray-200 prose-hr:my-8
                prose-table:w-full prose-table:border-collapse prose-table:my-4
                prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:p-2 prose-th:text-left prose-th:text-gray-900 prose-th:font-semibold prose-th:text-sm prose-th:font-mono
                prose-td:border prose-td:border-gray-200 prose-td:p-2 prose-td:text-gray-700 prose-td:text-sm"
            >
              <DesignContent />
            </article>
          </section>
        </section>

        <section id="markdown-text" data-mode-panel="markdown" class="hidden">
          <pre class="overflow-x-auto border border-gray-300 bg-gray-100 p-4 text-sm text-gray-800 leading-relaxed"><code>{rawDesignMd}</code></pre>
        </section>
      </div>
    </div>
  </div>
</Layout>

<script>
  const root = document.querySelector<HTMLElement>('[data-render-root]')
  const modeSwitch = document.querySelector<HTMLElement>('#render-mode-switch')
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-mode-panel]'))

  function setMode(mode: string) {
    if (!root)
      return

    root.dataset.mode = mode

    for (const panel of panels) {
      const shouldShow = panel.dataset.modePanel === mode
      panel.classList.toggle('hidden', !shouldShow)
    }
  }

  modeSwitch?.addEventListener('render-mode:change', (event) => {
    const nextMode = (event as CustomEvent<{ value?: string }>).detail?.value ?? 'preview'
    setMode(nextMode)
  })

  setMode('preview')
</script>
```

Notes on what's intentional:

- The `prose-*` class string, the `<script>`, the breadcrumb, the header card with `<Switch>`, the `<DesignContent />` article, and the raw-markdown panel are byte-identical to the original.
- The cast `frontmatter as Record<string, unknown>` matches the component's `Props.frontmatter` type. The frontmatter import from `DESIGN.md` is typed loosely by Astro, so the cast is needed.
- The H2 `<h2>Design Tokens (YAML)</h2>` always renders, even if all groups happen to be empty. This is intentional per spec (Edge Case A: `DESIGN.md` always has tokens; a guard would be over-engineering).

- [ ] **Step 2: Verify build passes**

Run: `pnpm build`
Expected: build succeeds, no TS or Astro errors.

If build fails: read the error, fix it (likely a missed import or type cast). Do NOT change `DesignTokenTable.astro` — it was already verified in Task 1.

- [ ] **Step 3: Visually diff `/design` against the pre-refactor page**

Run: `pnpm dev`. Visit `/design`. Verify all of the following render exactly as before:

1. Breadcrumb `~/design` at the top.
2. Header card with `DESIGN.md` title, description, and Preview/Markdown switch.
3. **Five token tables** under `Design Tokens (YAML)`:
   - **Colors** — rows include hex color swatches in the Preview column (e.g. `colors.primary` → `#1a1a1a` with a dark swatch).
   - **Typography** — nested rows like `typography.body.fontFamily`, `typography.body.fontSize`, etc., with font samples in the Preview column.
   - **Rounded** — rows with px bars (e.g. `rounded.hairline` → 2px bar).
   - **Spacing** — rows with px bars (e.g. `spacing.md` → 16px bar).
   - **Components** — rows where values like `{colors.surface}` show a `= #ffffff` resolution line below the raw `Value` and a color swatch in Preview.
4. Rendered DESIGN.md article below the tables.
5. Toggle Preview ↔ Markdown via the switch: Markdown mode shows the raw `DESIGN.md` source in a `<pre>`.

- [ ] **Step 4: Check `git diff --stat` for clean refactor signature**

Run: `git diff --stat HEAD~1`
Expected:
- `src/pages/design.astro` shows roughly `-250` or more lines, `+~70` or so (net deletion ~180+ lines).
- No other files in the diff.

- [ ] **Step 5: Commit**

```bash
git add src/pages/design.astro
git commit -m "$(cat <<'EOF'
♻️ Use DesignTokenTable in /design page
EOF
)"
```

---

## Done

After Task 2 commit, the refactor is complete. The repo state:

- `src/components/DesignTokenTable.astro` — new, self-contained.
- `src/pages/design.astro` — thin page shell, ~115 lines.
- Visual output of `/design` — unchanged.
- Two clean commits, ready to PR if desired.

If you spot any deviation from the spec (`docs/superpowers/specs/2026-05-11-design-tokens-table-refactor-design.md`), STOP and surface it instead of fixing it ad-hoc.
