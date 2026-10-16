import { Link as RouterLink, useParams } from 'react-router-dom';
import { Box, Breadcrumbs, Button, Card, CardContent, Link, Typography } from '@mui/material';
import { usePageMeta } from '../../lib/usePageMeta';
import { HELP_ARTICLES, findArticle } from './articles';
import { HelpContent } from './HelpContent';

/** One help article, with the other articles in its section underneath. */
export function HelpArticlePage() {
  const { slug } = useParams();
  const article = findArticle(slug);
  usePageMeta(article ? `${article.title} · Help` : 'Help', article?.summary);

  if (!article) {
    return (
      <Box sx={{ maxWidth: 760 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          That article isn't here
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          It may have moved. Search the guide or browse the topics instead.
        </Typography>
        <Button component={RouterLink} to="/help" variant="contained">
          Go to Help
        </Button>
      </Box>
    );
  }

  const related = HELP_ARTICLES.filter((a) => a.section === article.section && a.slug !== article.slug);

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/help" underline="hover" color="inherit">
          Help
        </Link>
        <Typography color="text.secondary">{article.section}</Typography>
      </Breadcrumbs>

      <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
        {article.title}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {article.summary}
      </Typography>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <HelpContent body={article.body} />
        </CardContent>
      </Card>

      {related.length > 0 && (
        <Box component="nav" aria-label="Related articles" sx={{ mt: 4 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            More in {article.section}
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, m: 0, '& li + li': { mt: 0.75 } }}>
            {related.map((a) => (
              <li key={a.slug}>
                <Link component={RouterLink} to={`/help/${a.slug}`} underline="hover">
                  {a.title}
                </Link>
              </li>
            ))}
          </Box>
        </Box>
      )}

      <Button component={RouterLink} to="/help" variant="outlined" sx={{ mt: 4 }}>
        All help topics
      </Button>
    </Box>
  );
}
