// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
// Set PUBLIC_SITE_URL in .env to the production origin (used for canonicals, OG and the sitemap).
const site = env.PUBLIC_SITE_URL || 'https://www.example.com';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  integrations: [mdx(), sitemap()],
});
