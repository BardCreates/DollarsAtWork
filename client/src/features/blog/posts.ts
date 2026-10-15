import { wordCount } from './markdown';

/**
 * Blog posts are Markdown files in client/src/content/blog, named YYYY-MM-DD-the-slug.md, each starting with:
 *
 *   ---
 *   title: The headline
 *   date: 2026-10-15
 *   summary: One or two sentences for the list and for search engines (under 160 characters).
 *   tags: debt, budgeting
 *   draft: true
 *   ---
 *
 * A post with draft: true is left out of the live site (it still shows when running locally, marked Draft).
 * To publish, set draft: false, or remove the line, and merge.
 */

export interface BlogPost {
  slug: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  summary: string;
  tags: string[];
  draft: boolean;
  body: string;
  minutes: number;
}

const FILE_NAME = /(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.md$/;

/** Reads a post file: the post, or the reason the file isn't a valid one. */
export function parsePost(path: string, raw: string): { post: BlogPost } | { error: string } {
  const name = FILE_NAME.exec(path);
  if (!name) return { error: `${path}: name it YYYY-MM-DD-slug.md, lower-case, dashes only` };

  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { error: `${path}: starts without the --- block of title, date and summary` };

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([a-z]+):\s*(.*)$/.exec(line.trim());
    if (field) fields[field[1]] = field[2].replace(/^["']|["']$/g, '').trim();
  }

  const date = fields.date ?? name[1];
  if (!fields.title) return { error: `${path}: needs a title` };
  if (!fields.summary) return { error: `${path}: needs a summary` };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) return { error: `${path}: date must be YYYY-MM-DD` };

  const body = match[2].trim();
  return {
    post: {
      slug: name[2],
      title: fields.title,
      date,
      summary: fields.summary,
      tags: (fields.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      draft: /^(true|yes)$/i.test(fields.draft ?? ''),
      body,
      minutes: Math.max(1, Math.round(wordCount(body) / 220)),
    },
  };
}

/** Newest first; posts on the same day keep a stable order by title. */
export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

const files = import.meta.glob('../../content/blog/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const parsed = Object.entries(files).map(([path, raw]) => parsePost(path, raw));

/** Every post file, drafts included. Used by the tests; the pages use visiblePosts. */
export const ALL_POSTS: BlogPost[] = sortPosts(parsed.flatMap((p) => ('post' in p ? [p.post] : [])));

/** Problems with post files, so a test can fail loudly instead of a post silently disappearing. */
export const POST_ERRORS: string[] = parsed.flatMap((p) => ('error' in p ? [p.error] : []));

/** What the site shows: published posts, plus drafts when running locally. */
export const visiblePosts: BlogPost[] = ALL_POSTS.filter((p) => !p.draft || import.meta.env.DEV);

export function findPost(slug: string | undefined): BlogPost | undefined {
  return visiblePosts.find((p) => p.slug === slug);
}

/** "October 15, 2026", read as a calendar date so no time zone can shift it a day. */
export function formatPostDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
