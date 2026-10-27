// The registry fixture's Vite app (fixtures/runner/registry.ts): the `@/` alias from tsconfig.json, and
// Nizivo's support floor as the CSS target, as in fixtures/vite.
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5'],
    // one page renders all 23 patterns, charts and React Aria included (607 kB minified on
    // 2026-10-27): not a size claim, so only a page past 1 MB warns (the runner fails on a warning)
    chunkSizeWarningLimit: 1000,
  },
});
