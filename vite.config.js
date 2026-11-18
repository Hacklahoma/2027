import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build into build/ to match the earlier Hacklahoma sites on Netlify.
export default defineConfig({
  plugins: [react()],
  // the 3D scene (three.js) is its own lazily loaded chunk, so a large size is expected there
  build: { outDir: 'build', chunkSizeWarningLimit: 600 },
  // only the site itself; the design studies in explorations/ are standalone pages
  optimizeDeps: { entries: ['index.html'] },
});
