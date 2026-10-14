// Terrazzo 2.8.0 config, week 1 dry run (plan §7.1, §7.3): proves the real Figma export resolves
// and records the names Terrazzo emits. Week 2 adds the light-dark() transform, the tailwind,
// js-refs and contract plugins, the code-owned sources and the real dist/ output.
//
// Run from packages/tokens: `pnpm tokens:check` (tz check) and `pnpm tokens:dry-run` (tz build).
// NZ_TOKENS_OUT_DIR moves the dry-run output; the default is gitignored and never published.
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@terrazzo/cli';
import css from '@terrazzo/plugin-css';

const PREFIX = process.env.NZ_TOKEN_PREFIX ?? 'nz';

/** `color.bg.surface` → `--nz-bg-surface`: there is no `--nz-color-*` family (plan §7.2). */
export const variableName = (token: { id: string }): string =>
  `--${PREFIX}-${token.id.replace(/^color\./, '').replace(/\./g, '-')}`;

/** Each scoped block re-declares only its own modifier's groups (spike S3a's include recipe). */
export const MOTION_GROUPS: string[] = [
  'duration.**',
  'easing.**',
  'distance.**',
  'scale.**',
  'tilt.**',
  'stagger.**',
  'magnetic.**',
];
export const VIEWPORT_GROUPS: string[] = ['grid.**', 'layout.**', 'type.**', 'section.**'];
const PRIMITIVES = ['color.p.**'];
/** Figma frame widths, not breakpoints (plan §7.2). */
const NOT_EMITTED = ['layout.viewport'];

// Terrazzo infers the indentation from the text before the declarations in each template.
const block =
  (selector: string) =>
  (declarations: string): string =>
    `${selector} {\n  ${declarations}\n}`;
const media =
  (query: string) =>
  (declarations: string): string =>
    `@media ${query} {\n  :root {\n    ${declarations}\n  }\n}`;
/** The OS setting and the `data-nz-motion` override get the same declarations (plan §7.4). */
const reduced = (declarations: string): string =>
  `${media('(prefers-reduced-motion: reduce)')(declarations)}\n${block('[data-nz-motion="reduce"]')(declarations.replaceAll('\n    ', '\n  '))}`;

const fromHere = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  tokens: [fromHere('../src/nizivo.resolver.json')],
  outDir: process.env.NZ_TOKENS_OUT_DIR ?? fromHere('../node_modules/.cache/tokens-dry-run/'),
  plugins: [
    css({
      filename: 'tokens.css',
      variableName,
      legacyHex: true,
      // No permutation repeats the defaults (light, default, mobile): its id would collide with the
      // base block's and their transforms would merge (S3a).
      permutations: [
        {
          input: { theme: 'light', motion: 'default', viewport: 'mobile' },
          exclude: NOT_EMITTED,
          prepare: block(':root'),
        },
        // Dry run only: proves the Dark context resolves. Week 2 folds it into light-dark() on :root.
        {
          input: { theme: 'dark' },
          only: { modifiers: ['theme'] },
          include: ['color.**'],
          exclude: PRIMITIVES,
          prepare: block('[data-nz-theme="dark"]'),
        },
        {
          input: { motion: 'reduced' },
          only: { modifiers: ['motion'] },
          include: MOTION_GROUPS,
          exclude: PRIMITIVES,
          prepare: reduced,
        },
        {
          input: { viewport: 'tablet' },
          only: { modifiers: ['viewport'] },
          include: VIEWPORT_GROUPS,
          exclude: [...PRIMITIVES, ...NOT_EMITTED],
          prepare: media(`(--${PREFIX}-sm)`),
        },
        {
          input: { viewport: 'desktop' },
          only: { modifiers: ['viewport'] },
          include: VIEWPORT_GROUPS,
          exclude: [...PRIMITIVES, ...NOT_EMITTED],
          prepare: media(`(--${PREFIX}-lg)`),
        },
      ],
    }),
  ],
});
