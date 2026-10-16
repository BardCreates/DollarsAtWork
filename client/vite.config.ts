import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { buildSitemap, publishedPosts } from './src/lib/sitemap';

/**
 * Writes sitemap.xml into the build from the blog's Markdown files, so a newly published post is listed the
 * moment it deploys. (Node's fs is loaded by name because this project has no Node type definitions.)
 */
function sitemap(): Plugin {
  return {
    name: 'daw-sitemap',
    apply: 'build',
    async generateBundle() {
      const fs = await import(/* @vite-ignore */ 'node:' + 'fs');
      const dir = 'src/content/blog';
      const files: Record<string, string> = {};
      for (const name of fs.readdirSync(dir) as string[]) {
        if (name.endsWith('.md')) files[name] = fs.readFileSync(`${dir}/${name}`, 'utf8') as string;
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(publishedPosts(files)) });
    },
  };
}

// Dev: the React app runs on http://localhost:5173 and forwards /api to the .NET API,
// so the browser sees one address and the sign-in cookie just works.
// Build: output goes straight into the API's wwwroot so one server hosts both.
export default defineConfig(({ mode }) => {
  // Optional overrides for running a second copy against another API, e.g. while testing:
  // DAW_PORT=5174 DAW_API_URL=https://localhost:7190
  const env = loadEnv(mode, '.', 'DAW_');

  return {
    plugins: [react(), sitemap()],
    server: {
      port: Number(env.DAW_PORT) || 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.DAW_API_URL || 'https://localhost:7180',
          changeOrigin: true,
          secure: false, // the API's local development certificate
        },
      },
    },
    build: {
      outDir: '../server/DollarsAtWork.Api/wwwroot',
      emptyOutDir: true,
    },
  };
});
