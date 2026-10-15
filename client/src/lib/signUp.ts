/**
 * Every "start your free trial" button links here with the page it sits on, such as "home", "tools/payoff" or
 * "blog/gas-prices". The sign-up page sends that along, and the server keeps it on the new account so the owner
 * can see which pages bring in trials. Only a short plain path is used; the server checks it again.
 */
const SOURCE = /^[a-z0-9][a-z0-9/_-]{0,79}$/;

export function cleanSignupSource(value: string | null | undefined): string | undefined {
  const v = (value ?? '').trim().toLowerCase();
  return SOURCE.test(v) ? v : undefined;
}

/** The sign-up page, remembering which page sent the visitor. */
export function signUpPath(from?: string): string {
  const source = cleanSignupSource(from);
  return source ? `/sign-up?from=${encodeURIComponent(source)}` : '/sign-up';
}

/** A page path as a sign-up source: "/blog/gas-prices" becomes "blog/gas-prices", "/" becomes "home". */
export function sourceFromPath(pathname: string): string | undefined {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return cleanSignupSource(trimmed || 'home');
}
