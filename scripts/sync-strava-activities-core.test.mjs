import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { syncActivities } from './sync-strava-activities-core.mjs'

const tmpDirs = []

function makeActivitiesDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'strava-sync-'))
  tmpDirs.push(dir)
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

describe('syncActivities', () => {
  it('discovers late-uploaded activities whose start date predates the checkpoint', async () => {
    const activitiesDir = makeActivitiesDir()
    writeJson(path.join(activitiesDir, '_index.json'), [200])
    writeJson(path.join(activitiesDir, '_meta.json'), { lastSync: 1_700_000_000 })
    writeJson(path.join(activitiesDir, '200.json'), {
      id: 200,
      start_date: '2023-11-14T22:13:20Z',
    })

    const listCalls = []
    const lateUploadedActivity = {
      id: 100,
      start_date: '2023-01-01T00:00:00Z',
    }
    const knownActivity = {
      id: 200,
      start_date: '2023-11-14T22:13:20Z',
    }

    await syncActivities({
      activitiesDir,
      getStravaActivities: async (options) => {
        listCalls.push(options)
        return listCalls.length === 1 ? [knownActivity, lateUploadedActivity] : []
      },
      getStravaActivityById: async id => ({
        id,
        start_date: lateUploadedActivity.start_date,
        detail: true,
      }),
      logger: { log() {} },
    })

    expect(listCalls[0]).not.toHaveProperty('after')
    expect(readJson(path.join(activitiesDir, '_index.json'))).toEqual([200, 100])
    expect(readJson(path.join(activitiesDir, '100.json'))).toMatchObject({
      id: 100,
      detail: true,
    })
  })

  it('repairs the index when activity details already exist locally', async () => {
    const activitiesDir = makeActivitiesDir()
    writeJson(path.join(activitiesDir, '_index.json'), [])
    writeJson(path.join(activitiesDir, '100.json'), {
      id: 100,
      start_date: '2023-01-01T00:00:00Z',
    })

    let detailFetches = 0

    await syncActivities({
      activitiesDir,
      getStravaActivities: async () => [{
        id: 100,
        start_date: '2023-01-01T00:00:00Z',
      }],
      getStravaActivityById: async (id) => {
        detailFetches++
        return { id }
      },
      logger: { log() {} },
    })

    expect(detailFetches).toBe(0)
    expect(readJson(path.join(activitiesDir, '_index.json'))).toEqual([100])
  })
})
