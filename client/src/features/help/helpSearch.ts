import { HELP_ARTICLES, type HelpArticle } from './articles';

/** The article text without its markup, for searching and for snippets. */
export function plainText(markup: string): string {
  return markup
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/^## /gm, '')
    .replace(/^- /gm, '');
}

/** Words that tell us nothing about what someone is looking for. */
const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'why', 'with', 'you', 'your']);

function words(text: string): string[] {
  return text.toLowerCase().replace(/['’]/g, '').split(/[^a-z0-9%]+/).filter(Boolean);
}

/** The words of a query worth matching. If every word is a stop word, keep them all rather than match nothing. */
export function queryTerms(query: string): string[] {
  const all = [...new Set(words(query))];
  const useful = all.filter((w) => !STOP_WORDS.has(w));
  return useful.length > 0 ? useful : all;
}

/** A field matches a term when one of its words starts with it ("goal" finds "goals"), or the term is a plural of one. */
function matches(fieldWords: string[], term: string): boolean {
  const singular = term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term;
  return fieldWords.some((w) => w.startsWith(term) || w === singular);
}

interface Indexed {
  article: HelpArticle;
  title: string[];
  keywords: string[];
  summary: string[];
  body: string[];
  plain: string;
}

const index: Indexed[] = HELP_ARTICLES.map((article) => {
  const plain = plainText(article.body);
  return {
    article,
    title: words(article.title),
    keywords: words(article.keywords ?? ''),
    summary: words(article.summary),
    body: words(plain),
    plain,
  };
});

const WEIGHTS = { title: 6, keywords: 4, summary: 3, body: 1 } as const;

function score(entry: Indexed, term: string): number {
  let total = 0;
  for (const field of ['title', 'keywords', 'summary', 'body'] as const) {
    if (matches(entry[field], term)) total += WEIGHTS[field];
  }
  return total;
}

/** The first sentence that mentions one of the terms, shortened to about 160 characters. */
export function snippet(plain: string, terms: string[]): string {
  const sentences = plain.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  const found = sentences.find((s) => terms.some((t) => matches(words(s), t))) ?? sentences[0] ?? '';
  return found.length > 160 ? `${found.slice(0, 157).trimEnd()}…` : found;
}

export interface HelpHit {
  article: HelpArticle;
  snippet: string;
}

/**
 * Articles that match a search, best first. Articles that contain every word come first; if none does,
 * articles that contain any of them are shown instead, so a slightly off question still finds something.
 */
export function searchHelp(query: string): HelpHit[] {
  const terms = queryTerms(query);
  if (terms.length === 0) return [];

  const scored = index.map((entry) => {
    const perTerm = terms.map((t) => score(entry, t));
    return { entry, total: perTerm.reduce((a, b) => a + b, 0), all: perTerm.every((s) => s > 0) };
  });

  const strict = scored.filter((s) => s.all);
  const chosen = strict.length > 0 ? strict : scored.filter((s) => s.total > 0);

  return chosen
    .sort((a, b) => b.total - a.total)
    .map(({ entry }) => ({ article: entry.article, snippet: snippet(entry.plain, terms) }));
}
