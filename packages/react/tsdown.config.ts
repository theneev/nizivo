import { libraryPreset } from '@nizivo/tsdown-preset';
import type { UserConfig } from 'tsdown';

// One entry per exports-map subpath: with only src/index.ts, rolldown inlines the hop through each
// src/<name>/index.ts and dist/<name>/index.js is never written. The CSS is built after this by
// scripts/build-css.ts (Lightning CSS), so no stylesheet goes through rolldown.
const config: UserConfig = libraryPreset({
  entry: [
    'src/index.ts',
    'src/*/index.ts',
    'src/unstable/*/index.ts',
    'src/augment.ts',
    // ./locales/<tag>: one plain-object catalogue per file (§16.4).
    'src/locales/*.ts',
  ],
});

export default config;
