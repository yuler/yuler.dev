# "Thoughts" Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a Twitter-like "Thoughts" microblogging feature with a homepage card and an archive page.

**Architecture:** Uses Astro Content Layer with a Markdown loader for `src/content/thoughts/`. A reusable `Thought` component will handle rendering for both the homepage card and the main feed.

**Tech Stack:** Astro, TypeScript, Tailwind CSS, date-fns (via existing utils).

---

### Task 1: Content Schema and Sample Data

**Files:**
- Modify: `src/content.config.ts`
- Create: `src/content/thoughts/2026-04-15.md`

- [ ] **Step 1: Update `src/content.config.ts` to include the `thoughts` collection**

```typescript
// src/content.config.ts
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'

const postsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.object({ url: z.string(), alt: z.string() }).optional(),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
    wip: z.boolean().optional(),
  }),
})

const thoughtsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: ({ image }) => z.object({
    date: z.date(),
    images: z.array(image()).max(3).optional(),
    tags: z.array(z.string()).max(3).optional(),
  }),
})

export const collections = {
  posts: postsCollection,
  thoughts: thoughtsCollection,
}
```

- [ ] **Step 2: Create a sample thought file**

```markdown
---
date: 2026-04-15T14:30:00Z
tags: ["vibe", "ai"]
---

Just set up the "Thoughts" feature on my site. It feels much more instant than writing a full post! 🚀
```

- [ ] **Step 3: Commit**

```bash
git add src/content.config.ts src/content/thoughts/2026-04-15.md
git commit -m "feat: add thoughts content collection and sample data"
```

---

### Task 2: Thought Component

**Files:**
- Create: `src/components/Thought.astro`

- [ ] **Step 1: Create the `Thought` component for rendering a single entry**

```astro
---
// src/components/Thought.astro
import { render } from 'astro:content';
import { humanize } from '../utils/date';

const { thought } = Astro.props;
const { Content } = await render(thought);
---

<div class="py-4 border-b border-gray-100 last:border-0">
  <div class="flex items-center justify-between mb-2">
    <time class="text-xs text-gray-500 font-mono" datetime={thought.data.date.toISOString()}>
      {humanize(thought.data.date)}
    </time>
    {thought.data.tags && (
      <div class="flex gap-2">
        {thought.data.tags.map(tag => (
          <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 font-mono">#{tag}</span>
        ))}
      </div>
    )}
  </div>

  <div class="prose prose-sm max-w-none text-gray-800 leading-relaxed">
    <Content />
  </div>

  {thought.data.images && thought.data.images.length > 0 && (
    <div class={`mt-3 grid gap-2 ${thought.data.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {thought.data.images.map((img, index) => (
        <img 
          src={img.src} 
          alt={`Thought image ${index + 1}`} 
          class="rounded-sm border border-gray-200 w-full object-cover max-h-64"
        />
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Thought.astro
git commit -m "feat: add Thought component for rendering individual entries"
```

---

### Task 3: Homepage Thoughts Card

**Files:**
- Create: `src/components/cards/Thoughts.astro`

- [ ] **Step 1: Create the homepage card component**

```astro
---
// src/components/cards/Thoughts.astro
import { getCollection } from 'astro:content';
import CornerMarkers from '../CornerMarkers.astro';
import ChevronRight from '../icons/ChevronRight.astro';
import Thought from '../Thought.astro';

interface Props {
  limit?: number;
}

const { limit = 3 } = Astro.props;

const thoughts = (await getCollection('thoughts'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<div class="relative bg-white border border-gray-200 p-6 flex flex-col mb-4">
  <CornerMarkers />

  <div class="mb-4 flex items-center justify-between border-b border-gray-100 pb-4">
    <h2 class="text-lg font-semibold text-gray-900 font-mono">Thoughts</h2>
    <span class="px-2 py-0.5 text-sm bg-gray-100 text-gray-600 font-mono">
      {thoughts.length}
    </span>
  </div>

  <div class="divide-y divide-gray-50">
    {thoughts.slice(0, limit).map(thought => (
      <Thought thought={thought} />
    ))}
  </div>

  <div class="mt-4 flex justify-center pt-4 border-t border-gray-100">
    <a
      href="/thoughts"
      class="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors font-mono"
    >
      View all
      <ChevronRight class="h-3 w-3" />
    </a>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/cards/Thoughts.astro
git commit -m "feat: add Thoughts homepage card component"
```

---

### Task 4: Homepage Integration

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Integrate the Thoughts card into the homepage**

```astro
---
// src/pages/index.astro (partial update)
import Github from '../components/cards/Github.astro'
import Location from '../components/cards/Location.astro'
import Posts from '../components/cards/Posts.astro'
import Thoughts from '../components/cards/Thoughts.astro' // Add this
import Profile from '../components/cards/Profile.astro'
import Workout from '../components/cards/Workout.astro'
import X from '../components/cards/X.astro'
import Layout from '../layouts/Layout.astro'
---

<!-- ... inside the grid ... -->
        <div class="h-full lg:col-span-2">
          <Thoughts /> <!-- Add this above Posts -->
          <Posts />
        </div>
<!-- ... -->
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: integrate Thoughts card into homepage"
```

---

### Task 5: Thoughts Archive Page

**Files:**
- Create: `src/pages/thoughts/index.astro`

- [ ] **Step 1: Create the `/thoughts` archive page**

```astro
---
// src/pages/thoughts/index.astro
import { getCollection } from 'astro:content';
import Layout from '../../layouts/Layout.astro';
import Thought from '../../components/Thought.astro';
import BackToHome from '../../components/BackToHome.astro';

const thoughts = (await getCollection('thoughts'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
---

<Layout title="Thoughts — Yu Le">
  <main class="mx-auto max-w-3xl px-6 py-12 md:py-20">
    <BackToHome />
    
    <header class="mb-12 mt-8">
      <h1 class="text-3xl font-bold text-gray-900 font-mono mb-2">Thoughts</h1>
      <p class="text-gray-500">Short, instant, and casual updates.</p>
    </header>

    <div class="space-y-8">
      {thoughts.map(thought => (
        <div class="bg-white border border-gray-100 p-6 relative">
          <Thought thought={thought} />
        </div>
      ))}
    </div>
  </main>
</Layout>
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/thoughts/index.astro
git commit -m "feat: add thoughts archive page"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Start dev server and verify homepage**

Run: `pnpm dev`
Check: `http://localhost:4321` - Verify "Thoughts" card is visible above "Posts".

- [ ] **Step 2: Verify `/thoughts` page**

Check: `http://localhost:4321/thoughts` - Verify all thoughts are listed.

- [ ] **Step 3: Verify image grid**

Add a second image to `src/content/thoughts/2026-04-15.md` and verify the grid layout in the UI.
