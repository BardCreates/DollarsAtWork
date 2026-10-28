// Writes the pre-rendered public pages into the build (R21a). Runs after `vite build` and
// `vite build --ssr src/prerender/entry.tsx` (see package.json "build"); see src/prerender/entry.tsx.
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const client = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(client, '../server/DollarsAtWork.Api/wwwroot');
const ssr = join(client, 'node_modules/.prerender');

const { prerenderAll } = await import(pathToFileURL(join(ssr, 'entry.js')).href);

// The plain app shell stays available for every other address (sign-in, the app pages): the server falls back to it.
const shell = readFileSync(join(out, 'index.html'), 'utf8');
copyFileSync(join(out, 'index.html'), join(out, 'app.html'));

const pages = prerenderAll(shell);
for (const page of pages) {
  const file = join(out, page.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, page.html);
}
rmSync(ssr, { recursive: true, force: true });
console.log(`Pre-rendered ${pages.length} public pages.`);
