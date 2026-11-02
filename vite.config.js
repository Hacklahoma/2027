import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Build into build/ to match the earlier Hacklahoma sites on Netlify.
export default defineConfig({
  plugins: [react()],
  build: { outDir: 'build' },
});
