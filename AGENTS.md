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

## Cursor Cloud specific instructions

- **Node.js**: `.nvmrc` specifies `v24`. Use `source ~/.nvm/nvm.sh && nvm use 24` before running any commands.
- **sharp build approval**: `package.json` includes `pnpm.onlyBuiltDependencies` to allow `sharp` and `esbuild` postinstall scripts. Without this, `pnpm install` will warn about ignored build scripts and image optimization will fail.
- **Dev server**: `pnpm dev --host 0.0.0.0` starts Astro on port 4321. No external services (databases, APIs) are required for local development.
- **Lint/check**: `pnpm check` runs `astro check` (TypeScript diagnostics). There are no separate ESLint or Prettier configs.
- **Build**: `pnpm build` runs `astro check && astro build`. Output goes to `dist/`.
- **No automated test suite**: This project has no unit/integration test framework configured. Validation is done via `pnpm check` and `pnpm build`.
