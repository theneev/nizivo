// `pnpm gate <commit>…`: every commit passes its own `pnpm check` (ARCHITECTURE.md §18.1 "Cache
// inputs", M39). Each commit is checked out in a detached, cleaned worktree and runs the steps of
// the root `check` script it carries, from turbo's cache, then `pnpm cache:audit`, so a cache hit
// cannot replay a stale result. The last commit also runs with TURBO_FORCE=true, and so does a
// commit from before `cache:audit` existed.
//
// The commits share one list of proven tasks (`cache:audit --proven`): a task whose turbo hash and
// audit rules match one already proven earlier in this run is not audited again, because the same
// inputs read the same files. The last commit's audit runs every task, as before.
//
//   node packages/tooling/gate/gate.ts [--worktree <dir>] <commit>…
//
// --worktree defaults to a `gate-wt` folder beside the repository; it is created when missing and
// removed when the gate passes. Each step's output goes to `<worktree>.log`; a failing step prints
// the lines of it that look like errors, and the gate stops there with exit code 1.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const PNPM = ['corepack', 'pnpm@12.11.2'];
/** The log lines a failing step prints: what turbo, tsc, vitest, size-limit and cache:audit say. */
const ERROR_LINE = /ERR|error|Error|failed|FAIL|exceeded|turbo does not hash/;

const { values, positionals: names } = parseArgs({
  allowPositionals: true,
  options: { worktree: { type: 'string' } },
});
if (names.length === 0) {
  console.error('usage: node packages/tooling/gate/gate.ts [--worktree <dir>] <commit>…');
  process.exit(2);
}

const git = (...args: string[]): string => {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr.trim()}`);
  return result.stdout.trim();
};

const root = git('rev-parse', '--show-toplevel');
// Resolved here, in the repository the command runs in: `HEAD` or `main~1` read inside a reused
// worktree would name that worktree's commits.
const commits = names.map((name) => git('rev-parse', '--verify', `${name}^{commit}`));
const worktree = resolve(values.worktree ?? join(dirname(root), 'gate-wt'));
const log = `${worktree}.log`;
const created = !existsSync(worktree);
if (created) git('worktree', 'add', '--detach', worktree, commits[0]!);

/** The root package.json's `scripts`, the string entries only. */
function rootScripts(manifest: unknown): Record<string, string> {
  const scripts: unknown =
    typeof manifest === 'object' && manifest !== null && 'scripts' in manifest
      ? manifest.scripts
      : {};
  if (typeof scripts !== 'object' || scripts === null) return {};
  return Object.fromEntries(
    Object.entries(scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/** The steps of a root `check` script: `pnpm a && pnpm b` → ['a', 'b']. */
/** The run's list of proven tasks, shared by every commit's audit. */
const provenDir = mkdtempSync(join(tmpdir(), 'nz-gate-'));
const proven = join(provenDir, 'proven.json');

function checkSteps(scripts: Record<string, string>): string[] {
  const steps = (scripts['check'] ?? '')
    .split('&&')
    .map((step) => step.trim().replace(/^pnpm\s+/, ''));
  return [...steps.filter(Boolean), ...('cache:audit' in scripts ? ['cache:audit'] : [])];
}

let passed = true;
for (const commit of commits) {
  git('-C', worktree, 'checkout', '-q', '--detach', commit);
  git('-C', worktree, 'clean', '-qfdx');
  const started = performance.now();
  const scripts = rootScripts(JSON.parse(readFileSync(join(worktree, 'package.json'), 'utf8')));
  const forced = commit === commits.at(-1) || !('cache:audit' in scripts);
  console.log(
    `## ${git('-C', worktree, 'log', '-1', '--format=%h %s')} [${forced ? 'forced' : 'cached'}]`,
  );
  const env = {
    ...process.env,
    COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
    TURBO_TELEMETRY_DISABLED: '1',
    ...(forced ? { TURBO_FORCE: 'true' } : {}),
  };
  if (!forced) delete env['TURBO_FORCE'];
  // a commit's own audit.ts may predate --proven; the forced last commit audits every task
  const auditFile = join(worktree, 'packages', 'tooling', 'cache-audit', 'audit.ts');
  const knowsProven = existsSync(auditFile) && readFileSync(auditFile, 'utf8').includes('--proven');
  const steps = checkSteps(scripts).map((step) =>
    step === 'cache:audit' && !forced && knowsProven ? `${step} --proven ${proven}` : step,
  );
  for (const step of steps) {
    const [command, ...rest] = [...PNPM, ...step.split(/\s+/)];
    const result = spawnSync(command!, rest, {
      cwd: worktree,
      env,
      encoding: 'utf8',
      maxBuffer: 1 << 30,
    });
    writeFileSync(log, `${result.stdout}${result.stderr}`);
    if (result.status !== 0) {
      console.log(`  FAIL: ${step}`);
      const lines = `${result.stdout}${result.stderr}`
        .split('\n')
        .filter((line) => ERROR_LINE.test(line));
      for (const line of lines.slice(0, 12)) console.log(`    ${line}`);
      passed = false;
      break;
    }
    console.log(`  ok: ${step}`);
  }
  console.log(`  (${Math.round((performance.now() - started) / 1000)} s)`);
  if (!passed) break;
}

rmSync(provenDir, { recursive: true, force: true });
if (passed && created) git('worktree', 'remove', '--force', worktree);
console.log(
  passed
    ? `gate passed: ${commits.length} commit(s)`
    : `gate failed; the step log is ${basename(log)}`,
);
process.exit(passed ? 0 : 1);
