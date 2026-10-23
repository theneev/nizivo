// The slow lanes outside `pnpm check` (plan.ts RELEASE_LANES; ARCHITECTURE.md §18.1), run in order:
// the browser and overlay lanes, the Next, Vite and Astro fixtures on the packed packages, and the
// visual regression lane. `pnpm check:full` is `pnpm check` followed by this script, and the release
// script (release.ts, step 5) runs the same list, so the two can never disagree.
//
//   node packages/tooling/release/lanes.ts                 every lane; exit 1 if any failed
//   node packages/tooling/release/lanes.ts --only visual,fixture-vite
//   node packages/tooling/release/lanes.ts --list          print the lanes and stop
//
// Every lane runs even when an earlier one fails, and a table of times and results ends the run. The
// fixture lanes rewrite their committed results/*.json files, so commit or restore them afterwards.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from '../../../fixtures/runner/pack.ts';
import { RELEASE_LANES } from './plan.ts';

const { values } = parseArgs({
  options: { only: { type: 'string' }, list: { type: 'boolean' } },
});

const manifest: unknown = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'));
const pnpmVersion =
  typeof manifest === 'object' &&
  manifest !== null &&
  'packageManager' in manifest &&
  typeof manifest.packageManager === 'string'
    ? manifest.packageManager.replace(/^pnpm@/, '')
    : '';
if (pnpmVersion === '') throw new Error('lanes: the root package.json has no packageManager pin');

const only = values.only?.split(',').map((id) => id.trim());
const unknown = only?.filter((id) => !RELEASE_LANES.some((lane) => lane.id === id)) ?? [];
if (unknown.length > 0) {
  console.error(`lanes: no lane ${unknown.join(', ')}; see --list`);
  process.exit(2);
}
const lanes = RELEASE_LANES.filter((lane) => only === undefined || only.includes(lane.id));

if (values.list === true) {
  for (const lane of lanes)
    console.log(`${lane.id.padEnd(16)} ${lane.dir} "${lane.script}"  ${lane.why}`);
  process.exit(0);
}

const results: { id: string; status: number; seconds: number; blocking: boolean }[] = [];
for (const lane of lanes) {
  console.log(
    `\n=== lane ${lane.id}: ${lane.dir} "${lane.script}"${lane.env ? ` ${JSON.stringify(lane.env)}` : ''}`,
  );
  const start = performance.now();
  const run = spawnSync('corepack', [`pnpm@${pnpmVersion}`, 'run', lane.script], {
    cwd: join(REPO_ROOT, lane.dir),
    stdio: 'inherit',
    env: {
      ...process.env,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
      TURBO_TELEMETRY_DISABLED: '1',
      ...lane.env,
    },
  });
  results.push({
    id: lane.id,
    status: run.status ?? 1,
    seconds: Math.round((performance.now() - start) / 100) / 10,
    blocking: lane.blocking !== false,
  });
}

console.log('\nlane             result  seconds');
for (const r of results) {
  console.log(
    `${r.id.padEnd(16)} ${(r.status === 0 ? 'ok' : `FAIL ${r.status}`).padEnd(7)} ${r.seconds}${r.blocking ? '' : '  (non-blocking)'}`,
  );
}
const reported = results.filter((r) => r.status !== 0 && !r.blocking);
if (reported.length > 0) {
  console.warn(`\nlanes: non-blocking lane(s) failed: ${reported.map((r) => r.id).join(', ')}`);
}
const failed = results.filter((r) => r.status !== 0 && r.blocking);
if (failed.length > 0) {
  console.error(
    `\nlanes: ${failed.length} of ${results.length} failed: ${failed.map((r) => r.id).join(', ')}`,
  );
  process.exit(1);
}
console.log(
  `\nlanes: all ${results.length} ran; every blocking lane passed` +
    (reported.length > 0 ? `, ${reported.length} non-blocking failed` : ''),
);
