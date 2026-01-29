import { writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const slug = process.argv[2] || 'new-post'
const dir = join(fileURLToPath(import.meta.url), '..', '..', 'src', 'content', 'posts')
const path = join(dir, `${slug}.md`)
const date = new Date().toISOString().slice(0, 10)

const content = `---
title: ''
description: ''
tags: []
date: ${date}
draft: true
---

`

writeFileSync(path, content, 'utf8')
console.log(`Created ${path}`)
