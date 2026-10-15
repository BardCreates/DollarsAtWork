/**
 * A small Markdown reader for blog posts: just what posts use, no dependency.
 * Blocks: "## " and "### " headings, paragraphs, "- " lists, "1. " lists, and "| a | b |" tables
 * (the second row of dashes marks the header). Inline: **bold**, *italic* and [links](url), handled when rendering.
 */

export type MarkdownBlock =
  | { kind: 'heading'; level: 2 | 3; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; header: string[]; rows: string[][] };

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());

const isDivider = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line.trim());

export function parseMarkdown(text: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', level: heading[1].length as 2 | 3, text: heading[2] });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = !!numbered;
      const items: string[] = [];
      while (i < lines.length) {
        const match = ordered ? /^\d+[.)]\s+(.*)$/.exec(lines[i].trim()) : /^[-*]\s+(.*)$/.exec(lines[i].trim());
        if (!match) break;
        items.push(match[1]);
        i++;
      }
      i--;
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }

    if (line.startsWith('|') && i + 1 < lines.length && isDivider(lines[i + 1])) {
      flushParagraph();
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(cells(lines[i]));
        i++;
      }
      i--;
      blocks.push({ kind: 'table', header, rows });
      continue;
    }

    paragraph.push(line);
  }
  flushParagraph();
  return blocks;
}

export type InlinePart =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'link'; text: string; href: string };

/** Splits one line into plain text, **bold**, *italic* and [links](url). */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push({ kind: 'text', text: text.slice(last, at) });
    if (match[1] !== undefined) parts.push({ kind: 'bold', text: match[1] });
    else if (match[2] !== undefined) parts.push({ kind: 'italic', text: match[2] });
    else parts.push({ kind: 'link', text: match[3], href: match[4] });
    last = at + match[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** The words in a post, for the reading time. */
export function wordCount(text: string): number {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/**
 * Where a call to action goes partway through a post: just before the heading nearest the middle, so it lands
 * after the reader has seen the example and before the how-to. Returns the block index to insert before, or null
 * when the post has too few sections to break up (fewer than three headings).
 */
export function middleHeadingIndex(blocks: MarkdownBlock[]): number | null {
  const headings = blocks.flatMap((b, i) => (b.kind === 'heading' ? [i] : []));
  // The first heading opens the post, and the "Sources" heading closes it; neither is a good break.
  const candidates = headings.slice(1).filter((i) => {
    const b = blocks[i];
    return b.kind === 'heading' && !/^sources$/i.test(b.text.trim());
  });
  if (headings.length < 3 || candidates.length === 0) return null;
  const middle = blocks.length / 2;
  return candidates.reduce((best, i) => (Math.abs(i - middle) < Math.abs(best - middle) ? i : best));
}
