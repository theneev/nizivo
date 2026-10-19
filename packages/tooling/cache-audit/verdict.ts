// The pure half of the cache-input audit (audit.ts): which files a task may read, and which of the
// files it did read turbo would not have hashed. Paths are repo-relative with forward slashes.

/** One task of `turbo run … --dry=json`, reduced to what the audit needs. */
export interface TaskInfo {
  id: string;
  /** The package folder, repo-relative. */
  dir: string;
  command: string;
  /** Every file turbo hashes for the task, repo-relative. */
  inputs: string[];
  /** The task's output globs, relative to its package folder. */
  outputs: string[];
  /** The tasks it depends on directly. */
  deps: string[];
}

/** Every task `id` depends on, directly or through another task. */
export function closure(tasks: ReadonlyMap<string, TaskInfo>, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [...(tasks.get(id)?.deps ?? [])];
  while (stack.length > 0) {
    const next = stack.pop();
    if (next === undefined || seen.has(next)) continue;
    seen.add(next);
    stack.push(...(tasks.get(next)?.deps ?? []));
  }
  return seen;
}

/**
 * The files a task may read and still be cached soundly: its own inputs, the global inputs, and the
 * inputs and outputs of every task it depends on (their hashes are part of its hash).
 */
export function allowedFiles(
  tasks: ReadonlyMap<string, TaskInfo>,
  id: string,
  globalInputs: readonly string[],
  outputsOf: (task: TaskInfo) => readonly string[],
): Set<string> {
  const task = tasks.get(id);
  const allowed = new Set<string>(globalInputs);
  if (!task) return allowed;
  for (const file of task.inputs) allowed.add(file);
  for (const dep of closure(tasks, id)) {
    const info = tasks.get(dep);
    if (!info) continue;
    for (const file of info.inputs) allowed.add(file);
    for (const file of outputsOf(info)) allowed.add(file);
  }
  return allowed;
}

/** `a/b/c` → `a/b`, `a`, `` (the repo root). */
function ancestors(path: string): string[] {
  const out: string[] = [];
  let at = path.lastIndexOf('/');
  while (at > 0) {
    out.push(path.slice(0, at));
    at = path.lastIndexOf('/', at - 1);
  }
  out.push('');
  return out;
}

export interface Accesses {
  /** Paths read, probed or listed. */
  reads: Iterable<string>;
  /** Paths written or created during the run (its own outputs and scratch files). */
  writes: Iterable<string>;
}

/**
 * The paths a task read that turbo does not hash for it: neither allowed, nor a folder above an
 * allowed or written path, nor written by the run itself, nor inside node_modules (the lockfile
 * covers those).
 * A path that does not exist in the repo is a probe (a config file looked for and not found) and is
 * not reported.
 */
export function undeclared(
  access: Accesses,
  allowed: ReadonlySet<string>,
  exists: (path: string) => boolean,
): string[] {
  const folders = new Set<string>();
  for (const file of allowed) for (const dir of ancestors(file)) folders.add(dir);
  const written = new Set(access.writes);
  // a folder above a written path was created, or emptied, by the run
  for (const path of written) for (const dir of ancestors(path)) folders.add(dir);
  const out = new Set<string>();
  for (const path of access.reads) {
    if (path.split('/').includes('node_modules')) continue;
    if (allowed.has(path) || folders.has(path) || written.has(path)) continue;
    if (ancestors(path).some((dir) => written.has(dir))) continue;
    if (!exists(path)) continue;
    out.add(path);
  }
  return [...out].toSorted();
}
