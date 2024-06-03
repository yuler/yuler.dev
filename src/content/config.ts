import { z, defineCollection } from 'astro:content'

// Define a `type` and `schema` for each collection
const postsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    image: z.object({
      url: z.string(),
      alt: z.string(),
    }),
    date: z.date(),
    tags: z.array(z.string()),
    draft: z.boolean().optional(),
  }),
})

// Export a single `collections` object to register your collection(s)
export const collections = {
  posts: postsCollection,
}
