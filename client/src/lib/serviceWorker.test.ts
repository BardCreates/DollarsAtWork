import { describe, expect, it } from 'vitest';
// The worker is a plain script in public/, so it is loaded as text and run against a pretend browser below.
import swSource from '../../public/sw.js?raw';

/**
 * What matters about the service worker is what it refuses to do: it must never answer API calls, or keep
 * anything a signed-in person entered. These tests run the real file with the browser's pieces faked.
 */

type Handler = (event: FakeEvent) => void;

interface FakeEvent {
  request?: { mode: string; url: string };
  waited?: Promise<unknown>;
  response?: Promise<Response>;
  waitUntil(promise: Promise<unknown>): void;
  respondWith(response: Promise<Response>): void;
}

function fakeEvent(request?: { mode: string; url: string }): FakeEvent {
  const event: FakeEvent = {
    request,
    waitUntil(promise) {
      event.waited = promise;
    },
    respondWith(response) {
      event.response = response;
    },
  };
  return event;
}

function loadWorker(options: { cacheKeys?: string[]; cachedOffline?: Response; fetchImpl?: (request: unknown) => Promise<Response> } = {}) {
  const handlers: Record<string, Handler> = {};
  const record = { opened: [] as string[], added: [] as string[][], deleted: [] as string[], skipWaiting: 0, claimed: 0, matched: [] as string[] };

  const self = {
    addEventListener: (type: string, handler: Handler) => {
      handlers[type] = handler;
    },
    skipWaiting: async () => {
      record.skipWaiting++;
    },
    clients: {
      claim: async () => {
        record.claimed++;
      },
    },
  };

  const caches = {
    open: async (name: string) => {
      record.opened.push(name);
      return {
        addAll: async (urls: string[]) => {
          record.added.push(urls);
        },
      };
    },
    keys: async () => options.cacheKeys ?? [],
    delete: async (key: string) => {
      record.deleted.push(key);
      return true;
    },
    match: async (url: string) => {
      record.matched.push(url);
      return options.cachedOffline;
    },
  };

  const fetchImpl = options.fetchImpl ?? (async () => new Response('from the network'));
  new Function('self', 'caches', 'fetch', 'Response', swSource)(self, caches, fetchImpl, Response);
  return { handlers, record };
}

describe('the service worker', () => {
  it('on install, keeps only the offline page and its icon', async () => {
    const { handlers, record } = loadWorker();
    const event = fakeEvent();
    handlers.install(event);
    await event.waited;
    expect(record.opened).toEqual(['daw-offline-v1']);
    expect(record.added).toEqual([['/offline.html', '/icons/icon-192.png']]);
    expect(record.skipWaiting).toBe(1);
  });

  it('on activate, throws away older caches and takes over', async () => {
    const { handlers, record } = loadWorker({ cacheKeys: ['daw-offline-v1', 'daw-offline-v0', 'something-else'] });
    const event = fakeEvent();
    handlers.activate(event);
    await event.waited;
    expect(record.deleted).toEqual(['daw-offline-v0', 'something-else']);
    expect(record.claimed).toBe(1);
  });

  it('lets a page load through when the network works', async () => {
    const { handlers } = loadWorker();
    const event = fakeEvent({ mode: 'navigate', url: 'https://app.example/plan' });
    handlers.fetch(event);
    expect(await (await event.response!).text()).toBe('from the network');
  });

  it('shows the offline page when a page load fails', async () => {
    const offline = new Response('offline page');
    const { handlers, record } = loadWorker({
      cachedOffline: offline,
      fetchImpl: async () => {
        throw new TypeError('network down');
      },
    });
    const event = fakeEvent({ mode: 'navigate', url: 'https://app.example/plan' });
    handlers.fetch(event);
    expect(await event.response!).toBe(offline);
    expect(record.matched).toEqual(['/offline.html']);
  });

  it('still answers, plainly, when the offline page was never cached', async () => {
    const { handlers } = loadWorker({
      fetchImpl: async () => {
        throw new TypeError('network down');
      },
    });
    const event = fakeEvent({ mode: 'navigate', url: 'https://app.example/' });
    handlers.fetch(event);
    const response = await event.response!;
    expect(response.status).toBe(503);
  });

  it('never touches API calls or anything that is not a page load', () => {
    const { handlers } = loadWorker({
      fetchImpl: async () => {
        throw new TypeError('network down');
      },
    });
    for (const request of [
      { mode: 'cors', url: 'https://app.example/api/plan' },
      { mode: 'same-origin', url: 'https://app.example/api/networth' },
      { mode: 'no-cors', url: 'https://app.example/assets/index-abc.js' },
    ]) {
      const event = fakeEvent(request);
      handlers.fetch(event);
      expect(event.response, `${request.url} must not be answered by the worker`).toBeUndefined();
    }
  });

  it("source doesn't store request or response data of its own beyond the offline page", () => {
    // Guards against someone adding "cache every response" later: the only cache writes allowed are addAll of ASSETS.
    expect(swSource).not.toMatch(/\.put\(/);
    expect(swSource).not.toMatch(/\/api/);
  });
});
