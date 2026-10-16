import { useEffect } from 'react';

const SUFFIX = ' · Dollars at Work';

/** The tags a page's title and description are copied into, so search engines that run the app see them too. */
const TITLE_TAGS = ['meta[property="og:title"]', 'meta[name="twitter:title"]'];
const DESCRIPTION_TAGS = ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]'];

/**
 * Sets the browser tab title (with " · Dollars at Work" added unless it is already there) and the page
 * description while a page is open, and puts the old ones back after. Link-preview crawlers don't run the
 * app, so shared links show the site-wide tags in index.html; this is for tabs, history and search.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const fullTitle = title.endsWith(SUFFIX) || title === 'Dollars at Work' ? title : title + SUFFIX;
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
