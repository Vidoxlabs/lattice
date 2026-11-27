// @ts-ignore Astro provides this virtual module at build time.
import { defineMiddleware } from 'astro:middleware';
import { canonicalRedirect } from './lib/host.mjs';

export const onRequest = defineMiddleware(async (context, next) => {
  const destination = canonicalRedirect(context.url);
  if (destination) return context.redirect(destination, 301);
  return next();
});
