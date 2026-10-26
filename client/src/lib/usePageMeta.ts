import { createContext, useContext, useEffect } from 'react';

const SUFFIX = ' · Dollars at Work';

/** The page's title as the browser tab shows it: " · Dollars at Work" added unless it is already there. */
export function fullPageTitle(title: string): string {
  return title.endsWith(SUFFIX) || title === 'Dollars at Work' ? title : title + SUFFIX;
}

/** Filled in while a page is rendered at build time (src/prerender), so the served HTML carries its title. */
export interface PageMetaSink {
  title?: string;
  description?: string;
}

export const PageMetaSinkContext = createContext<PageMetaSink | null>(null);

/** The tags a page's title and description are copied into, so search engines that run the app see them too. */
const TITLE_TAGS = ['meta[property="og:title"]', 'meta[name="twitter:title"]'];
const DESCRIPTION_TAGS = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'];

/**
 * Sets the browser tab title (with " · Dollars at Work" added unless it is already there) and the page
 * description while a page is open, and puts the old ones back after. Public pages are also rendered at build
 * time (src/prerender), and there the same title and description go into the served HTML for crawlers.
 */
export function usePageMeta(title: string, description?: string) {
  // At build time effects never run, so the page's own title and description are handed to the pre-renderer here.
  const sink = useContext(PageMetaSinkContext);
  if (sink) {
    sink.title = fullPageTitle(title);
    if (description) sink.description = description;
  }

  useEffect(() => {
    const fullTitle = fullPageTitle(title);
    const previousTitle = document.title;
    const changed: [HTMLMetaElement, string][] = [];
    const set = (selectors: string[], value: string) => {
      for (const selector of selectors) {
        const tag = document.querySelector<HTMLMetaElement>(selector);
        if (!tag) continue;
        changed.push([tag, tag.content]);
        tag.content = value;
      }
    };

    document.title = fullTitle;
    set(TITLE_TAGS, fullTitle);
    if (description) set(DESCRIPTION_TAGS, description);

    return () => {
      document.title = previousTitle;
      for (const [tag, content] of changed) tag.content = content;
    };
  }, [title, description]);
}
