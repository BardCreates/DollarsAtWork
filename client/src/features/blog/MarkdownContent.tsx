import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { parseInline, parseMarkdown } from './markdown';

const isInternal = (href: string) => href.startsWith('/') && !href.startsWith('//');

function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = parseInline(text).map((part, i) => {
    switch (part.kind) {
      case 'bold':
        return (
          <Box component="strong" key={i} sx={{ color: 'text.primary', fontWeight: 600 }}>
            {part.text}
          </Box>
        );
      case 'italic':
        return <em key={i}>{part.text}</em>;
      case 'link':
        return isInternal(part.href) ? (
          <Link key={i} component={RouterLink} to={part.href} underline="hover">
            {part.text}
          </Link>
        ) : (
          <Link key={i} href={part.href} target="_blank" rel="noopener noreferrer" underline="hover">
            {part.text}
          </Link>
        );
      default:
        return part.text;
    }
  });
  return <>{parts}</>;
}

/** A blog post body, in the site's look: readable line length, tables that scroll sideways on phones. */
export function MarkdownContent({ text }: { text: string }) {
  return (
    <Box
      sx={{
        color: 'text.secondary',
        fontSize: { xs: '1rem', md: '1.0625rem' },
        lineHeight: 1.75,
        '&& > *': { mt: 0, mb: 0 },
        '&& > * + *': { mt: 2.25 },
        '&& > h2, && > h3': { mt: 4 },
        '&& > h2 + *, && > h3 + *': { mt: 1.25 },
      }}
    >
      {parseMarkdown(text).map((block, i) => {
        switch (block.kind) {
          case 'heading':
            return (
              <Typography key={i} variant={block.level === 2 ? 'h5' : 'h6'} component={block.level === 2 ? 'h2' : 'h3'} color="text.primary">
                <Inline text={block.text} />
              </Typography>
            );
          case 'list':
            return (
              <Box key={i} component={block.ordered ? 'ol' : 'ul'} sx={{ pl: 3.5, '& li + li': { mt: 1 } }}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item} />
                  </li>
                ))}
              </Box>
            );
          case 'table':
            return (
              <Box key={i} sx={{ overflowX: 'auto', border: 1, borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small" sx={{ minWidth: 420 }}>
                  <TableHead>
                    <TableRow>
                      {block.header.map((cell, j) => (
                        <TableCell key={j} sx={{ fontWeight: 700, color: 'text.primary' }}>
                          <Inline text={cell} />
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {block.rows.map((row, r) => (
                      <TableRow key={r} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                        {row.map((cell, j) => (
                          <TableCell key={j}>
                            <Inline text={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            );
          default:
            return (
              <Typography key={i} component="p" sx={{ fontSize: 'inherit', lineHeight: 'inherit' }}>
                <Inline text={block.text} />
              </Typography>
            );
        }
      })}
    </Box>
  );
}
