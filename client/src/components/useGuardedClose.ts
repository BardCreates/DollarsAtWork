import { useEffect } from 'react';

const DISCARD_QUESTION = 'Discard what you typed? Your changes haven’t been saved.';

/**
 * Keeps half-typed changes from vanishing: while `dirty`, closing the dialog asks first, and leaving or refreshing
 * the page shows the browser's own "leave site?" prompt. Returns the close handler to give the dialog.
 */
export function useGuardedClose(open: boolean, dirty: boolean, onClose: () => void): () => void {
  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty]);

  return () => {
    if (!dirty || window.confirm(DISCARD_QUESTION)) onClose();
  };
}
