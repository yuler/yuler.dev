---
name: create-thought
description: Adds or edits short-form thoughts under src/content/thoughts for yuler.dev. Keeps the body brief and simple. Sets date to the current day, auto-assigns up to three tags, and tightens prose, images, and links. Use when the user wants a new thought, a quick note on /thoughts, or to polish thought markdown before commit.
disable-model-invocation: false
---

# create-thought

## Scope

Thoughts live in the Astro content collection `thoughts` ([`src/content.config.ts`](../../../src/content.config.ts)): Markdown only, schema `date` (required), `tags` (optional, **max 3** strings), `images` (optional, **max 3** local images). Rendering: [`src/components/Thought.astro`](../../../src/components/Thought.astro).

## User requirements (always apply)

- **Date is current date** — Use the session’s authoritative calendar date (e.g. user_info “Today’s date” in Cursor). Encode `date` in frontmatter as an ISO 8601 instant, e.g. `2026-05-11T12:00:00Z`, so `z.date()` parses reliably.
- **Auto assign tags** — After the body is settled, infer **0–3** tags from themes, products, technologies, or domains mentioned. Rules below.
- **Optimize content, images, links** — Follow the optimization sections before saving. The body stays **short and simple** (see Optimize content); do not write long-form or essay-style copy unless the user explicitly asks for it.

## File naming

- Default path: `src/content/thoughts/YYYY-MM-DD.md` using the **same** calendar date as `date` (UTC date from that instant is fine if you keep filename and `date` consistent).
- If that file already exists, use `src/content/thoughts/YYYY-MM-DD-<short-slug>.md` where `<short-slug>` is a minimal kebab-case hint (e.g. `api-design`).

## Frontmatter template

```yaml
---
date: 2026-05-11T12:00:00Z
tags: ["tag-one", "tag-two"]
---
```

- Omit `tags` entirely if nothing specific fits (tags are optional).
- Omit `images` unless adding local assets (see Images).

## Auto-assign tags

1. **Cap:** Never more than **three** tags (schema hard limit).
2. **Shape:** Lowercase, kebab-case (`ai-agents`, `astro`), no `#` in YAML (the UI prefixes `#` when displaying).
3. **Sources:** Prefer concrete nouns from the thought (tools, frameworks, people, places) over generic words (`thought`, `note`, `update`).
4. **Dedupe:** One tag per theme; drop near-duplicates (`react` vs `reactjs` → pick one).
5. If the body is too thin to infer tags, use **zero** tags rather than vague filler.

## Optimize content

- **Length and shape** — A thought is a quick note, not a post. Default to a **few tight sentences** or **one short paragraph** (roughly under ~120 words) unless the user clearly wants more. Use plain, simple wording; skip background, long lists, and nested asides—those belong in `src/content/posts` or a dedicated page.
- Keep tone direct; cut hedging and repetition.
- Prefer short paragraphs; one idea per paragraph unless a list is clearer.
- Avoid a title in frontmatter (thoughts have no title field); let the opening sentence carry the hook.
- After edits, run `pnpm autocorrect` on the file when available (repo convention for content).

## Optimize links

- Use descriptive link text: `[Astro image docs](https://...)` not `[here](https://...)`.
- External URLs: `https://`, remove obvious tracking query params when you touch the URL.
- Same-site references: prefer root-relative paths (`/thoughts`, `/posts/...`) instead of full `https://yuler.dev/...` when linking within the site.

## Workflow checklist

1. Resolve **today’s date** from session context; pick `YYYY-MM-DD` and an ISO `date` value.
2. Choose path; avoid overwriting an existing thought unless the user asked to edit it.
3. Draft a **minimal** body from the user’s intent (brevity rules above); apply **content** optimizations.
4. Assign **0–3 tags** with the rules above; drop `tags` key if empty.
5. Add **`images`** only with valid relative paths and ≤3 items; otherwise omit the key.
6. Normalize **links** in the body.
7. Run `pnpm build` if you changed frontmatter shapes or image paths (catches collection errors).

## Verification

- `pnpm build` succeeds.
- For visual check: `pnpm dev` → `/thoughts`.
