// `pnpm cache:audit`: proves that turbo hashes every file each cached task of `pnpm check` reads, so
// a cache hit can only replay a result the same files would produce again (ARCHITECTURE.md §18.1
// "Cache inputs"). A file a task reads but turbo does not hash is a missing input: change only that
// file, and turbo replays the old result instead of running the task.
//
//   node packages/tooling/cache-audit/audit.ts [--only <task id>,…] [--jobs <n>] [--keep]
//                                              [--proven <file>]
//
// 1. `turbo run build` (the outputs every task depends on), then `turbo run <TASKS> --dry=json`: each
//    task's hashed files, output globs and dependencies.
// 2. Each task with a command runs once, from a fresh copy of the repo that holds only the files it
//    may read (verdict.ts allowedFiles), the root files pnpm and Node look for, the packages'
//    node_modules link folders, and a link to the root node_modules.
// 3. A task fails the audit when it fails there (a missing input any tool needed, Node or native), when
//    its outputs differ from the repo's, or when one of its Node processes read a repo file outside
//    what it may read (trace.ts, even when the read did not change the result this time).
// --keep leaves the copies and the logs in the temporary folder it prints.
//
// --proven <file> (`pnpm gate` passes one file to every commit it checks): a JSON list of the tasks
// already proven, each as `<task id> <turbo hash> <audit hash>`. A task whose key is in the list is
// not run again, and each task that passes is added. Turbo's hash covers the task's hashed files,
// its dependencies' hashes, the global inputs and the declared environment, and the audit hash covers
// this tool's own files: the same key means the task reads the same files and is judged by the same
// rules, so the proof made for an earlier commit holds for this one. A missing file is an empty list.
/* oxlint-disable no-await-in-loop -- a fixed number of workers, each running tasks one at a time */
import { spawn, spawnSync } from 'node:child_process';
import {
  constants,
  copyFileSync,
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { availableParallelism, tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { allowedFiles, type TaskInfo, undeclared } from './verdict.ts';

/** The turbo tasks `pnpm check` runs. */
const TASKS = ['build', 'typecheck', 'test', 'lint', 'smoke'];
/** Kept in every copy: pnpm and Node look for them. Not allowed reads: a task that reads one is told. */
const ROOT_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'pnpm-lock.yaml',
  'turbo.json',
  '.npmrc',
];
/**
 * Read and not hashed, by design: Next looks for `.git` to find the repository root (the copies have
 * none, and the docs build still makes the same files without it).
 */
const IGNORED = new Set(['.git']);
/**
 * Outputs no two builds repeat byte for byte: Next writes a new build ID and chunk names each time,
 * and fumadocs-mdx lists the MDX files in folder order. These tasks are checked by the other two
 * tests (they pass on their hashed files alone, and their Node processes read nothing else).
 */
const UNSTABLE_OUTPUTS = new Set(['@nizivo/docs#build', '@nizivo/docs#typecheck']);

const REPO_ROOT = realpathSync(join(import.meta.dirname, '..', '..', '..'));
const TRACE = join(import.meta.dirname, 'trace.ts');
const TURBO = join(REPO_ROOT, 'node_modules', '.bin', 'turbo');

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    jobs: { type: 'string' },
    keep: { type: 'boolean' },
    proven: { type: 'string' },
  },
});
const only = values.only === undefined ? undefined : new Set(values.only.split(','));
const jobs = Math.max(1, Number(values.jobs ?? Math.floor(availableParallelism() / 3)));

const posix = (path: string): string => path.split(sep).join('/');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
}

function turbo(args: string[]): string {
  const env: Record<string, string | undefined> = { ...process.env, TURBO_TELEMETRY_DISABLED: '1' };
  delete env['TURBO_FORCE'];
  const result = spawnSync(TURBO, args, {
    cwd: REPO_ROOT,
    env,
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout + result.stderr);
    throw new Error(`turbo ${args.join(' ')} exited with ${result.status}`);
  }
  return result.stdout;
}

/** The tasks and global inputs of a dry run, with every path repo-relative. */
function readGraph(): {
  tasks: Map<string, TaskInfo>;
  /** Each task's turbo hash. */
  hashes: Map<string, string>;
  globalInputs: string[];
  /** Tasks Turbopack runs in: it refuses a node_modules link that leaves its root. */
  turbopack: Set<string>;
} {
  const dry: unknown = JSON.parse(turbo(['run', ...TASKS, '--dry=json']));
  if (!isRecord(dry) || !Array.isArray(dry['tasks'])) throw new Error('turbo --dry=json: no tasks');
  const tasks = new Map<string, TaskInfo>();
  const hashes = new Map<string, string>();
  const turbopack = new Set<string>();
  for (const raw of dry['tasks']) {
    if (!isRecord(raw)) continue;
    const id = String(raw['taskId']);
    if (raw['framework'] === 'nextjs' && raw['task'] === 'build') turbopack.add(id);
    hashes.set(id, String(raw['hash']));
    const dir = String(raw['directory']);
    const inputs = isRecord(raw['inputs']) ? Object.keys(raw['inputs']) : [];
    tasks.set(id, {
      id,
      dir,
      command: String(raw['command']),
      inputs: inputs.map((file) => posix(join(dir, file))).filter((file) => !file.startsWith('..')),
      outputs: strings(raw['outputs']),
      deps: strings(raw['dependencies']),
    });
  }
  const global = isRecord(dry['globalCacheInputs']) ? dry['globalCacheInputs']['files'] : {};
  return {
    tasks,
    hashes,
    globalInputs: isRecord(global) ? Object.keys(global) : [],
    turbopack,
  };
}

/** The files a task's output globs match in `root`, repo-relative. */
function outputFiles(root: string, task: TaskInfo): string[] {
  const files: string[] = [];
  for (const glob of task.outputs) {
    for (const match of globSync(glob, { cwd: join(root, task.dir) })) {
      const path = join(root, task.dir, match);
      if (statSync(path).isFile()) files.push(posix(relative(root, path)));
    }
  }
  return files.toSorted();
}

/** Every package folder of the dry run, plus the root. */
function packageDirs(tasks: ReadonlyMap<string, TaskInfo>): string[] {
  return ['.', ...new Set([...tasks.values()].map((t) => t.dir))];
}

/**
 * A copy of the repo with only `files`, the root files and the node_modules links; the root
 * node_modules is a link, or with `clone` a copy-on-write copy on macOS (about 8 s) and a copy of
 * hard links on Linux.
 */
function prune(
  copy: string,
  files: Iterable<string>,
  dirs: readonly string[],
  clone: boolean,
): void {
  for (const file of new Set([...files, ...ROOT_FILES])) {
    const from = join(REPO_ROOT, file);
    if (!existsSync(from) || !statSync(from).isFile()) continue;
    mkdirSync(dirname(join(copy, file)), { recursive: true });
    copyFileSync(from, join(copy, file), constants.COPYFILE_FICLONE);
  }
  if (clone) {
    // macOS's cp clones copy-on-write (-c); GNU cp has no -c, so Linux (a cloud session) hard-links
    // each file instead (-l) and keeps symbolic links as links (-P; pnpm's links form cycles), as
    // fast and as free of space. A failed copy stops the audit: without node_modules every task in
    // the copy fails for a reason that is not a missing input.
    const flags = process.platform === 'darwin' ? '-cR' : '-RlP';
    const cp = spawnSync(
      'cp',
      [flags, join(REPO_ROOT, 'node_modules'), join(copy, 'node_modules')],
      {
        encoding: 'utf8',
      },
    );
    if (cp.status !== 0)
      throw new Error(`cache-audit: cp ${flags} node_modules: ${cp.stderr.trim()}`);
  } else symlinkSync(join(REPO_ROOT, 'node_modules'), join(copy, 'node_modules'));
  for (const dir of dirs) {
    const from = join(REPO_ROOT, dir, 'node_modules');
    if (dir === '.' || !existsSync(from)) continue;
    cpSync(from, join(copy, dir, 'node_modules'), {
      recursive: true,
      verbatimSymlinks: true,
      // tool caches would let a run skip work it must redo from the copy's files
      filter: (path) => !/[/\\]node_modules[/\\]\.(vitest-cache|cache)([/\\]|$)/.test(path),
    });
  }
}

function run(command: string, cwd: string, trace: string, log: string): Promise<number> {
  const env: Record<string, string | undefined> = { ...process.env };
  for (const key of Object.keys(env)) if (/^(TURBO_|npm_)/.test(key)) delete env[key];
  env['NODE_OPTIONS'] = `--import=${TRACE}`;
  env['NZ_AUDIT_TRACE'] = trace;
  env['PATH'] = [
    join(cwd, 'node_modules', '.bin'),
    join(REPO_ROOT, 'node_modules', '.bin'),
    env['PATH'],
  ].join(':');
  return new Promise((done) => {
    const child = spawn('sh', ['-c', command], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks: Buffer[] = [];
    child.stdout.on('data', (c: Buffer) => chunks.push(c));
    child.stderr.on('data', (c: Buffer) => chunks.push(c));
    child.on('close', (code) => {
      writeFileSync(log, Buffer.concat(chunks));
      done(code ?? 1);
    });
  });
}

/** A traced absolute path as a repo-relative one, through workspace links; undefined outside. */
function toRepo(
  abs: string,
  roots: readonly string[],
  real: Map<string, string>,
): string | undefined {
  for (const root of roots) {
    if (abs !== root && !abs.startsWith(`${root}/`)) continue;
    const rel = abs.slice(root.length + 1);
    if (!rel.split('/').includes('node_modules')) return rel;
    // node_modules/@nizivo/react/… is packages/react/…: resolve the deepest folder that exists
    let dir = dirname(abs);
    let rest = abs.slice(dir.length);
    while (dir.length > root.length && !real.has(dir) && !existsSync(dir)) {
      rest = abs.slice(dirname(dir).length);
      dir = dirname(dir);
    }
    let resolved = real.get(dir);
    if (resolved === undefined) {
      try {
        resolved = realpathSync(dir);
      } catch {
        resolved = dir;
      }
      real.set(dir, resolved);
    }
    const target = resolved + rest;
    if (target === abs) return rel;
    return toRepo(target, roots, real);
  }
  return undefined;
}

function readTraces(
  folder: string,
  roots: readonly string[],
): { reads: string[]; writes: string[] } {
  const reads = new Set<string>();
  const writes = new Set<string>();
  const real = new Map<string, string>();
  for (const name of existsSync(folder) ? readdirSync(folder) : []) {
    for (const line of readFileSync(join(folder, name), 'utf8').split('\n')) {
      const kind = line.slice(0, 2);
      if (kind !== 'r ' && kind !== 'w ') continue;
      const path = toRepo(line.slice(2), roots, real);
      if (path === undefined) continue;
      (kind === 'r ' ? reads : writes).add(path);
    }
  }
  return { reads: [...reads], writes: [...writes] };
}

interface Finding {
  id: string;
  seconds: number;
  problems: string[];
}

async function audit(
  task: TaskInfo,
  graph: ReturnType<typeof readGraph>,
  work: string,
): Promise<Finding> {
  const { tasks, globalInputs } = graph;
  const start = performance.now();
  const name = task.id.replace(/[^\w.-]+/g, '_');
  const copy = join(work, name);
  const traceDir = join(work, `${name}.trace`);
  const log = join(work, `${name}.log`);
  mkdirSync(traceDir, { recursive: true });
  const allowed = allowedFiles(tasks, task.id, globalInputs, (t) => outputFiles(REPO_ROOT, t));
  prune(copy, allowed, packageDirs(tasks), graph.turbopack.has(task.id));
  const code = await run(task.command, join(copy, task.dir), traceDir, log);
  const problems: string[] = [];
  if (code !== 0) {
    const lines = readFileSync(log, 'utf8').trim().split('\n');
    // the error lines name the missing file; a stack alone does not
    const errors = lines.filter(
      (l) => /error|ENOENT|not found|cannot|FAIL|×/i.test(l) && !/^\s+at /.test(l),
    );
    const shown = errors.length > 0 ? errors.slice(0, 8) : lines.slice(-8);
    problems.push(
      `fails with only its hashed files (exit ${code}):`,
      ...shown.map((l) => `    ${l}`),
    );
  } else if (task.outputs.length > 0 && !UNSTABLE_OUTPUTS.has(task.id)) {
    const want = outputFiles(REPO_ROOT, task);
    const got = new Set(outputFiles(copy, task));
    const differ = want.filter(
      (file) =>
        !got.has(file) ||
        !readFileSync(join(copy, file)).equals(readFileSync(join(REPO_ROOT, file))),
    );
    const extra = [...got].filter((file) => !want.includes(file));
    if (differ.length + extra.length > 0) {
      problems.push(
        `builds other outputs from only its hashed files (${differ.length} differ or missing, ${extra.length} extra):`,
        ...[...differ, ...extra].slice(0, 8).map((f) => `    ${f}`),
      );
    }
  }
  // its own outputs, as this run wrote them (native writers such as Rolldown are not traced)
  for (const file of outputFiles(copy, task)) allowed.add(file);
  for (const file of IGNORED) allowed.add(file);
  const roots = [...new Set([copy, realpathSync(copy), REPO_ROOT])];
  const reads = undeclared(readTraces(traceDir, roots), allowed, (p) =>
    existsSync(join(REPO_ROOT, p)),
  );
  if (reads.length > 0) {
    problems.push(
      `reads ${reads.length} file(s) turbo does not hash for it:`,
      ...reads.map((f) => `    ${f}`),
    );
  }
  if (!values.keep) rmSync(copy, { recursive: true, force: true });
  return { id: task.id, seconds: (performance.now() - start) / 1000, problems };
}

/** This tool's own files: a change to how tasks are judged makes every earlier proof stale. */
function auditHash(): string {
  const hash = createHash('sha256');
  for (const file of readdirSync(import.meta.dirname)
    .filter((f) => f.endsWith('.ts'))
    .toSorted()) {
    hash.update(file).update(readFileSync(join(import.meta.dirname, file)));
  }
  return hash.digest('hex').slice(0, 16);
}

function readProven(file: string): Set<string> {
  if (!existsSync(file)) return new Set();
  const list: unknown = JSON.parse(readFileSync(file, 'utf8'));
  return new Set(Array.isArray(list) ? list.filter((k): k is string => typeof k === 'string') : []);
}

turbo(['run', 'build', '--output-logs=errors-only']);
const graph = readGraph();
const tool = auditHash();
/** A task's proof key; none without a turbo hash, so such a task is always run. */
const keyOf = (id: string): string | undefined => {
  const hash = graph.hashes.get(id);
  return hash === undefined || hash === '' ? undefined : `${id} ${hash} ${tool}`;
};
const proven = values.proven === undefined ? undefined : readProven(values.proven);
const skipped: string[] = [];
const queue = [...graph.tasks.values()].filter((t) => {
  if (t.command === '<NONEXISTENT>' || (only !== undefined && !only.has(t.id))) return false;
  const key = keyOf(t.id);
  if (key !== undefined && proven?.has(key) === true) {
    skipped.push(t.id);
    return false;
  }
  return true;
});
const work = mkdtempSync(join(tmpdir(), 'nz-cache-audit-'));
const findings: Finding[] = [];
await Promise.all(
  Array.from({ length: jobs }, async () => {
    for (let task = queue.shift(); task !== undefined; task = queue.shift()) {
      const finding = await audit(task, graph, work);
      findings.push(finding);
      const mark = finding.problems.length === 0 ? 'ok  ' : 'FAIL';
      console.log(`${mark} ${finding.id} (${finding.seconds.toFixed(1)} s)`);
      for (const p of finding.problems) console.log(`  ${p}`);
    }
  }),
);
for (const id of skipped) console.log(`ok   ${id} (proven for the same inputs earlier)`);
if (values.keep) console.log(`cache-audit: copies and logs kept in ${work}`);
else rmSync(work, { recursive: true, force: true });
const failed = findings.filter((f) => f.problems.length > 0);
if (values.proven !== undefined && proven !== undefined) {
  for (const f of findings) {
    const key = keyOf(f.id);
    if (f.problems.length === 0 && key !== undefined) proven.add(key);
  }
  writeFileSync(values.proven, `${JSON.stringify([...proven].toSorted(), null, 1)}\n`);
}
console.log(
  failed.length === 0
    ? `cache-audit: ${findings.length + skipped.length} tasks read only what turbo hashes for them` +
        (skipped.length > 0 ? ` (${skipped.length} proven earlier for the same inputs)` : '')
    : `cache-audit: ${failed.length} of ${findings.length} tasks read files turbo does not hash`,
);
process.exit(failed.length === 0 ? 0 : 1);
