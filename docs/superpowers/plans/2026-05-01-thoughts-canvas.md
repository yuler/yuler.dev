# Thoughts 便利贴画布 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 `/thoughts` 索引页改为便利贴视觉，并在桌面与「小屏展开」场景提供可平移缩放的画布；列表与 `prefers-reduced-motion` 降级行为符合 `docs/superpowers/specs/2026-05-01-thoughts-canvas-design.md`。

**Architecture:** 在 Astro 服务端用纯函数根据 slug/date 计算每条便签的世界坐标与旋转，SSR 输出绝对定位的 DOM；用 `client:media` 与 `client:load` 两个极小的 vanilla TS island 分别挂载桌面平移缩放、以及小屏「展开/收起画布」状态与对应画布初始化。样式用 Tailwind 的 `md:` 与 `motion-reduce` 变体切换列表/画布可见性。

**Tech Stack:** Astro 6、Tailwind 4、TypeScript、Vitest（仅测纯函数）、现有 `LightBox.astro` 不变。

---

## 文件结构（落地前锁定）

| 文件 | 职责 |
|------|------|
| `src/utils/thoughts-canvas-layout.ts` | 确定性哈希、按年分带、计算每条便签的 `x, y, rotateDeg` 与世界包围尺寸常量 |
| `src/utils/thoughts-canvas-layout.test.ts` | 覆盖稳定性与分带行为 |
| `src/utils/thoughts-canvas-theme.ts` | （可选）由 slug 生成便签背景 `hsl()` 或 class 后缀，供 Astro 与测试共用 |
| `src/components/Thought.astro` | 增加 `variant: 'inline' \| 'sticky'`（或等价命名），sticky 时去掉列表用 `border-b`、调整内边距以适配便签 |
| `src/components/thoughts/ThoughtsCanvasShell.astro` | 画布视口 DOM：`overflow-hidden` 外层 + `transform` 内层世界容器；便签 `position:absolute` + `left/top` + `transform: rotate` |
| `src/components/thoughts/ThoughtsCanvasControls.astro` | `client:media="(min-width: 768px) and (prefers-reduced-motion: no-preference)"`：挂载指针拖拽与滚轮缩放 |
| `src/components/thoughts/ThoughtsMobileCanvasToggle.astro` | `client:load`：仅小屏且 `motion-safe` 时显示「在画布上查看 / 返回列表」；切换两个容器的 `hidden`/`aria-hidden` 并在展开时初始化画布逻辑（可与 Controls 共用同一 init 模块） |
| `src/components/thoughts/thoughts-canvas-controller.ts` | 纯 TS：`initCanvas(viewportEl, worldEl, options)`，导出给两个 island 调用，避免重复逻辑 |
| `src/pages/thoughts/index.astro` | 取数、`computeThoughtLayouts`、渲染列表区 + 画布区 + 两个 island + `LightBox` |

---

### Task 1: `thoughts-canvas-layout` 纯函数 + Vitest

**Files:**

- Create: `src/utils/thoughts-canvas-layout.ts`
- Create: `src/utils/thoughts-canvas-layout.test.ts`
- Test: `pnpm exec vitest run src/utils/thoughts-canvas-layout.test.ts`

- [ ] **Step 1: Write the failing test**

创建 `src/utils/thoughts-canvas-layout.test.ts`：

```typescript
import { describe, expect, it } from 'vitest'
import { layoutStickyNotes, type ThoughtLayoutInput } from './thoughts-canvas-layout'

function T(slug: string, dateIso: string): ThoughtLayoutInput {
  return { id: slug, slug, dateMs: new Date(dateIso).getTime() }
}

describe('layoutStickyNotes', () => {
  it('returns stable x,y,rotate for the same slug and date', () => {
    const a = layoutStickyNotes([T('alpha', '2026-01-02T12:00:00Z')])
    const b = layoutStickyNotes([T('alpha', '2026-01-02T12:00:00Z')])
    expect(a[0]).toEqual(b[0])
  })

  it('places newer calendar year in a higher-index band (toward configured newer region)', () => {
    const rows = layoutStickyNotes([
      T('old', '2024-06-01T00:00:00Z'),
      T('new', '2026-01-01T00:00:00Z'),
    ])
    const old = rows.find(r => r.slug === 'old')!
    const neu = rows.find(r => r.slug === 'new')!
    expect(neu.bandIndex).toBeGreaterThan(old.bandIndex)
  })

  it('orders tabindex sequence new-to-old when option focusOrder is new-first', () => {
    const rows = layoutStickyNotes(
      [T('a', '2025-01-01T00:00:00Z'), T('b', '2026-01-01T00:00:00Z')],
      { focusOrder: 'new-first' },
    )
    const tab = [...rows].sort((p, q) => p.tabIndex - q.tabIndex).map(r => r.slug)
    expect(tab[0]).toBe('b')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

运行：

```bash
cd /Users/yule/Projects/yuler.dev && pnpm exec vitest run src/utils/thoughts-canvas-layout.test.ts
```

预期：**FAIL**（模块或导出不存在）。

- [ ] **Step 3: Write minimal implementation**

创建 `src/utils/thoughts-canvas-layout.ts`（数值可在实现时微调，但必须满足测试语义）：

```typescript
export type ThoughtLayoutInput = {
  id: string
  slug: string
  dateMs: number
}

export type ThoughtLayoutRow = {
  slug: string
  bandIndex: number
  bandKey: string
  x: number
  y: number
  rotateDeg: number
  tabIndex: number
}

export type LayoutOptions = {
  /** Tab 顺序：新→旧（符合设计 3.1） */
  focusOrder?: 'new-first' | 'old-first'
}

const NOTE_W = 300
const NOTE_H = 280
const BAND_H = 420
const PAD = 48

function fnv1a32(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function unitFloat(seed: string, salt: string): number {
  const h = fnv1a32(`${seed}\0${salt}`)
  return (h % 10_000) / 10_000
}

function calendarYear(ms: number): number {
  return new Date(ms).getUTCFullYear()
}

/**
 * 按 UTC 日历年份分带，新年份 bandIndex 更大（更「上」层叠时可映射为更靠右上）。
 * 带内位置由 slug 确定性分散，避免刷新跳动。
 */
export function layoutStickyNotes(
  inputs: ThoughtLayoutInput[],
  options: LayoutOptions = {},
): ThoughtLayoutRow[] {
  const focusOrder = options.focusOrder ?? 'new-first'
  const byYear = new Map<number, ThoughtLayoutInput[]>()
  for (const t of inputs) {
    const y = calendarYear(t.dateMs)
    if (!byYear.has(y))
      byYear.set(y, [])
    byYear.get(y)!.push(t)
  }
  const yearsAsc = [...byYear.keys()].sort((a, b) => a - b)
  const yearRank = new Map<number, number>()
  yearsAsc.forEach((y, i) => yearRank.set(y, i))

  const rows: ThoughtLayoutRow[] = []
  for (const t of inputs) {
    const y = calendarYear(t.dateMs)
    const bandIndex = yearRank.get(y) ?? 0
    const bandKey = String(y)
    const u = unitFloat(t.slug, 'x')
    const v = unitFloat(t.slug, 'y')
    const rw = 900
    const x = PAD + u * (rw - NOTE_W)
    const yPx = PAD + bandIndex * BAND_H + v * (BAND_H - NOTE_H - PAD)
    const rot = (unitFloat(t.slug, 'rot') - 0.5) * 7
    rows.push({
      slug: t.slug,
      bandIndex,
      bandKey,
      x,
      y: yPx,
      rotateDeg: rot,
      tabIndex: 0,
    })
  }

  const chron = [...inputs].sort((a, b) => a.dateMs - b.dateMs)
  const order = focusOrder === 'new-first' ? [...chron].reverse() : chron
  order.forEach((t, i) => {
    const row = rows.find(r => r.slug === t.slug)
    if (row)
      row.tabIndex = 10 + i
  })

  return rows
}

export const THOUGHT_STICKY_NOTE_W = NOTE_W
export const THOUGHT_STICKY_NOTE_H = NOTE_H

export function worldBounds(rows: ThoughtLayoutRow[]): { width: number, height: number } {
  if (rows.length === 0)
    return { width: 800, height: 600 }
  let maxX = 0
  let maxY = 0
  for (const r of rows) {
    maxX = Math.max(maxX, r.x + NOTE_W)
    maxY = Math.max(maxY, r.y + NOTE_H)
  }
  return { width: maxX + PAD, height: maxY + PAD }
}
```

若测试里 `bandIndex` 比较方向与实现不一致，**以设计为准**：新年份 `bandIndex` 更大；调整 `yearRank` 映射直至 Step 4 通过。

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm exec vitest run src/utils/thoughts-canvas-layout.test.ts
```

预期：**PASS**

- [ ] **Step 5: Commit**

```bash
git add src/utils/thoughts-canvas-layout.ts src/utils/thoughts-canvas-layout.test.ts
git commit -m "feat(thoughts): add deterministic sticky layout helper"
```

---

### Task 2: 便签主题色（可选独立文件）

**Files:**

- Create: `src/utils/thoughts-canvas-theme.ts`
- Test: （可选）`src/utils/thoughts-canvas-theme.test.ts`；若 YAGNI 省略测试，则在本 Task 内用 Story 式断言：同一 slug 两次调用 `stickyBackground(slug)` 字符串相等

- [ ] **Step 1: 实现 `stickyBackground(slug: string): string`**

返回 `hsl(...)` 字符串，`h` 由 `fnv1a32(slug) % 360` 派生，`s/l` 固定在中等饱和度、较高亮度，保证正文 `text-gray-800` 可读。

- [ ] **Step 2: Commit**

```bash
git add src/utils/thoughts-canvas-theme.ts
git commit -m "feat(thoughts): add sticky note hsl helper"
```

---

### Task 3: `Thought.astro` 支持 sticky 变体

**Files:**

- Modify: `src/components/Thought.astro`

- [ ] **Step 1: 为组件增加 props**

```astro
---
interface Props {
  thought: CollectionEntry<'thoughts'>
  /** inline: 原列表卡片内条目标签；sticky: 便签内排版 */
  variant?: 'inline' | 'sticky'
}
const { thought, variant = 'inline' } = Astro.props
---
```

- [ ] **Step 2: 按 variant 切换根节点 class**

- `inline`：保留现有 `py-4 border-b border-gray-100 last:border-0`。
- `sticky`：去掉 `border-b`，改为 `py-3 px-1`，`prose` 保持 `prose-sm`。

- [ ] **Step 3: 运行检查**

```bash
pnpm check
```

预期：**PASS**（无类型/模板错误）。

- [ ] **Step 4: Commit**

```bash
git add src/components/Thought.astro
git commit -m "feat(thoughts): add Thought sticky variant"
```

---

### Task 4: 画布控制器 `thoughts-canvas-controller.ts`

**Files:**

- Create: `src/components/thoughts/thoughts-canvas-controller.ts`

- [ ] **Step 1: 实现 `initThoughtsCanvas(viewport: HTMLElement, world: HTMLElement)`**

行为要点：

- 状态：`scale`（初值 `1`）、`tx, ty`（初值 `0`）。
- 指针：`pointerdown` 记录起点，`pointermove` 拖拽时 `tx += dx`, `ty += dy`（除以 `scale` 或先平移再缩放，保持一致即可），`pointerup/cancel` 结束。
- 滚轮：`wheel` 默认 `preventDefault()`，以光标为中心或视口中心缩放，`scale` 限制在 `[0.35, 1.6]`（可调）；更新 `world.style.transform = translate(tx,ty) scale(scale)`。
- `viewport.style.touchAction = 'none'` 减少触控滚动吞并问题。
- 返回 `{ destroy() }` 移除监听，供 Astro 导航或 toggle 时调用（若页面无 SPA 可简化为仅 `init`，但 **destroy** 利于小屏反复展开）。

参考实现骨架：

```typescript
export function initThoughtsCanvas(viewport: HTMLElement, world: HTMLElement) {
  let scale = 1
  let tx = 0
  let ty = 0
  let dragging = false
  let lastX = 0
  let lastY = 0

  function apply() {
    world.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY * 0.001
    const next = Math.min(1.6, Math.max(0.35, scale + delta))
    scale = next
    apply()
  }

  function onDown(e: PointerEvent) {
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
    viewport.setPointerCapture(e.pointerId)
  }

  function onMove(e: PointerEvent) {
    if (!dragging)
      return
    tx += e.clientX - lastX
    ty += e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    apply()
  }

  function onUp(e: PointerEvent) {
    dragging = false
    try {
      viewport.releasePointerCapture(e.pointerId)
    }
    catch {}
  }

  viewport.addEventListener('wheel', onWheel, { passive: false })
  viewport.addEventListener('pointerdown', onDown)
  viewport.addEventListener('pointermove', onMove)
  viewport.addEventListener('pointerup', onUp)
  viewport.addEventListener('pointercancel', onUp)
  apply()

  return {
    destroy() {
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('pointerdown', onDown)
      viewport.removeEventListener('pointermove', onMove)
      viewport.removeEventListener('pointerup', onUp)
      viewport.removeEventListener('pointercancel', onUp)
    },
  }
}
```

（实现完成后根据手感微调缩放速度；**不必**为本文件加 Vitest，除非抽纯数学函数。）

- [ ] **Step 2: Commit**

```bash
git add src/components/thoughts/thoughts-canvas-controller.ts
git commit -m "feat(thoughts): add canvas pan-zoom controller"
```

---

### Task 5: `ThoughtsCanvasControls.astro`（桌面 island）

**Files:**

- Create: `src/components/thoughts/ThoughtsCanvasControls.astro`

- [ ] **Step 1: 模板仅含 `<script>`**

```astro
---
const viewportId = 'thoughts-canvas-viewport'
const worldId = 'thoughts-canvas-world'
---
<script>
  import { initThoughtsCanvas } from './thoughts-canvas-controller'

  const viewport = document.getElementById('thoughts-canvas-viewport')
  const world = document.getElementById('thoughts-canvas-world')
  if (viewport && world)
    initThoughtsCanvas(viewport, world)
</script>
```

确保 `index.astro` 中 viewport/world 的 `id` 与上完全一致。

- [ ] **Step 2: 在 `index.astro` 引入**

```astro
import ThoughtsCanvasControls from '../../components/thoughts/ThoughtsCanvasControls.astro'
```

仅在 **画布对桌面可见** 的分支末尾放置：

```astro
<ThoughtsCanvasControls client:media="(min-width: 768px) and (prefers-reduced-motion: no-preference)" />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/thoughts/ThoughtsCanvasControls.astro src/pages/thoughts/index.astro
git commit -m "feat(thoughts): hydrate desktop canvas controls"
```

（若 world id 仅在 Task 6 才写入，可本 Task 只 add Controls 文件，Task 6 再改 index —— 合并 commit 也可，以不破坏中间 `pnpm check` 为准。）

---

### Task 6: `ThoughtsMobileCanvasToggle.astro` + 重构 `index.astro`

**Files:**

- Create: `src/components/thoughts/ThoughtsMobileCanvasToggle.astro`
- Modify: `src/pages/thoughts/index.astro`

- [ ] **Step 1: 列表容器与画布容器 id**

在 `index.astro` frontmatter：

```typescript
import { layoutStickyNotes, worldBounds, THOUGHT_STICKY_NOTE_H, THOUGHT_STICKY_NOTE_W } from '../../utils/thoughts-canvas-layout'
import { stickyBackground } from '../../utils/thoughts-canvas-theme'

const layoutRows = layoutStickyNotes(
  thoughts.map(t => ({ id: t.id, slug: t.id, dateMs: t.data.date.getTime() })),
  { focusOrder: 'new-first' },
)
const layoutBySlug = new Map(layoutRows.map(r => [r.slug, r]))
const bounds = worldBounds(layoutRows)
```

- [ ] **Step 2: 列表视图 HTML**

外层例如：

```html
<section id="thoughts-list-view" class="motion-safe:max-md:block motion-safe:md:hidden motion-reduce:block ...">
```

内层 `thoughts.map`：`article` + `id={`thought-${slug}`}` + `stickyBackground` 内联 style + `<Thought variant="sticky" />`。

- [ ] **Step 3: 画布视图 HTML**

```html
<section id="thoughts-canvas-view" class="motion-safe:max-md:hidden motion-safe:md:block motion-reduce:hidden ..." aria-label="Thoughts canvas">
  <div id="thoughts-canvas-viewport" class="h-[min(70vh,560px)] w-full cursor-grab overflow-hidden overscroll-none rounded-lg border ...">
    <div id="thoughts-canvas-world" class="relative will-change-transform" style={`width:${bounds.width}px;height:${bounds.height}px`}>
      {thoughts.map(... absolute left/top transform rotate tabIndex from layout ...)}
    </div>
  </div>
</section>
```

每条便签：`style={{ left: `${r.x}px`, top: `${r.y}px`, width: ... }}` + `transform: rotate(r.rotateDeg + 'deg')` + `tabindex={r.tabIndex}` + `focus:ring` 可见焦点。

- [ ] **Step 4: 小屏切换 island**

`ThoughtsMobileCanvasToggle.astro`：

- 显示条件：`class="flex md:hidden motion-reduce:hidden"` 包裹按钮组。
- 脚本：`#thoughts-list-view`、`#thoughts-canvas-viewport` 显示切换；首次展开时对 **同一对** viewport/world 调用 `initThoughtsCanvas`；再次收起可 `destroy`（若实现了 destroy）。

```astro
<ThoughtsMobileCanvasToggle client:load />
```

- [ ] **Step 5: 验证**

```bash
pnpm check && pnpm test
pnpm build
```

预期：**全部通过**。

- [ ] **Step 6: Commit**

```bash
git add src/pages/thoughts/index.astro src/components/thoughts/ThoughtsMobileCanvasToggle.astro
git commit -m "feat(thoughts): sticky list + canvas layout on index"
```

---

### Task 7: 设计验收对照 + 微调

**Files:**

- Modify: 上述各文件（边距、字号、`h-[min(70vh,560px)]`、缩放上下限）

- [ ] **Step 1: 按 spec §6 手工走查**

宽屏 / 小屏 / reduced motion / 含图 Lightbox / Tab 顺序。

- [ ] **Step 2: Commit**

```bash
git commit -m "fix(thoughts): polish canvas a11y and sizing"
```

---

## Plan self-review（对照 spec）

| Spec 章节 | 对应 Task |
|-----------|-----------|
| §2 时间分区 + 确定性 | Task 1 `layoutStickyNotes` + slug 哈希 |
| §2 小屏混合 | Task 6 列表默认 + Task 4 island |
| §2 reduced motion 仅列表 | Task 6 Tailwind `motion-reduce` / 隐藏画布与按钮 |
| §3.1 桌面画布与 Tab 顺序 | Task 6 `tabIndex` + Task 5 Controls |
| §3.4 LightBox | 不改 `LightBox.astro`；`Thought` 内 `data-lightbox` 保留 |
| §3.5 稳定 `id` | Task 6 `article id` |
| §4 技术方向 | Task 4–6 Astro + vanilla TS |

**Placeholder scan：** 无 TBD。  
**类型一致：** `initThoughtsCanvas` 与 island 中 id 字符串一致。

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-01-thoughts-canvas.md`. Two execution options:

**1. Subagent-Driven (recommended)** — 每个 Task 派生子代理，任务间人工快速过目，迭代快  

**2. Inline Execution** — 本会话用 executing-plans 按勾选顺序实现，设检查点批量提交  

**Which approach?**
