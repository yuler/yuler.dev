---
name: sync-strava
description: Sync yuler.dev Strava activities with the pnpm strava scripts. Use when the user wants to sync, update, or backfill Strava workouts. Run pnpm strava:login to open the browser; if login fails, stop and ask the user to log in; if it succeeds, run pnpm strava:export and commit the new activity files.
---

# sync-strava

Sync with the pnpm scripts only: `pnpm strava:login`, then `pnpm strava:export`. Export imports what it downloaded. Leave every `legacy:` Strava script alone.

## Run

1. Run `pnpm strava:login`.

   The script opens Strava in the default browser and waits. Leave the Enter prompt for the user.

   Done when the process exits.

   - Exit 0: logged in. Continue.
   - Any other exit: tell the user to log in on the opened page, then stop. Do not export.

2. Run `pnpm strava:export`.

   Done when the process exits 0. If it asks for login again, tell the user to log in and stop. Do not retry in this run.

3. Commit when `data/strava/activities` has changes. Use the git-commit skill. If the export reported no new activities, skip the commit.

   Done when those activity files are committed, or when there was nothing to commit.
