export async function GET() {
  const SITE_ORIGIN = process.env.SITE_ORIGIN ?? 'https://vidoxlabs.com';
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
