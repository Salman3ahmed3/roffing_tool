// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// Production origin: used for canonical URLs, Open Graph, JSON-LD, the sitemap and robots.txt.
const site = 'https://exteriormath.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],
});
