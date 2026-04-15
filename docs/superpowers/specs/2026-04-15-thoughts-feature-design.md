# Design Spec: "Thoughts" Microblog Feature

A Twitter-like microblogging feature for `yuler.dev` that allows for short, instant, and casual updates.

## Goals
- Provide a space for short-form content that doesn't fit the "Post" format.
- Support instant updates (micro-posts).
- Maintain the site's minimalist, technical aesthetic.

## Content Structure

### File System
- **Path:** `src/content/thoughts/`
- **Filename Rule:** `YYYY-MM-DD.md` or `YYYY-MM-DD-n.md` for multiple entries on the same day.

### Schema (`src/content.config.ts`)
```typescript
const thoughtsCollection = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/thoughts' }),
  schema: ({ image }) => z.object({
    date: z.date(),
    images: z.array(image()).max(3).optional(),
    tags: z.array(z.string()).max(3).optional(),
  }),
})
```

### Content Constraints
- **Text:** Primary content is the Markdown body.
- **Images:** Maximum 3 images per thought.
- **Tags:** Maximum 3 tags per thought.
- **Links:** Pure text links should be automatically converted to clickable elements.

## User Interface

### Homepage Integration
- **Component:** `src/components/cards/Thoughts.astro`
- **Location:** Right column, above the "Posts" card.
- **Display:** Shows the 3-5 most recent thoughts in a feed format.
- **Style:** Matches `Posts.astro` (white background, gray border, `CornerMarkers`).

### Thoughts Feed Page
- **Route:** `/thoughts`
- **Layout:** A clean, vertical chronological stream of all thoughts.
- **Navigation:** Accessible via a "View all" button on the Homepage card.

## Technical Details
- **Date Display:** Use `humanize` utility (e.g., "2 hours ago") for recent thoughts.
- **Rendering:** Use standard Astro `<Content />` or a simple Markdown parser for the thought body.
- **Responsive Design:** Image grid should adapt (1-col for 1 image, 2-col or grid for 2-3 images).

## Testing Strategy
- Create mock thoughts with 0, 1, 2, and 3 images to verify grid layouts.
- Verify that links in plain text are correctly rendered.
- Ensure the "View all" link navigates correctly to `/thoughts`.
