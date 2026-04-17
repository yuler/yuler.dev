import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'

const postsCollection = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z
      .object({
        url: z.string(),
        alt: z.string(),
      })
      .optional(),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
    wip: z.boolean().optional(),
  }),
})

const thoughtsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: ({ image }) =>
    z.object({
      date: z.date(),
      images: z.array(image()).max(3).optional(),
      tags: z.array(z.string()).max(3).optional(),
    }),
})

export const collections = {
  posts: postsCollection,
  thoughts: thoughtsCollection,
}
