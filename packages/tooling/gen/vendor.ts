/**
 * The helpers @nizivo/charts vendors from @nizivo/react (ARCHITECTURE.md §4.1 L6, §14.1): charts
 * imports nothing from core, so `nz gen` copies core's `renderElement`/`mergeProps` (and the `cx`
 * they use) into packages/charts/src/_shared, and `nz gen --check` fails when a copy drifts. Pure:
 * it reads the sources and returns contents, it never writes.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TS_HEADER } from './format.ts';

interface Vendored {
  /** Repo-relative source in @nizivo/react. */
  from: string;
  /** Repo-relative copy in @nizivo/charts. */
  to: string;
  /** Exact specifier rewrites, so the copy imports only its siblings. */
  rewrite?: ReadonlyArray<readonly [string, string]>;
}

export const CHARTS_SHARED = 'packages/charts/src/_shared';

export const VENDORED: readonly Vendored[] = [
  { from: 'packages/react/src/_internal/cx.ts', to: `${CHARTS_SHARED}/cx.ts` },
  {
    from: 'packages/react/src/contracts/merge-props.ts',
    to: `${CHARTS_SHARED}/merge-props.ts`,
    rewrite: [["from '../_internal/cx'", "from './cx'"]],
  },
  { from: 'packages/react/src/contracts/render.ts', to: `${CHARTS_SHARED}/render.ts` },
];

const RELATIVE = /\bfrom\s*'(\.{1,2}\/[^']+)'/g;

export interface VendorResult {
  /** Absolute path → content. Empty when the repo has no packages/charts. */
  files: Map<string, string>;
  errors: string[];
}

export function generateVendored(root: string): VendorResult {
  const files = new Map<string, string>();
  const errors: string[] = [];
  if (!existsSync(join(root, 'packages', 'charts', 'package.json'))) return { files, errors };
  const siblings = new Set(VENDORED.map((v) => `./${v.to.slice(CHARTS_SHARED.length + 1, -3)}`));
  for (const { from, to, rewrite = [] } of VENDORED) {
    const source = join(root, from);
    if (!existsSync(source)) {
      errors.push(`${to}: its source ${from} is missing`);
      continue;
    }
    let text = readFileSync(source, 'utf8');
    for (const [find, replace] of rewrite) {
      if (!text.includes(find)) errors.push(`${from}: expected \`${find}\` to rewrite for ${to}`);
      text = text.replaceAll(find, replace);
    }
    for (const [, specifier = ''] of text.matchAll(RELATIVE)) {
      if (!siblings.has(specifier)) {
        errors.push(
          `${from} imports '${specifier}', which charts does not vendor: add it to VENDORED in packages/tooling/gen/vendor.ts`,
        );
      }
    }
    const header = [
      TS_HEADER,
      `// Vendored from ${from}: @nizivo/charts imports nothing from @nizivo/react (§14.1).`,
    ].join('\n');
    files.set(join(root, to), `${header}\n${text}`);
  }
  return { files, errors };
}
