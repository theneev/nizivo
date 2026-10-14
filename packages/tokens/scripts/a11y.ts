// `node scripts/a11y.ts`: the a11y gate after `tz build` (plan §15.4). Fails on any contrast miss,
// override drift, redundant override or proposal, expired entry or malformed metadata.
// `--write` rewrites CONTRAST.md (the human-readable golden); `--check` fails when it is stale.
//
// Usage: node scripts/a11y.ts [--css <tokens.css>] [--write | --check]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { check, renderMatrix } from '../build/a11y.ts';
import { PACKAGE_ROOT } from './figma/snapshot.ts';

export const CONTRAST_MD: string = resolve(PACKAGE_ROOT, 'CONTRAST.md');

function run(args: string[]): number {
  const cssIndex = args.indexOf('--css');
  const cssPath =
    cssIndex === -1 ? resolve(PACKAGE_ROOT, 'dist/tokens.css') : resolve(args[cssIndex + 1] ?? '');
  const report = check(readFileSync(cssPath, 'utf8'));
  for (const warning of report.warnings) console.warn(`warning: ${warning}`);
  const markdown = renderMatrix(report);
  let status = 0;
  if (args.includes('--write')) {
    writeFileSync(CONTRAST_MD, markdown);
    console.log('Wrote CONTRAST.md');
  } else if (args.includes('--check') && readFileSync(CONTRAST_MD, 'utf8') !== markdown) {
    console.error('CONTRAST.md is stale. Run pnpm tokens:contrast.');
    status = 1;
  }
  if (report.errors.length > 0) {
    console.error('The token a11y check failed:');
    for (const error of report.errors) console.error(`  ${error}`);
    return 1;
  }
  const pairs = report.results.filter((r) => r.threshold !== undefined).length;
  console.log(
    `Contrast: ${pairs} checked pairs pass in light and dark; ${report.sources.overrides.length} overrides, ${report.sources.proposals.length} proposals`,
  );
  return status;
}

if (import.meta.main) {
  process.exitCode = run(process.argv.slice(2));
}
