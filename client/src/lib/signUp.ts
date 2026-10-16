/**
 * Every "start your free trial" button links here with the page it sits on, such as "home", "tools/payoff" or
 * "blog/gas-prices". The sign-up page sends that along, and the server keeps it on the new account so the owner
 * can see which pages bring in trials. Only a short plain path is used; the server checks it again.
 *
 * A visitor who arrives through a shared link (dollarsatwork.app/?from=some-creator) keeps that tag for the visit:
 * it is remembered once at start-up and wins over the page name, so the creator gets credit for the sign-up.
 */
const SOURCE = /^[a-z0-9][a-z0-9/_-]{0,79}$/;

export function cleanSignupSource(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim().toLowerCase();
  return SOURCE.test(v) ? v : undefined;
}

/** The sign-up page, remembering which page sent the visitor, or the link they arrived through if there was one. */
export function signUpPath(from?: string): string {
  const source = cleanSignupSource(currentReferral() ?? from);
  return source ? `/sign-up?from=${encodeURIComponent(source)}` : '/sign-up';
}

/** A page path as a sign-up source: "/blog/gas-prices" becomes "blog/gas-prices", "/" becomes "home". */
export function sourceFromPath(pathname: string): string | undefined {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return cleanSignupSource(trimmed || 'home');
}

/** The ?from= tag in a query string, if it is a short plain tag. Pure: used by rememberReferral and its tests. */
export function referralFromSearch(search: string): string | undefined {
  return cleanSignupSource(new URLSearchParams(search).get('from'));
}

const REFERRAL_KEY = 'daw.from';
let referral: string | undefined;

/**
 * Call once when the app starts with the landing URL's query string. The tag is kept in memory and, so a page
 * reload in the same tab doesn't lose it, mirrored in sessionStorage. Only this plain tag is ever stored there:
 * never anything the person typed. It goes away when the tab closes.
 */
export function rememberReferral(search: string): void {
  const incoming = referralFromSearch(search);
  if (incoming) {
    referral = incoming;
    try {
      sessionStorage.setItem(REFERRAL_KEY, incoming);
    } catch {
      // Storage blocked (private window, strict settings): the in-memory copy still covers this page view.
    }
    return;
  }
  if (referral) return;
  try {
    referral = cleanSignupSource(sessionStorage.getItem(REFERRAL_KEY));
  } catch {
    // No storage here (blocked, or not a browser): nothing to pick up.
  }
}

/** The tag the visitor arrived with, if any. */
export function currentReferral(): string | undefined {
  return referral;
}

/** Tests only: start a fresh visit. */
export function forgetReferral(): void {
  referral = undefined;
  try {
    sessionStorage.removeItem(REFERRAL_KEY);
  } catch {
    // Nothing stored.
  }
}
