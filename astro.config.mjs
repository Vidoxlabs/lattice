import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({ imageService: 'passthrough' }),
  output: 'static',
  session: false,
  build: {
    inlineStylesheets: 'never'
  },
  vite: {
    build: {
      assetsInlineLimit: 0,
      sourcemap: false
    }
  }
});
