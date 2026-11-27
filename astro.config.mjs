import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare({ imageService: 'passthrough' }),
  output: 'static',
  session: false,
  markdown: {
    // Plain code blocks: the strict content security policy allows no inline
    // styles, which the default syntax highlighter would emit.
    syntaxHighlight: false
  },
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
