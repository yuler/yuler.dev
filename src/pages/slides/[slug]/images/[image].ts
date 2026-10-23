import type { APIRoute } from 'astro'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export async function getStaticPaths() {
  const slidesDir = path.resolve(process.cwd(), 'src/content/slides')
  try {
    const entries = await fs.readdir(slidesDir, { withFileTypes: true })
    const paths = []
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const imagesDir = path.join(slidesDir, entry.name, 'images')
        try {
          const files = await fs.readdir(imagesDir)
          for (const file of files) {
            paths.push({
              params: { slug: entry.name, image: file },
              props: { filePath: path.join(imagesDir, file) },
            })
          }
        }
        catch {
          // No images directory in this slide deck
        }
      }
    }
    return paths
  }
  catch {
    return []
  }
}

export const GET: APIRoute = async ({ props }) => {
  const file = await fs.readFile(props.filePath)
  const ext = path.extname(props.filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.gif': 'image/gif',
  }
  return new Response(file, {
    headers: {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
