import { useMemo } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, InputAdornment, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { PageHeader } from '../../components/PageHeader';
import { HELP_ARTICLES, HELP_SECTIONS, type HelpArticle } from './articles';
import { searchHelp } from './helpSearch';
import { usePageMeta } from '../../lib/usePageMeta';

function ArticleLink({ article, text }: { article: HelpArticle; text: string }) {
  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/help/${article.slug}`}>
        <CardContent>
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
            {article.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {text}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

const grid = { display: 'grid', gap: 2, gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' } } as const;

/** The help guide: search box on top, then every article grouped by section, or the search results. Open to everyone. */
export function HelpPage() {
  usePageMeta('Help', 'How Dollars at Work works: the plan, debt payoff, savings goals, investing, the dashboard and your subscription.');
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const hits = useMemo(() => (query.trim() ? searchHelp(query) : null), [query]);

  const setQuery = (value: string) => setParams(value ? { q: value } : {}, { replace: true });

  return (
    <>
      <PageHeader title="Help" subtitle="How everything works, in plain words." />

      <TextField
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the guide, like “snowball” or “cancel”"
        autoComplete="off"
        sx={{ mb: 4, maxWidth: 640 }}
        slotProps={{
          htmlInput: { 'aria-label': 'Search the help guide', type: 'search' },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {hits ? (
        <Box role="region" aria-live="polite" aria-label="Search results">
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {hits.length === 0
              ? 'Nothing matches that yet. Try a different word, or browse the topics below.'
              : `${hits.length} ${hits.length === 1 ? 'article' : 'articles'} found`}
          </Typography>
          <Box sx={grid}>
            {hits.map((hit) => (
              <ArticleLink key={hit.article.slug} article={hit.article} text={hit.snippet} />
            ))}
          </Box>
        </Box>
      ) : null}

      {(!hits || hits.length === 0) &&
        HELP_SECTIONS.map((section) => (
          <Box key={section} component="section" sx={{ mb: 4, mt: hits ? 4 : 0 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
              {section}
            </Typography>
            <Box sx={grid}>
              {HELP_ARTICLES.filter((a) => a.section === section).map((article) => (
                <ArticleLink key={article.slug} article={article} text={article.summary} />
              ))}
            </Box>
          </Box>
        ))}
    </>
  );
}
