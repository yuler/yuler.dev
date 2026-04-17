import { getCollection } from 'astro:content'

export async function getSortedThoughts() {
  const thoughts = await getCollection('thoughts')
  return thoughts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}
