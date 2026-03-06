// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://savingkc.com',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Silo sitemaps are manually generated via scripts/generate-sitemaps.mjs
      // and placed in public/. Disable auto-generation to avoid conflict.
      filter: () => false,
    }),
  ],
});
