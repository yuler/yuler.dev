import { defineConfig } from 'astro/config';
import mdx from "@astrojs/mdx";
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://yuler.dev',

  integrations: [
    mdx({
      syntaxHighlight: 'shiki',
      shikiConfig: { theme: 'dracula', },
      // remarkPlugins: [remarkToc],
      // rehypePlugins: [rehypeMinifyHtml],
      remarkRehype: { footnoteLabel: 'Footnotes' },
      gfm: true,
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});