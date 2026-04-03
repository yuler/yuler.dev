import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

function normalizeSlug(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function readSlugFromStdin() {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question('Post slug (e.g. "my-new-post"): ')
    return answer
  }
  finally {
    rl.close()
  }
}

const dateObj = new Date()
const date = dateObj.toISOString().slice(0, 10)
const year = String(dateObj.getFullYear())

let slug = process.argv[2]
if (!slug) {
  slug = await readSlugFromStdin()
}
slug = normalizeSlug(slug)

if (!slug) {
  console.error('Missing slug.')
  console.error('Tip: pnpm create-post my-new-post')
  process.exit(1)
}

const dir = join(fileURLToPath(import.meta.url), '..', '..', 'src', 'content', 'posts', year)
const path = join(dir, `${slug}.md`)

const content = `---
title: ''
description: ''
tags: []
date: ${date}
draft: true
---

`

mkdirSync(dir, { recursive: true })

if (existsSync(path)) {
  console.error(`Already exists: ${path}`)
  console.error('Tip: pick a different slug, e.g. "my-post-v2"')
  process.exit(1)
}

writeFileSync(path, content, 'utf8')
console.log(`Created ${path}`)
