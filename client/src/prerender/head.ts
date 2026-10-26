/**
 * The served HTML of a pre-rendered public page: the built index.html with that page's own title, description,
 * link-preview tags, canonical address and structured data, and the page's text inside #root.
 * Pure (strings in, string out), so the build and the tests share it.
 */

import { SITE_URL } from '../lib/sitemap';

export const SITE_NAME = 'Dollars at Work';

export interface Crumb {
  name: string;
  path: string;
}

export interface PageHead {
  /** "/", "/pricing", "/blog/some-post" */
  path: string;
  /** The full title, as the browser tab shows it. */
  title: string;
  description: string;
  type: 'website' | 'article';
  /** Home first, this page last. */
  crumbs: Crumb[];
  /** Extra JSON-LD objects (Article on posts). The BreadcrumbList is added from crumbs. */
  jsonLd?: object[];
}

/** The one address search engines should use for a page: no trailing slash, no query. */
export function canonicalUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : SITE_URL + path.replace(/\/+$/, '');
}

export function breadcrumbList(crumbs: Crumb[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  };
}

export function articleJsonLd(post: { slug: string; title: string; summary: string; date: string; tags: string[] }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    dateModified: post.date,
    keywords: post.tags.join(', ') || undefined,
    image: `${SITE_URL}/og-image.png`,
    mainEntityOfPage: canonicalUrl(`/blog/${post.slug}`),
    author: { '@type': 'Organization', name: SITE_NAME, url: `${SITE_URL}/` },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/mascot.png` },
    },
  };
}

export function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** JSON that can sit inside a <script> tag: "</script>" in a title can't end it early. */
function scriptJson(value: object): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** The tags the shell carries for every page; each pre-rendered page replaces them with its own. */
const REPLACED = [
  /\s*<title>[\s\S]*?<\/title>/,
  /\s*<meta name="description"[^>]*>/,
  /\s*<meta property="og:type"[^>]*>/,
  /\s*<meta property="og:title"[^>]*>/,
  /\s*<meta property="og:description"[^>]*>/,
  /\s*<meta name="twitter:title"[^>]*>/,
  /\s*<meta name="twitter:description"[^>]*>/,
];

const ROOT = '<div id="root"></div>';

/**
 * The finished document for one page. Throws when the shell no longer looks as expected, so a changed
 * index.html fails the build instead of quietly shipping pages without their tags.
 */
export function renderDocument(shell: string, head: PageHead, bodyHtml: string): string {
  let html = shell;
  for (const pattern of REPLACED) {
    if (!pattern.test(html)) throw new Error(`index.html is missing ${pattern.source}; the pre-renderer needs it`);
    html = html.replace(pattern, '');
  }
  if (!html.includes(ROOT)) throw new Error(`index.html is missing ${ROOT}`);
  if (!html.includes('</head>')) throw new Error('index.html is missing </head>');

  const url = canonicalUrl(head.path);
  const title = escapeAttribute(head.title);
  const description = escapeAttribute(head.description);
  const jsonLd = [...(head.jsonLd ?? []), breadcrumbList(head.crumbs)];
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${escapeAttribute(url)}" />`,
    `<meta property="og:type" content="${head.type}" />`,
    `<meta property="og:url" content="${escapeAttribute(url)}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    ...jsonLd.map((item) => `<script type="application/ld+json">${scriptJson(item)}</script>`),
  ];

  // Function replacements, so a "$&" or "$1" in the page text (it's a money site) is never read as a pattern.
  return html
    .replace(/\s*<\/head>/, () => `\n    ${tags.join('\n    ')}\n  </head>`)
    .replace(ROOT, () => `<div id="root">${bodyHtml}</div>`);
}
