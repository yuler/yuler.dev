---
name: sync-strava
description: Incrementally backfill yuler.dev Strava activities when the official API app is inactive. Uses a logged-in browser to export official GPX for activities missing from data/strava/activities, then runs pnpm import:strava:gpx. Use when the user wants to sync, update, or backfill Strava workouts on this site without the API.
disable-model-invocation: false
---

# sync-strava

Local incremental backfill for `data/strava/activities`. The hourly GitHub Action stays off. The official Strava API stays unused.

Deterministic cleaning lives in [`scripts/import-strava-gpx.mjs`](../../../scripts/import-strava-gpx.mjs) (`pnpm import:strava:gpx`). This document is only the browser session, which changes.

## Do not

- Call the Strava API (`src/utils/strava.ts`, `pnpm sync:strava:activities`, `pnpm strava`). The app is Inactive without a subscription.
- Run `gh workflow enable sync-strava.yml`.
- Request or reuse a pasted `curl`, `_strava4_session`, or `x-csrf-token`. Do not write cookies or a browser profile into the repo. Do not copy or decrypt cookies out of the default browser into another one.
- Call `https://www.strava.com/athlete/training_activities`. Read activity links from the training page instead.
- `git commit` unless the user asks.

## Browser

Use the system default browser, the one already logged into Strava. Do not launch a second browser, Chrome for Testing, or a private profile.

```bash
xdg-settings get default-web-browser   # google-chrome.desktop
```

Load `agent-browser skills get core` before the first command. Attach to that running browser and open My Activities in a new tab. `--download-path` is `tmp/strava` in this repo (`tmp/` is gitignored).

```bash
export AGENT_BROWSER_SESSION=strava-sync
agent-browser --session "$AGENT_BROWSER_SESSION" --auto-connect --pin-tab \
  --download-path "$PWD/tmp/strava" \
  tab new https://www.strava.com/athlete/training
```

Do not pass `--profile`, `--executable-path`, or a user-data-dir. Do not create `~/.local/share/yuler-dev/strava-chrome`.

If `--auto-connect` reports no running Chrome, the default browser was not started with remote debugging. Stop. Ask the user to quit that browser and start it again with `--remote-debugging-port=9222` so the existing profile and Strava login stay, then attach with `--auto-connect`. Do not open a login window in a new profile.

If the new tab is a login screen, stop. The attached browser is not the logged-in default browser. Continue only after My Activities is visible. Close that tab when finished. Leave the user's other tabs open.

## Which activities

Read ids already in `data/strava/activities/_index.json`.

On My Activities, ids come from links whose path is `/activities/{id}` (ignore `/edit` and share links). The list is newest first.

Walk from the top. An id with no local `{id}.json` is missing. Stop at the first id that is already in the index, and do not open the next page after that. If every id on the current page is missing, go to the next page and keep going. A late upload of an older activity below the first known id is left behind.

If nothing is missing, stop. Do not run the importer.

## For each missing id

1. Save the official GPX to `tmp/strava/{id}.gpx` by downloading `https://www.strava.com/activities/{id}/export_gpx` from the logged-in page (an `<a download>` clicked with `agent-browser download`). Do not parse the internal streams API.
2. Open `https://www.strava.com/activities/{id}` and append one JSON object to `tmp/strava/page-stats.jsonl`:

```json
{"id":20579892718,"name":"Evening Ride","type":"Ride","distance":7768.2,"moving_time":2196,"elev_gain":13.4673,"startDateLocal":1792001452}
```

Take `type`, `distance`, `moving_time`, `elev_gain`, and `startDateLocal` from `window.pageView._activity.attributes`. `startDateLocal` is the page's unix seconds. `name` is the visible title. One object per line, not a quoted string. If `startDateLocal` is absent, omit it. The script then uses the GPX timestamp plus 8 hours.

`type` must be the page value (`Ride`, `Run`), not the GPX word (`cycling`, `running`).

## Import

```bash
pnpm import:strava:gpx
```

The script writes `{id}.json`, appends new ids to `_index.json`, and advances `_meta.json` `lastSync`. It rewrites a previous GPX import. It leaves API files that still have `resource_state` alone. GPX supplies the polyline, heart rate, elapsed time, and max speed. Page stats supply distance, moving time, elevation gain, name, sport, and local start. Imported files have an empty `device_name` and `calories: 0`. A GPX without heart rate leaves heart rate off.

Report the script's added lines. Do not commit them.
