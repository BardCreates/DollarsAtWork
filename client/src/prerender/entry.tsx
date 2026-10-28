/**
 * Build-time rendering of the public pages (R21a), so search engines and link previews get each page's own
 * title, description and full text instead of an empty app shell. Built with `vite build --ssr` and run by
 * scripts/prerender.mjs after the normal build; the browser still starts the app as usual and replaces this
 * HTML with the live page (main.tsx uses createRoot, not hydration, so signed-in visitors get their own frame).
 */

import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { theme } from '../theme';
import App from '../App';
import { meQueryKey } from '../auth/auth';
import { PageMetaSinkContext, type PageMetaSink } from '../lib/usePageMeta';
import { visiblePosts } from '../features/blog/posts';
import { HELP_ARTICLES } from '../features/help/articles';
import { articleJsonLd, renderDocument, SITE_NAME } from './head';
import { outputFile, publicRoutes, type PublicRoute } from './routes';

/** Used when a page sets no description of its own. */
const DEFAULT_DESCRIPTION = 'A monthly money plan that shows your debt-free date, savings goals and net worth 10 years out. No bank login.';

/** Renders one page as a signed-out visitor sees it. */
export function renderPage(path: string): { html: string; meta: PageMetaSink } {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  // A visitor: nobody is signed in, so the public frame is drawn (not a spinner while the app asks the server).
  queryClient.setQueryData(meQueryKey, null);
  const meta: PageMetaSink = {};

  const html = renderToString(
    <StrictMode>
      <PageMetaSinkContext.Provider value={meta}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <QueryClientProvider client={queryClient}>
            <StaticRouter location={path}>
              <App />
            </StaticRouter>
          </QueryClientProvider>
        </ThemeProvider>
      </PageMetaSinkContext.Provider>
    </StrictMode>,
  );
  queryClient.clear();
  return { html, meta };
}

export interface PrerenderedFile {
  /** Relative to the build folder, e.g. "blog/some-post/index.html". */
  file: string;
  path: string;
  html: string;
}

export function prerenderRoute(shell: string, route: PublicRoute): PrerenderedFile {
  const { html: body, meta } = renderPage(route.path);
  if (!meta.title) throw new Error(`${route.path} sets no title (usePageMeta)`);
  const html = renderDocument(
    shell,
    {
      path: route.path,
      title: meta.title,
      description: meta.description ?? DEFAULT_DESCRIPTION,
      type: route.type,
      crumbs: [...route.parents, { name: route.path === '/' ? SITE_NAME : route.name, path: route.path }],
      jsonLd: route.post ? [articleJsonLd(route.post)] : [],
    },
    body,
  );
  return { file: outputFile(route.path), path: route.path, html };
}

/** Every public page, ready to write into the build. `shell` is the built index.html. */
export function prerenderAll(shell: string): PrerenderedFile[] {
  return publicRoutes(visiblePosts, HELP_ARTICLES).map((route) => prerenderRoute(shell, route));
}
