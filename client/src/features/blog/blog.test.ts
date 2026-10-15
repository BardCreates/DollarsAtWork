import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, wordCount } from './markdown';
import { ALL_POSTS, POST_ERRORS, formatPostDate, parsePost, sortPosts } from './posts';

describe('blog markdown', () => {
  it('reads headings, paragraphs, both kinds of list and tables', () => {
    const text = [
      '## Big heading',
      'A paragraph that',
      'wraps onto two lines.',
      '',
      '### Small heading',
      '- one',
      '- two',
      '1. first',
      '2. second',
      '',
      '| A | B |',
      '| --- | --- |',
      '| 1 | 2 |',
      '| 3 | 4 |',
      'After the table.',
    ].join('\n');

    expect(parseMarkdown(text)).toEqual([
      { kind: 'heading', level: 2, text: 'Big heading' },
      { kind: 'paragraph', text: 'A paragraph that wraps onto two lines.' },
      { kind: 'heading', level: 3, text: 'Small heading' },
      { kind: 'list', ordered: false, items: ['one', 'two'] },
      { kind: 'list', ordered: true, items: ['first', 'second'] },
      { kind: 'table', header: ['A', 'B'], rows: [['1', '2'], ['3', '4']] },
      { kind: 'paragraph', text: 'After the table.' },
    ]);
  });

  it('treats a line of italics as a paragraph, not a list', () => {
    expect(parseMarkdown('*Not financial advice.*')).toEqual([{ kind: 'paragraph', text: '*Not financial advice.*' }]);
  });

  it('splits bold, italic and links inside a line', () => {
    expect(parseInline('Try **this**, *that* and [the tool](/tools?tool=payoff).')).toEqual([
      { kind: 'text', text: 'Try ' },
      { kind: 'bold', text: 'this' },
      { kind: 'text', text: ', ' },
      { kind: 'italic', text: 'that' },
      { kind: 'text', text: ' and ' },
      { kind: 'link', text: 'the tool', href: '/tools?tool=payoff' },
      { kind: 'text', text: '.' },
    ]);
  });

  it('counts words, ignoring link addresses and table pipes', () => {
    expect(wordCount('Read [the guide](https://example.com/long/path) now. | a | b |')).toBe(6);
  });
});

describe('blog posts', () => {
  const sample = '---\ntitle: A title\ndate: 2026-10-15\nsummary: Short.\ntags: debt, savings\ndraft: true\n---\n\nBody text.';

  it('reads the details block, the slug from the file name, and the draft flag', () => {
    const result = parsePost('../../content/blog/2026-10-15-a-title.md', sample);
    expect('post' in result && result.post).toMatchObject({ slug: 'a-title', title: 'A title', date: '2026-10-15', tags: ['debt', 'savings'], draft: true, body: 'Body text.', minutes: 1 });
  });

  it('explains what is wrong with a bad file instead of dropping it silently', () => {
    expect(parsePost('../../content/blog/My Post.md', sample)).toHaveProperty('error');
    expect(parsePost('../../content/blog/2026-10-15-x.md', 'No details block')).toHaveProperty('error');
    expect(parsePost('../../content/blog/2026-10-15-x.md', '---\ntitle: T\n---\nBody')).toHaveProperty('error');
  });

  it('sorts newest first', () => {
    const post = (slug: string, date: string) => ({ slug, title: slug, date, summary: '', tags: [], draft: false, body: '', minutes: 1 });
    expect(sortPosts([post('a', '2026-01-01'), post('b', '2026-03-01')]).map((p) => p.slug)).toEqual(['b', 'a']);
  });

  it('shows dates as the calendar day, whatever the time zone', () => {
    expect(formatPostDate('2026-10-15')).toBe('October 15, 2026');
  });

  it('every post file in the repo is valid, with a unique slug and a short summary', () => {
    expect(POST_ERRORS).toEqual([]);
    const slugs = ALL_POSTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const post of ALL_POSTS) expect(post.summary.length, post.slug).toBeLessThanOrEqual(160);
  });

  it('every link inside a post points at a page that exists, or at an outside site', () => {
    const pages = ['/', '/plan', '/savings', '/debt', '/invest', '/what-if', '/tools', '/profile', '/welcome', '/pricing', '/security', '/privacy', '/terms', '/help', '/demo', '/blog', '/sign-up'];
    for (const post of ALL_POSTS) {
      for (const [, href] of post.body.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^https:\/\//.test(href)) continue;
        const path = href.split('?')[0];
        const ok = pages.includes(path) || path.startsWith('/help/') || ALL_POSTS.some((p) => `/blog/${p.slug}` === path);
        expect(ok, `${post.slug} links to ${href}`).toBe(true);
      }
    }
  });
});
