# Agent instructions (yuler.dev)

Personal site at https://yuler.dev — Astro 5, MDX, Tailwind CSS 4, TypeScript. Package manager: **pnpm**.

## Setup & Commands

- Use the Node.js version specified in `.nvmrc`.
- Run `pnpm install` and `pnpm dev` to start the local dev server.
- Use `pnpm create:post` to quickly scaffold a new post.
- Run `pnpm autocorrect` to format post content files.
- Use `pnpm export:pdf` to export PDF for a specific post.
- Run `pnpm sync:strava:activities` to sync Strava activities to local data.

## Icons

Every icons should a simple astro component locate in [`src/components/icons`](./src/components/)

## Git Commit

Use the `/git-commit` skill for every commit. Check in this order:

- Local: `skills/git-commit` (this repo)
- Global: `~/.agents/skills/git-commit`

If neither exists, install it from [skills/git-commit](https://github.com/yuler/skills/tree/main/skills/git-commit).
