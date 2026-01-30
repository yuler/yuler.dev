import { defineConfig } from 'astro/config';
import mdx from "@astrojs/mdx";
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});