import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { marked } from 'marked'

export interface SlideItem {
  index: number
  title: string
  frontmatter: Record<string, string>
  content: string
  html: string
  notes: string
}

export interface SlideDeck {
  slug: string
  title: string
  description?: string
  frontmatter: Record<string, unknown>
  slides: SlideItem[]
  slideCount: number
}

// Custom marked renderer adjustments if needed
marked.setOptions({
  gfm: true,
  breaks: false,
})

export function parseSlidevContent(content: string, slug: string): { frontmatter: Record<string, unknown>, slides: SlideItem[] } {
  const lines = content.split('\n')
  const globalFrontmatter: Record<string, unknown> = {}
  let startIdx = 0

  if (lines[0]?.trim() === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        const fmBlock = lines.slice(1, i).join('\n')
        fmBlock.split('\n').forEach((l) => {
          const colonIdx = l.indexOf(':')
          if (colonIdx > 0) {
            const key = l.slice(0, colonIdx).trim()
            const val = l.slice(colonIdx + 1).trim()
            globalFrontmatter[key] = val
          }
        })
        startIdx = i + 1
        break
      }
    }
  }

  const rawRest = lines.slice(startIdx).join('\n')
  const rawBlocks = rawRest.split(/\n---\s*\n/)
  const slides: SlideItem[] = []

  for (let i = 0; i < rawBlocks.length; i++) {
    const block = rawBlocks[i].trim()
    if (!block)
      continue

    const slideFrontmatter: Record<string, string> = {}
    let slideContent = block

    // Check if this block is slide-level frontmatter (e.g. layout: default)
    if (/^(?:layout|class|transition|background):/m.test(block) && !block.includes('#') && i + 1 < rawBlocks.length) {
      block.split('\n').forEach((l) => {
        const colonIdx = l.indexOf(':')
        if (colonIdx > 0) {
          const key = l.slice(0, colonIdx).trim()
          const val = l.slice(colonIdx + 1).trim()
          slideFrontmatter[key] = val
        }
      })
      i++
      slideContent = rawBlocks[i].trim()
    }

    // Extract speaker notes <!-- ... -->
    const notesMatch = slideContent.match(/<!--([\s\S]*?)-->/)
    const notes = notesMatch ? notesMatch[1].trim() : ''
    let cleanContent = slideContent.replace(/<!--[\s\S]*?-->/g, '').trim()

    // Normalize relative image paths ./images/... -> /slides/{slug}/images/...
    cleanContent = cleanContent.replace(/src=["']\.\/images\/([^"']+)["']/g, `src="/slides/${slug}/images/$1"`)
    cleanContent = cleanContent.replace(/src=["']images\/([^"']+)["']/g, `src="/slides/${slug}/images/$1"`)

    // Extract title (first # heading)
    const headingLine = cleanContent.split('\n').find(line => line.startsWith('# '))
    const title = headingLine ? headingLine.replace(/^#\s+/, '').trim() : `Slide ${slides.length + 1}`

    // Parse markdown to HTML
    const html = marked.parse(cleanContent) as string

    slides.push({
      index: slides.length + 1,
      title,
      frontmatter: slideFrontmatter,
      content: cleanContent,
      html,
      notes,
    })
  }

  return { frontmatter: globalFrontmatter, slides }
}

export async function getAllSlideDecks(): Promise<SlideDeck[]> {
  const slidesDir = path.resolve(process.cwd(), 'src/content/slides')
  try {
    const entries = await fs.readdir(slidesDir, { withFileTypes: true })
    const decks: SlideDeck[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const slideFilePath = path.join(slidesDir, entry.name, 'slides.md')
        try {
          const content = await fs.readFile(slideFilePath, 'utf-8')
          const { frontmatter, slides } = parseSlidevContent(content, entry.name)
          const title = (frontmatter.title as string) || entry.name
          const description = (frontmatter.description as string) || (frontmatter.info as string) || ''

          decks.push({
            slug: entry.name,
            title,
            description,
            frontmatter,
            slides,
            slideCount: slides.length,
          })
        }
        catch {
          // No slides.md in this directory
        }
      }
    }

    return decks
  }
  catch {
    return []
  }
}

export async function getSlideDeckBySlug(slug: string): Promise<SlideDeck | null> {
  const slideFilePath = path.resolve(process.cwd(), 'src/content/slides', slug, 'slides.md')
  try {
    const content = await fs.readFile(slideFilePath, 'utf-8')
    const { frontmatter, slides } = parseSlidevContent(content, slug)
    const title = (frontmatter.title as string) || slug
    const description = (frontmatter.description as string) || (frontmatter.info as string) || ''

    return {
      slug,
      title,
      description,
      frontmatter,
      slides,
      slideCount: slides.length,
    }
  }
  catch {
    return null
  }
}
