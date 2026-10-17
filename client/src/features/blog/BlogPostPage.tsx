import { Link as RouterLink, useParams } from 'react-router-dom';
import { Alert, Box, Breadcrumbs, Button, Card, CardContent, Chip, Link, Typography } from '@mui/material';
import { useMe } from '../../auth/auth';
import { useRecordVisit } from '../../lib/usage';
import { TrialCta } from '../tools/TrialCta';
import { POST_CTAS } from './ctas';
import { MarkdownContent } from './MarkdownContent';
import { PostCtaCard } from './PostCtaCard';
import { findPost, formatPostDate, visiblePosts } from './posts';
import { usePageMeta } from '../../lib/usePageMeta';

/** One post, with a way into the app for visitors and links to the newest other posts. */
export function BlogPostPage() {
  const { slug } = useParams();
  const { data: me } = useMe();
  const post = findPost(slug);
  useRecordVisit('visit_blog', { source: post ? `blog/${post.slug}` : undefined, enabled: post !== undefined });
  usePageMeta(post ? `${post.title} · Dollars at Work` : 'Blog · Dollars at Work', post?.summary);

  if (!post) {
    return (
      <Box sx={{ maxWidth: 760 }}>
        <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
          That post isn't here
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          It may have moved or not be published yet.
        </Typography>
        <Button component={RouterLink} to="/blog" variant="contained">
          See all posts
        </Button>
      </Box>
    );
  }

  const more = visiblePosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  const cta = POST_CTAS[post.cta];

  return (
    <Box component="article" sx={{ maxWidth: 760 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link component={RouterLink} to="/blog" underline="hover" color="inherit">
          Blog
        </Link>
        <Typography color="text.secondary">{formatPostDate(post.date)}</Typography>
      </Breadcrumbs>

      {post.draft && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Draft: only visible when running locally. Set draft: false to publish.
        </Alert>
      )}

      <Typography variant="h3" component="h1" sx={{ fontWeight: 700, fontSize: { xs: '1.9rem', md: '2.5rem' }, lineHeight: 1.2, mb: 1.5 }}>
        {post.title}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 1 }}>
        {formatPostDate(post.date)} · {post.minutes} min read
      </Typography>
      {post.tags.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 3 }}>
          {post.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      )}

      <Card>
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <MarkdownContent text={post.body} middle={<PostCtaCard cta={cta} slug={post.slug} signedIn={!!me} />} />
        </CardContent>
      </Card>

      {me ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 3 }}>
          <Button component={RouterLink} to={cta.inApp.to} variant="contained">
            {cta.inApp.label}
          </Button>
          <Button component={RouterLink} to="/what-if" variant="outlined">
            Make a what-if
          </Button>
        </Box>
      ) : (
        <TrialCta headline={cta.headline} body={cta.body} primaryLabel={cta.button} secondary={cta.secondary} from={`blog/${post.slug}`} />
      )}

      {more.length > 0 && (
        <Box component="nav" aria-label="More posts" sx={{ mt: 5 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
            More from the blog
          </Typography>
          <Box component="ul" sx={{ pl: 2.5, m: 0, '& li + li': { mt: 0.75 } }}>
            {more.map((p) => (
              <li key={p.slug}>
                <Link component={RouterLink} to={`/blog/${p.slug}`} underline="hover">
                  {p.title}
                </Link>
              </li>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
