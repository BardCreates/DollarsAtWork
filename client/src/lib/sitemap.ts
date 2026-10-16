/**
 * sitemap.xml for search engines, written at build time by the plugin in vite.config.ts.
 * Pure: no browser or Node APIs, so both the build and the tests can use it.
 */

export const SITE_URL = 'https://dollarsatwork.app';

/** Every page open to visitors that is worth finding in search. App pages and sign-in screens are left out. */
export const PUBLIC_PATHS = ['/', '/pricing', '/tools', '/demo', '/blog', '/help', '/security', '/affiliates', '/terms', '/privacy'] as const;

const POST_FILE = /(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/;

/**
 * The published posts among the blog's Markdown files (see features/blog/posts.ts for the format), as
 * { slug, date }. A file that isn't a valid post name, or says draft: true, is left out.
 */
export function publishedPosts(files: Record<string, string>): { slug: string; date: string }[] {
  return Object.entries(files).flatMap(([path, raw]) => {
    const name = POST_FILE.exec(path);
    if (!name) return [];
    const head = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw)?.[1] ?? '';
    if (/^\s*draft:\s*["']?(true|yes)["']?\s*$/im.test(head)) return [];
    const date = /^\s*date:\s*["']?(\d{4}-\d{2}-\d{2})/im.exec(head)?.[1] ?? name[1];
    return [{ slug: name[2], date }];
  });
}

/** The sitemap: the public pages, then one entry per published post with its date. */
export function buildSitemap(posts: { slug: string; date: string }[]): string {
  const entry = (path: string, lastmod?: string) =>
    `  <url><loc>${SITE_URL}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
  const sorted = [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PUBLIC_PATHS.map((path) => entry(path)),
    ...sorted.map((post) => entry(`/blog/${post.slug}`, post.date)),
    '</urlset>',
    '',
  ].join('\n');
}
