// Terrazzo 2.8.0 config: the token build (plan §7.1, §7.3). `pnpm build` runs it after tsdown and
// writes dist/tokens.css, dist/custom-media.css, dist/tailwind.css and dist/contract.json.
//
// Run from packages/tokens: `pnpm tokens:check` (tz check) and `pnpm tokens:build` (tz build).
// NZ_TOKENS_OUT_DIR moves the output (tests build into a temporary folder); NZ_TOKEN_PREFIX
// rebuilds every name with another prefix (§7.3; published packages always use `nz`).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';
import {
  captureResolver,
  permutations,
  subValueVariableName,
  tokenValue,
  variableName,
} from './css.ts';
import { contract, customMedia, tailwind } from './plugins.ts';

export { MOTION_GROUPS, VIEWPORT_GROUPS, variableName } from './css.ts';

const fromHere = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

const pkg: { version: string } = JSON.parse(readFileSync(fromHere('../package.json'), 'utf8'));

export default defineConfig({
  tokens: [fromHere('../src/nizivo.resolver.json')],
  outDir: process.env.NZ_TOKENS_OUT_DIR ?? fromHere('../dist/'),
  plugins: [
    captureResolver,
    css({
      filename: 'tokens.css',
      variableName,
      subValueVariableName,
      transform: tokenValue,
      legacyHex: true,
      permutations: permutations(pkg.version),
    }),
    customMedia({ filename: 'custom-media.css' }),
    tailwind({ filename: 'tailwind.css' }),
    contract({ filename: 'contract.json' }),
  ],
});
