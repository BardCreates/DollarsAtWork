import { useEffect } from 'react';

/** Sets the browser tab title and the page description while a page is open, and puts the old ones back after. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    const previousTitle = document.title;
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = tag?.content;

    document.title = title;
    if (tag && description) tag.content = description;

    return () => {
      document.title = previousTitle;
      if (tag && previousDescription !== undefined) tag.content = previousDescription;
    };
  }, [title, description]);
}
