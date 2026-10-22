// Vite 8 SSR fixture (ARCHITECTURE.md §11.1, §18.1; r1 §5.2): `vite build` for the client, then
// `vite build --ssr src/entry-server.jsx` for the server, served by server.js and checked by
// fixtures/runner/vite-ssr.ts. No `ssr.noExternal`: Vite externalises @nizivo/* in the server build,
// so Node loads the published files as they are; a package whose JavaScript imported its CSS would
// crash there (ERR_UNKNOWN_FILE_EXTENSION ".css"). Nizivo's never does (decision D7).
import react from '@vitejs/plugin-react';
import { themeScript } from '@nizivo/react/theme-script';
import { defineConfig } from 'vite';

/** Puts @nizivo/react's themeScript in <head>, from the installed package rather than a pasted copy. */
function nizivoThemeScript() {
  return {
    name: 'nizivo-theme-script',
    transformIndexHtml: () => [{ tag: 'script', children: themeScript, injectTo: 'head' }],
  };
}

export default defineConfig({
  plugins: [react(), nizivoThemeScript()],
  build: {
    // Nizivo's support floor, as in fixtures/vite (Lightning CSS keeps light-dark() at this target).
    cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5'],
  },
});
