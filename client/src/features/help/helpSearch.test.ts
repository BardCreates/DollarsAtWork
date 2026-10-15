import { describe, expect, it } from 'vitest';
import { HELP_ARTICLES } from './articles';
import { parseHelpBody } from './helpMarkup';
import { plainText, queryTerms, searchHelp, snippet } from './helpSearch';

const slugs = (query: string) => searchHelp(query).map((hit) => hit.article.slug);

describe('help search', () => {
  it('puts the article about a topic first', () => {
    expect(slugs('snowball')[0]).toBe('debt');
    expect(slugs('inflation')[0]).toBe('todays-dollars');
    expect(slugs('employer match')[0]).toBe('invest');
    expect(slugs('cancel my subscription')[0]).toBe('trial-and-billing');
    expect(slugs('emergency fund')[0]).toBe('savings');
  });

  it('finds the hints article from a plain question', () => {
    expect(slugs('how do I turn hints back on')[0]).toBe('hints');
  });

  it('matches the start of a word and simple plurals', () => {
    expect(slugs('categ')).toContain('plan');
    expect(slugs('debts')).toContain('debt');
  });

  it('falls back to partial matches when no article has every word', () => {
    // "zebra" appears nowhere, but "check-in" does.
    expect(slugs('zebra check-in')).toContain('check-in');
  });

  it('finds nothing for words that appear nowhere, and nothing for an empty search', () => {
    expect(searchHelp('xyzzy')).toEqual([]);
    expect(searchHelp('   ')).toEqual([]);
  });

  it('ignores filler words unless that is all there is', () => {
    expect(queryTerms('How do I export my data?')).toEqual(['export', 'data']);
    expect(queryTerms('how to')).toEqual(['how', 'to']);
  });
});

describe('help text', () => {
  it('strips the markup', () => {
    expect(plainText('## Title\n- **Bold** and [a link](/plan).')).toBe('Title\nBold and a link.');
  });

  it('builds a snippet from the sentence that mentions the search', () => {
    expect(snippet('First sentence here. The APR is yearly interest. Last one.', ['apr'])).toBe('The APR is yearly interest.');
  });

  it('every article has a unique slug, a summary and a body', () => {
    const seen = new Set<string>();
    for (const article of HELP_ARTICLES) {
      expect(seen.has(article.slug)).toBe(false);
      seen.add(article.slug);
      expect(article.summary.length).toBeGreaterThan(0);
      expect(article.body.length).toBeGreaterThan(0);
    }
  });

  it('every link inside an article points at a page or article that exists', () => {
    const pages = ['/', '/plan', '/savings', '/debt', '/invest', '/what-if', '/tools', '/profile', '/welcome', '/pricing', '/security', '/privacy', '/terms', '/help', '/demo'];
    for (const article of HELP_ARTICLES) {
      for (const [, href] of article.body.matchAll(/\]\(([^)]+)\)/g)) {
        const path = href.split('?')[0];
        const ok = pages.includes(path) || (path.startsWith('/help/') && HELP_ARTICLES.some((a) => `/help/${a.slug}` === path));
        expect(ok, `${article.slug} links to ${href}`).toBe(true);
      }
    }
  });
});

describe('help markup', () => {
  it('splits headings, paragraphs and lists, even without blank lines between them', () => {
    expect(parseHelpBody('Intro line one\nline two.\n\n## Heading\nA lead-in:\n- one\n- two\nAfter.')).toEqual([
      { kind: 'paragraph', text: 'Intro line one line two.' },
      { kind: 'heading', text: 'Heading' },
      { kind: 'paragraph', text: 'A lead-in:' },
      { kind: 'list', items: ['one', 'two'] },
      { kind: 'paragraph', text: 'After.' },
    ]);
  });
});
