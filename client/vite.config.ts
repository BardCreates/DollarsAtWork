import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the React app runs on http://localhost:5173 and forwards /api to the .NET API,
// so the browser sees one address and the sign-in cookie just works.
// Build: output goes straight into the API's wwwroot so one server hosts both.
export default defineConfig(({ mode }) => {
  // Optional overrides for running a second copy against another API, e.g. while testing:
  // DAW_PORT=5174 DAW_API_URL=https://localhost:7190
  const env = loadEnv(mode, '.', 'DAW_');

  return {
    plugins: [react()],
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
