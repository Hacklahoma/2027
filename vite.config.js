import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build into build/ to match the earlier Hacklahoma sites on Netlify.
// Two pages: the root (/) is the plain 2027 announcement; the new site is at /preview.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    // the 3D scene (three.js) is its own lazily loaded chunk, so a large size is expected there
    chunkSizeWarningLimit: 600,
    rollupOptions: { input: { main: 'index.html', preview: 'preview/index.html' } },
  },
  // only the site itself; the design studies in explorations/ are standalone pages
  optimizeDeps: { entries: ['index.html', 'preview/index.html'] },
  // `vite preview` is only for testing (e.g. on a phone over Wi-Fi): never let the phone cache it, or
  // after a rebuild Safari shows a cached page that points at style files that no longer exist
  preview: { headers: { 'Cache-Control': 'no-store' } },
});
