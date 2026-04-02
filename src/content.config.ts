import { z, defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'

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

export const collections = {
  posts: postsCollection,
}
