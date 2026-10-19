import { defineConfig } from 'astro/config';

// Адрес сайта поменяем, когда будет домен.
export default defineConfig({
  site: 'https://example.com',
  build: { inlineStylesheets: 'auto' },
});
