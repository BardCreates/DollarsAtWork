import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Typography } from '@mui/material';
import { parseHelpBody } from './helpMarkup';

/** **bold** and [links](/path) inside one line of an article. */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    if (match[1] !== undefined) {
      parts.push(
        <Box component="strong" key={at} sx={{ color: 'text.primary', fontWeight: 600 }}>
          {match[1]}
        </Box>,
      );
    } else {
      parts.push(
        <Link key={at} component={RouterLink} to={match[3]} underline="hover">
          {match[2]}
        </Link>,
      );
    }
    last = at + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** Renders an article body written in the help guide's small markup (see articles.ts). */
export function HelpContent({ body }: { body: string }) {
  return (
    <Box sx={{ color: 'text.secondary', lineHeight: 1.7, '&& > *': { mt: 0, mb: 0 }, '&& > * + *': { mt: 2 }, '&& > h2:not(:first-of-type)': { mt: 3.5 }, '&& > h2 + *': { mt: 1 } }}>
      {parseHelpBody(body).map((block, i) => {
        if (block.kind === 'heading') {
          return (
            <Typography key={i} variant="h6" component="h2" color="text.primary">
              {block.text}
            </Typography>
          );
        }
        if (block.kind === 'list') {
          return (
            <Box component="ul" key={i} sx={{ pl: 3, '& li + li': { mt: 0.75 } }}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </Box>
          );
        }
        return (
          <Typography key={i} component="p" sx={{ lineHeight: 'inherit' }}>
            {inline(block.text)}
          </Typography>
        );
      })}
    </Box>
  );
}
