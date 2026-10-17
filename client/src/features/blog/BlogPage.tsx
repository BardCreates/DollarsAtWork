import { Link as RouterLink } from 'react-router-dom';
import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import { PageHeader } from '../../components/PageHeader';
import { useRecordVisit } from '../../lib/usage';
import { formatPostDate, visiblePosts } from './posts';
import { usePageMeta } from '../../lib/usePageMeta';

/** The list of posts, newest first. Open to everyone. */
export function BlogPage() {
  useRecordVisit('visit_blog');
  usePageMeta('Blog · Dollars at Work', 'Plain-English money articles: debt payoff, savings, investing and making a plan that works.');

  return (
    <Box sx={{ maxWidth: 860 }}>
      <PageHeader title="Blog" subtitle="Plain-English money news and how to put it to work in your plan." />

      {visiblePosts.length === 0 ? (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              The first posts are on their way
            </Typography>
            <Typography color="text.secondary">
              Short, practical articles about paying off debt, saving and investing, written around the news that affects your money.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 2.5, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {visiblePosts.map((post) => (
            <li key={post.slug}>
              <Card component="article">
                <CardActionArea component={RouterLink} to={`/blog/${post.slug}`}>
                  <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
                      {formatPostDate(post.date)} · {post.minutes} min read
                      {post.draft && <Chip label="Draft" size="small" color="warning" sx={{ ml: 1 }} />}
                    </Typography>
                    <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
                      {post.title}
                    </Typography>
                    <Typography color="text.secondary">{post.summary}</Typography>
                    {post.tags.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                        {post.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </CardContent>
                </CardActionArea>
              </Card>
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
}
