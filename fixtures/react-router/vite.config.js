// React Router 8 framework-mode fixture (ARCHITECTURE.md §18.1, §21.2; r1 §5.4): `react-router build`
// on Vite 8, served by server.js and checked by fixtures/runner/react-router.ts. No `ssr.noExternal`:
// the server build imports @nizivo/* from node_modules (r1 §5.2, decision D7).
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [reactRouter()],
  build: {
    // Nizivo's support floor, as in fixtures/vite (Lightning CSS keeps light-dark() at this target).
    cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5'],
  },
});
