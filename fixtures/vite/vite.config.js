// Vite 8 SPA fixture (ARCHITECTURE.md §11.1, §18.1): `vite build` then `vite preview`, checked by
// fixtures/runner/vite.ts.
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
    // Nizivo's support floor. Vite 8 minifies CSS with Lightning CSS for its default target
    // ('baseline-widely-available'), which lowers every light-dark() in tokens.css into a fallback that
    // ignores nested data-nz-theme scopes and inverse surfaces (0 of 68 kept). At the floor all are kept.
    // A browserslist in package.json does not change this; Vite reads only build.cssTarget.
    cssTarget: ['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5'],
  },
});
