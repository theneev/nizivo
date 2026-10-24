// Starts a fixture's production server (`vite preview`, `astro preview`) in its own process group and
// returns its stop function. Refuses to start when the port already answers, so every page the spec
// checks comes from the build just made.
/* oxlint-disable no-await-in-loop -- polling one server */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { status } from './http.ts';
import { REPO_ROOT } from './pack.ts';

async function answers(base: string): Promise<boolean> {
  return (await status(base)) !== undefined;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function serve(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  base: string,
): Promise<() => Promise<void>> {
  if (await answers(base)) throw new Error(`${base} already answers; stop that server first`);
  const child = spawn(command, args, { cwd, env, stdio: 'ignore', detached: true });
  const stop = async () => {
    if (child.pid !== undefined) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
    for (let attempt = 0; attempt < 40 && (await answers(base)); attempt++) await sleep(250);
    if (await answers(base)) throw new Error(`${command} still answers on ${base}`);
  };
  for (let attempt = 0; attempt < 120; attempt++) {
    const code = await status(base);
    if (code !== undefined && code >= 200 && code < 300) return stop;
    await sleep(250);
  }
  await stop();
  throw new Error(`${command} ${args.join(' ')} did not answer on ${base}`);
}

/** Runs a command to completion in `cwd`; returns its output, or throws with it. */
export function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): string {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  const output = `${result.stdout}${result.stderr}`;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed:\n${output}`);
  return output;
}

/** The version of an installed package: a name under `<fixture>/node_modules`, or an absolute folder. */
export function version(fixtureDir: string, name: string): string {
  const file = join(
    isAbsolute(name) ? name : join(fixtureDir, 'node_modules', name),
    'package.json',
  );
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return typeof parsed === 'object' && parsed !== null && 'version' in parsed
    ? String(parsed.version)
    : 'unknown';
}

/** Writes a committed results file and lays it out the way the repo's `oxfmt --check` expects. */
/**
 * Where a run's results file goes: the committed `<fixture>/results/<name>` only with `--record`,
 * otherwise a temporary folder, so a lane run (`pnpm check:full`, the release script) leaves the
 * tree clean.
 */
export function resultsFile(fixtureDir: string, name: string, record: boolean): string {
  return record
    ? join(fixtureDir, 'results', name)
    : join(tmpdir(), 'nizivo-fixture-results', basename(fixtureDir), name);
}

export function writeResults(file: string, result: object): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(result, null, 2)}\n`);
  // Committed files: lay them out the way the repo's `oxfmt --check` expects.
  spawnSync(join(REPO_ROOT, 'node_modules', '.bin', 'oxfmt'), [file], { stdio: 'ignore' });
  console.log(`results: ${file}`);
}
