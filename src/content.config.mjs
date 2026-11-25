// @ts-ignore Astro provides this virtual module at build time.
import { defineCollection } from 'astro:content';
import { docsLoader } from './content/docs-loader.mjs';

export const collections = {
  docs: defineCollection({ loader: docsLoader() })
};
