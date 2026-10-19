/**
 * @deprecated 过期作废。Strava 官方 API 应用已停用，此脚本仅保留。
 * 不再由 GitHub Actions 或 CI 调用。改用 `pnpm strava:login` 与 `pnpm strava:export`。
 *
 * Usage: pnpm legacy:sync:strava:activities
 */

import process from 'node:process'
import { syncActivities } from '../src/lib/legacy-strava-core.ts'

console.warn('@deprecated 过期作废: pnpm legacy:sync:strava:activities 调用的是已停用的 Strava API。改用 pnpm strava:export。')

syncActivities().catch((err) => {
  console.error('❌ Sync failed:', err.message)
  process.exit(1)
})
