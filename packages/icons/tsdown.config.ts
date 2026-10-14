import { libraryPreset } from '@nizivo/tsdown-preset';
import type { UserConfig } from 'tsdown';

// One entry per published module: the barrel, every icon and every brand glyph (all written by
// scripts/generate.ts before this runs). Unbundled, so each icon stays its own file and a bundler
// that reaches one icon through the barrel or its subpath keeps only that file and _internal/icon.js.
const config: UserConfig = libraryPreset({
  entry: ['src/index.ts', 'src/icons/*.ts', 'src/brands/*.ts'],
});

export default config;
