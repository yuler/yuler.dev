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

Every commit needs to invoke the `/git-commit` skill.
