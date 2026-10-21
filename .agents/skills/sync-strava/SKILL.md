---
name: sync-strava
description: Incrementally backfill yuler.dev Strava activities when the official API app is inactive. Uses pnpm strava:login once, then pnpm strava:export to download official GPX with the saved browser session and import it. Use when the user wants to sync, update, or backfill Strava workouts on this site without the API.
disable-model-invocation: false
---

# sync-strava

Local incremental backfill for `data/strava/activities`. The official Strava API stays unused. There is no GitHub Action for this sync.

[`scripts/strava-login.mjs`](../../../scripts/strava-login.mjs) saves the browser session. [`scripts/strava-export.mjs`](../../../scripts/strava-export.mjs) reuses `tmp/strava/auth-state.json`, downloads GPX, and runs [`scripts/import-strava-gpx.mjs`](../../../scripts/import-strava-gpx.mjs).

## Do not

- Call the Strava API (`src/utils/legacy-strava.ts`, `pnpm legacy:sync:strava:activities`, `pnpm legacy:strava`). Those files are marked `@deprecated`. The app is Inactive without a subscription.
- Request or reuse a pasted `curl`, `_strava4_session`, or `x-csrf-token`. Do not copy the auth state or a browser profile into the repo. `tmp/` is gitignored.
- Call `https://www.strava.com/athlete/training_activities`. The export script reads activity links from the training page.
- `git commit` unless the user asks.

## Run

First time, or when the script says the session is gone:

```bash
pnpm strava:login
```

The script opens Strava in the current default browser. It does not launch a second browser. The user logs in there if needed. After Strava is visible, press Enter in the terminal. Only Strava cookies are saved to `tmp/strava/auth-state.json`.

Then:

```bash
pnpm strava:export
```

The script opens My Activities with that session, walks newest first, and stops at the first id already in `data/strava/activities/_index.json` or already saved as `{id}.json`. It downloads `https://www.strava.com/activities/{id}/export_gpx` to `tmp/strava/{id}.gpx`, then reads `window.pageView._activity.attributes` for `type`, `distance`, `moving_time`, `elev_gain`, and `startDateLocal`. The visible title is `name`. One JSON object per line goes to `tmp/strava/page-stats.jsonl`. If `startDateLocal` is absent, it is omitted. `type` is the page value (`Ride`, `Run`).

If the training page or a download comes back as a login page, stop and ask the user to run `pnpm strava:login` again. There is no refresh token for this session.

When at least one GPX is saved, the script runs `pnpm import:strava:gpx`. If nothing is missing, it does not import.

The importer writes `{id}.json`, appends new ids to `_index.json`, and advances `_meta.json` `lastSync`. It rewrites a previous GPX import. It leaves API files that still have `resource_state` alone. GPX supplies the polyline, heart rate, elapsed time, and max speed. Page stats supply distance, moving time, elevation gain, name, sport, and local start. Imported files have an empty `device_name` and `calories: 0`. A GPX without heart rate leaves heart rate off.

Report the importer's added lines. Do not commit them.
