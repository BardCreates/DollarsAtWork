// TEMPORARY: screenshots of the new pages for review. Removed before merging.
import { chromium } from 'playwright';
import { appendFileSync, mkdirSync } from 'node:fs';

const base = 'http://localhost:4173';
const out = 'shots';
mkdirSync(out, { recursive: true });
appendFileSync(`${out}/errors.txt`, '');

const me = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'alex@example.com',
  emailConfirmed: true,
  access: { status: 'Trialing', hasFullAccess: true, trialEndsAt: '2026-11-14T00:00:00Z', trialDaysLeft: 30, currentPeriodEnd: null, billingInterval: null, hasBillingAccount: false },
  hints: { off: false, dismissed: [] },
};
const prices = { enabled: true, monthly: { amount: 7, currency: 'usd' }, annual: { amount: 59, currency: 'usd' } };

async function run(name, path, width, signedIn, action) {
  try {
    await shoot(name, path, width, signedIn, action);
  } catch (error) {
    appendFileSync(`${out}/errors.txt`, `${name}-${width}: ${error}\n`);
  }
}

async function shoot(name, path, width, signedIn, action) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => appendFileSync(`${out}/errors.txt`, `${name}-${width} page error: ${e}\n`));
  page.on('console', (m) => m.type() === 'error' && appendFileSync(`${out}/console.txt`, `${name}-${width}: ${m.text()}\n`));
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    if (url.includes('/api/auth/me')) return signedIn ? route.fulfill({ json: me }) : route.fulfill({ status: 401, json: {} });
    if (url.includes('/api/billing/prices')) return route.fulfill({ json: prices });
    if (url.includes('/api/waitlist')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, json: { title: 'Not found' } });
  });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  if (action) await action(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
  await browser.close();
}

for (const width of [390, 1280]) {
  await run('home', '/', width, false);
  await run('help', '/help', width, false);
  await run('help-search', '/help?q=turn%20hints%20back%20on', width, false);
  await run('help-article', '/help/debt', width, false);
  await run('tools-visitor', '/tools?tool=payoff', width, false);
  await run('tools-signed-in-hint', '/tools', width, true);
  await run('profile', '/profile', width, true);
  await run('waitlist-sent', '/', width, false, async (page) => {
    const box = page.getByLabel('Email').last();
    await box.fill('test@example.com');
    await page.getByRole('button', { name: 'Keep me posted' }).last().click();
    await page.getByText("You're on the list").waitFor();
  });
}
