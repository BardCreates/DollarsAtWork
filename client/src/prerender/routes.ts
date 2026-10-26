/**
 * Every public page that is pre-rendered at build time, with what its head needs beyond the title and
 * description the page itself sets (usePageMeta). App pages and sign-in screens stay client-rendered.
 */

import type { BlogPost } from '../features/blog/posts';
import type { HelpArticle } from '../features/help/articles';
import { PUBLIC_PATHS } from '../lib/sitemap';
import type { Crumb } from './head';

export interface PublicRoute {
  path: string;
  type: 'website' | 'article';
  /** Breadcrumbs above this page (Home first); the page itself is added with its own name. */
  parents: Crumb[];
  /** Short name in the breadcrumb trail. */
  name: string;
  post?: BlogPost;
}

const HOME: Crumb = { name: 'Dollars at Work', path: '/' };

/** Short names for the fixed pages' breadcrumbs. */
const PAGE_NAMES: Record<(typeof PUBLIC_PATHS)[number], string> = {
  '/': 'Dollars at Work',
  '/pricing': 'Pricing',
  '/tools': 'Calculators',
  '/demo': 'Demo',
  '/blog': 'Blog',
  '/help': 'Help',
  '/security': 'Security',
  '/affiliates': 'Affiliates',
  '/terms': 'Terms of Service',
  '/privacy': 'Privacy Policy',
};

export function publicRoutes(posts: BlogPost[], articles: HelpArticle[]): PublicRoute[] {
  return [
    ...PUBLIC_PATHS.map(
      (path): PublicRoute => ({ path, type: 'website', parents: path === '/' ? [] : [HOME], name: PAGE_NAMES[path] }),
    ),
    ...articles.map(
      (article): PublicRoute => ({
        path: `/help/${article.slug}`,
        type: 'website',
        parents: [HOME, { name: 'Help', path: '/help' }],
        name: article.title,
      }),
    ),
    ...posts
      .filter((post) => !post.draft)
      .map(
        (post): PublicRoute => ({
          path: `/blog/${post.slug}`,
          type: 'article',
          parents: [HOME, { name: 'Blog', path: '/blog' }],
          name: post.title,
          post,
        }),
      ),
  ];
}

/** Where a page's file goes in the build: "/" is index.html, "/blog/x" is blog/x/index.html. */
export function outputFile(path: string): string {
  return path === '/' ? 'index.html' : `${path.replace(/^\/+|\/+$/g, '')}/index.html`;
}
