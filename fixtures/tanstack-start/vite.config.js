// TanStack Start fixture (ARCHITECTURE.md §11.1, §18.1; v0.3): `vite build` makes the client and the
// server, fixtures/runner/tanstack-start.ts starts the server and checks it. No `ssr.noExternal`:
// the server imports @nizivo/* from node_modules as published.
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Start's plugin goes before React's
  plugins: [tanstackStart(), react()],
  build: {
    // Nizivo's support floor, as in fixtures/vite (Lightning CSS keeps light-dark() at this target).
    cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5'],
  },
});
