import { useSyncExternalStore } from 'react';

/**
 * "Add to home screen". Browsers offer installation by firing `beforeinstallprompt` once, early in the page's
 * life, so it is caught here at start-up (this module is imported from main.tsx) and held until a button asks.
 * Browsers that never fire it (Safari, or an app that is already installed) simply report that it can't be offered.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether the browser can offer to install the app right now, and a way to do it. */
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, () => deferred !== null);

  const install = async () => {
    if (!deferred) return;
    const event = deferred;
    deferred = null;
    notify();
    await event.prompt();
    await event.userChoice;
  };

  return { canInstall, install };
}
