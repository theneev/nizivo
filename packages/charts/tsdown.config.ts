import { libraryPreset } from '@nizivo/tsdown-preset';
import type { UserConfig } from 'tsdown';

// One entry per exports-map subpath, as in @nizivo/react: with only src/index.ts, rolldown inlines
// the hop through each src/<part>/index.ts and dist/<part>/index.js is never written. Unbundled
// (the preset), so 'use client' stays on the one module that declares it (the ChartInteraction
// island) and every other module, the barrels included, stays directive-free. d3-shape and
// d3-array stay bare imports (dependencies are never bundled). The CSS is built after this by
// scripts/build-css.ts, so no stylesheet goes through rolldown.
const config: UserConfig = libraryPreset({
  entry: ['src/index.ts', 'src/*/index.ts'],
});

export default config;
