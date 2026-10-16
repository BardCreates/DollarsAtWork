import { describe, expect, it } from 'vitest';
import { ALL_POSTS } from '../features/blog/posts';
import { buildSitemap, publishedPosts, PUBLIC_PATHS, SITE_URL } from './sitemap';

const files = import.meta.glob('../content/blog/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('sitemap', () => {
  it('lists exactly the published posts the blog shows', () => {
    const fromSitemap = publishedPosts(files).map((p) => p.slug).sort();
    const fromBlog = ALL_POSTS.filter((p) => !p.draft).map((p) => p.slug).sort();
    expect(fromSitemap).toEqual(fromBlog);
  });

  it('leaves out drafts and badly named files, and reads the date from the details block', () => {
    const posts = publishedPosts({
      'x/2026-10-01-live-post.md': '---\ntitle: A\ndate: 2026-10-02\nsummary: s\n---\nBody',
      'x/2026-10-03-draft-post.md': '---\ntitle: B\nsummary: s\ndraft: true\n---\nBody',
      'x/Not A Post.md': '---\ntitle: C\n---\n',
    });
    expect(posts).toEqual([{ slug: 'live-post', date: '2026-10-02' }]);
  });

  it('writes every public page and each post with its date', () => {
    const xml = buildSitemap([{ slug: 'a-post', date: '2026-10-15' }]);
    for (const path of PUBLIC_PATHS) expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
    expect(xml).toContain(`<url><loc>${SITE_URL}/blog/a-post</loc><lastmod>2026-10-15</lastmod></url>`);
    expect(xml).not.toContain('/sign-in');
  });
});
