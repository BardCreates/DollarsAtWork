import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: the React app runs on http://localhost:5173 and forwards /api to the .NET API,
// so the browser sees one address and the sign-in cookie just works.
// Build: output goes straight into the API's wwwroot so one server hosts both.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://localhost:7180',
        changeOrigin: true,
        secure: false, // the API's local development certificate
      },
    },
  },
  build: {
    outDir: '../server/DollarsAtWork.Api/wwwroot',
    emptyOutDir: true,
  },
});
