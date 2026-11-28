import { SECURITY_TXT } from '../../lib/security-txt.mjs';

// The static-asset layer does not serve paths under a dot directory, so the
// well-known policy is also a Worker route: whatever serves the request, the
// file answers 200 as text/plain.
export const prerender = false;

export const GET = () => new Response(SECURITY_TXT, {
  status: 200,
  headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600'
  }
});
