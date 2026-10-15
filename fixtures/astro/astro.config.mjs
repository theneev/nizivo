// Astro 7.3 fixture with React islands (ARCHITECTURE.md §11.1, §18.1): static output, `astro build`
// then `astro preview`, checked by fixtures/runner/astro.ts. Unlike a plain Vite 8 build, Astro 7.3.8
// keeps every light-dark() in tokens.css with no CSS target set (runner/theme.ts counts them).
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

export default defineConfig({
  integrations: [react()],
});
