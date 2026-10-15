export type HelpBlock = { kind: 'heading' | 'paragraph'; text: string } | { kind: 'list'; items: string[] };

/**
 * Splits an article body into blocks. A line starting "## " is a heading, a run of "- " lines is a list,
 * and other lines are paragraphs, which end at a blank line.
 */
export function parseHelpBody(body: string): HelpBlock[] {
  const blocks: HelpBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    if (list.length) blocks.push({ kind: 'list', items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ kind: 'heading', text: line.slice(3) });
    } else if (line.startsWith('- ')) {
      if (paragraph.length) flush();
      list.push(line.slice(2));
    } else {
      if (list.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

