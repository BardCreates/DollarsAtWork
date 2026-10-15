// TEMPORARY: screenshots of the blog for review. Removed before merging.
import { chromium } from 'playwright';
import { appendFileSync, mkdirSync } from 'node:fs';
const base = 'http://localhost:4173';
const out = 'shots';
mkdirSync(out, { recursive: true });
appendFileSync(`${out}/errors.txt`, '');
async function run(name, path, width) {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', (e) => appendFileSync(`${out}/errors.txt`, `${name}-${width} page error: ${e}\n`));
    await page.route('**/api/**', (route) =>
      route.request().url().includes('/api/auth/me') ? route.fulfill({ status: 401, json: {} }) : route.fulfill({ status: 404, json: {} }),
    );
    await page.goto(base + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
    await browser.close();
  } catch (error) {
    appendFileSync(`${out}/errors.txt`, `${name}-${width}: ${error}\n`);
  }
}
for (const width of [390, 1280]) {
  await run('blog', '/blog', width);
  await run('post-card', '/blog/rates-are-rising-shrink-your-card-debt', width);
  await run('post-mortgage', '/blog/mortgage-rates-stuck-what-an-extra-100-does', width);
}
