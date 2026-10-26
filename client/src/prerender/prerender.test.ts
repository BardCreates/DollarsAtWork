import { describe, expect, it } from 'vitest';
import { ALL_POSTS } from '../features/blog/posts';
import { HELP_ARTICLES } from '../features/help/articles';
import { PUBLIC_PATHS, SITE_URL } from '../lib/sitemap';
import { prerenderAll } from './entry';
import { canonicalUrl, renderDocument, type PageHead } from './head';
import { outputFile, publicRoutes } from './routes';

/** The parts of the real index.html the pre-renderer works with. */
const SHELL = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Generic." />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Generic title" />
    <meta property="og:description" content="Generic." />
    <meta name="twitter:title" content="Generic title" />
    <meta name="twitter:description" content="Generic." />
    <title>Dollars at Work</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const HEAD: PageHead = {
  path: '/blog/a-post',
  title: 'Pay off $5,000 "fast" · Dollars at Work',
  description: 'What $&amp; and $1 do to a <budget>.',
  type: 'article',
  crumbs: [
    { name: 'Dollars at Work', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Pay off $5,000', path: '/blog/a-post' },
  ],
  jsonLd: [{ '@type': 'Article', headline: 'Ends </script> early?' }],
};

/** The visible words of a page: tags and inline styles stripped, entities read back. */
function visibleText(html: string): string {
  const body = html.split('<div id="root">')[1] ?? '';
  return body
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ');
}

/** The first plain paragraph of a post's Markdown, without links or emphasis marks. */
function firstParagraph(body: string): string {
  const line = body.split(/\r?\n\r?\n/).find((p) => /^[A-Za-z0-9"'“]/.test(p.trim()) && !p.includes('|')) ?? '';
  return line
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('renderDocument', () => {
  const html = renderDocument(SHELL, HEAD, '<h1>Hello $& $1</h1>');

  it('swaps the generic tags for the page’s own, once each', () => {
    expect(html).toContain('<title>Pay off $5,000 &quot;fast&quot; · Dollars at Work</title>');
    expect(html).not.toContain('Generic');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
    expect(html).toContain('<meta name="description" content="What $&amp;amp; and $1 do to a &lt;budget&gt;." />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<meta name="twitter:title" content="Pay off $5,000 &quot;fast&quot; · Dollars at Work" />');
  });

  it('adds the canonical address and og:url', () => {
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/blog/a-post" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_URL}/blog/a-post" />`);
  });

  it('puts the page text inside #root exactly as rendered, dollar signs included', () => {
    expect(html).toContain('<div id="root"><h1>Hello $& $1</h1></div>');
  });

  it('adds the JSON-LD it was given plus a BreadcrumbList, safe inside a script tag', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).not.toContain('</script>');
    expect(JSON.parse(blocks[0]).headline).toBe('Ends </script> early?');
    const crumbs = JSON.parse(blocks[1]);
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement.map((i: { position: number; item: string }) => [i.position, i.item])).toEqual([
      [1, `${SITE_URL}/`],
      [2, `${SITE_URL}/blog`],
      [3, `${SITE_URL}/blog/a-post`],
    ]);
  });

  it('fails the build if index.html loses a tag it replaces', () => {
    expect(() => renderDocument(SHELL.replace(/<title>.*<\/title>/, ''), HEAD, '')).toThrow(/title/);
    expect(() => renderDocument(SHELL.replace('<div id="root"></div>', ''), HEAD, '')).toThrow(/root/);
  });
});

describe('addresses', () => {
  it('canonical addresses have no trailing slash, except the home page', () => {
    expect(canonicalUrl('/')).toBe(`${SITE_URL}/`);
    expect(canonicalUrl('/pricing')).toBe(`${SITE_URL}/pricing`);
    expect(canonicalUrl('/blog/x/')).toBe(`${SITE_URL}/blog/x`);
  });

  it('each page is written to <path>/index.html, the home page to index.html', () => {
    expect(outputFile('/')).toBe('index.html');
    expect(outputFile('/pricing')).toBe('pricing/index.html');
    expect(outputFile('/blog/some-post')).toBe('blog/some-post/index.html');
  });
});

describe('publicRoutes', () => {
  const draft = { ...ALL_POSTS[0], slug: 'not-yet', draft: true };
  const routes = publicRoutes([...ALL_POSTS, draft], HELP_ARTICLES).map((r) => r.path);

  it('covers every public page, every help article and every published post, and no drafts', () => {
    for (const path of PUBLIC_PATHS) expect(routes).toContain(path);
    for (const article of HELP_ARTICLES) expect(routes).toContain(`/help/${article.slug}`);
    for (const post of ALL_POSTS.filter((p) => !p.draft)) expect(routes).toContain(`/blog/${post.slug}`);
    expect(routes).not.toContain('/blog/not-yet');
    expect(routes).not.toContain('/sign-in');
    expect(routes).not.toContain('/plan');
  });
});

describe('the pre-rendered pages', () => {
  const pages = prerenderAll(SHELL);
  const byPath = new Map(pages.map((p) => [p.path, p]));

  it('every page has its own title and description and real text, not the empty shell', () => {
    for (const page of pages) {
      const title = /<title>([^<]*)<\/title>/.exec(page.html)?.[1];
      expect(title, page.path).toBeTruthy();
      if (page.path !== '/') expect(title, page.path).not.toBe('Dollars at Work');
      expect(page.html, page.path).not.toContain('Generic');
      expect(visibleText(page.html).split(' ').length, page.path).toBeGreaterThan(50);
    }
    const titles = pages.map((p) => /<title>([^<]*)<\/title>/.exec(p.html)?.[1]);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('every published post carries its title, summary, Article markup and the article text', () => {
    for (const post of ALL_POSTS.filter((p) => !p.draft)) {
      const page = byPath.get(`/blog/${post.slug}`);
      expect(page, post.slug).toBeDefined();
      const html = page!.html;
      expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/blog/${post.slug}" />`);
      expect(html).toContain('<meta property="og:type" content="article" />');
      expect(html).toContain('"@type":"Article"');
      expect(html).toContain(`"datePublished":"${post.date}"`);
      const text = visibleText(html);
      expect(text).toContain(post.title);
      expect(text).toContain(firstParagraph(post.body).slice(0, 80));
    }
  });

  it('pages show the visitor frame, not a loading spinner', () => {
    expect(visibleText(byPath.get('/pricing')!.html)).toContain('Start free');
    expect(visibleText(byPath.get('/')!.html)).toContain('Start your free trial');
  });
});
