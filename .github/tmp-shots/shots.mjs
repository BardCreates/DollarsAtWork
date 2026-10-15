// TEMPORARY: screenshots of a post with its calls to action. Removed before merging.
import { chromium } from 'playwright';
import { appendFileSync, mkdirSync } from 'node:fs';
const base = 'http://localhost:4173';
const out = 'shots';
mkdirSync(out, { recursive: true });
appendFileSync(`${out}/errors.txt`, '');
const me = {
  id: '1', email: 'alex@example.com', emailConfirmed: true,
  access: { status: 'Active', hasFullAccess: true, trialEndsAt: '2026-11-14T00:00:00Z', trialDaysLeft: 0, currentPeriodEnd: null, billingInterval: 'month', hasBillingAccount: true },
  hints: { off: true, dismissed: [] },
};
let registered = null;
async function run(name, path, width, signedIn, action) {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => appendFileSync(`${out}/errors.txt`, `${name}-${width} page error: ${e}\n`));
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/api/auth/register')) { registered = route.request().postDataJSON(); return route.fulfill({ status: 400, json: { title: 'stop here' } }); }
      if (url.includes('/api/auth/me')) return signedIn ? route.fulfill({ json: me }) : route.fulfill({ status: 401, json: {} });
      return route.fulfill({ status: 404, json: {} });
    });
    await page.goto(base + path, { waitUntil: 'networkidle' });
    if (action) await action(page);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
    await browser.close();
  } catch (error) {
    appendFileSync(`${out}/errors.txt`, `${name}-${width}: ${error}\n`);
  }
}
await run('post-visitor', '/blog/rates-are-rising-shrink-your-card-debt', 1280, false);
await run('post-visitor', '/blog/rates-are-rising-shrink-your-card-debt', 390, false);
await run('post-signed-in', '/blog/inflation-hit-3-7-percent-is-your-savings-getting-a-raise', 1280, true);
// Follow the mid-post button to sign-up and submit, to check the source reaches the server.
await run('signup-from-post', '/blog/rates-are-rising-shrink-your-card-debt', 1280, false, async (page) => {
  await page.getByRole('link', { name: 'Find my debt-free date' }).first().click();
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: /create account/i }).click();
  await page.waitForTimeout(800);
  appendFileSync(`${out}/register.txt`, `url=${page.url()}\nbody=${JSON.stringify(registered)}\n`);
});
