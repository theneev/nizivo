import { libraryPreset } from '@nizivo/tsdown-preset';
import type { UserConfig } from 'tsdown';

// One entry per exports-map subpath: with only src/index.ts, rolldown inlines the hop through each
// src/<name>/index.ts and dist/<name>/index.js is never written.
const config: UserConfig = libraryPreset({
  entry: ['src/index.ts', 'src/*/index.ts', 'src/unstable/*/index.ts', 'src/augment.ts'],
  // Interim until the Lightning CSS build (ARCHITECTURE.md §21.1 W2): ship each component stylesheet
  // as-is at dist/css/<name>.css, the path nz gen writes into the exports map.
  copy: [{ from: ['src/*/*.css', 'src/unstable/*/*.css'], to: 'dist/css' }],
});

export default config;
