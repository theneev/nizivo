// Preloaded into every Node process of an audited task (NODE_OPTIONS=--import, audit.ts): records
// each path the process reads, probes, lists or writes through node:fs, one line per path ("r <abs>"
// or "w <abs>"), in its own file under $NZ_AUDIT_TRACE. Native tools (tsgo, oxlint, Rolldown,
// Turbopack) read without node:fs; the audit catches those by running the task on its inputs only.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const READ = ['readFile', 'open', 'stat', 'lstat', 'access', 'exists', 'readdir', 'opendir'];
const STREAMS = ['createReadStream', 'watch', 'watchFile', 'realpath', 'readlink', 'glob'];
const WRITE = [
  'writeFile',
  'appendFile',
  'mkdir',
  'mkdtemp',
  'createWriteStream',
  'truncate',
  'rm',
  'rmdir',
  'unlink',
];
/** Two-path calls: the first path is read, the second written. */
const MOVE = ['copyFile', 'cp', 'rename', 'symlink', 'link'];

const folder = process.env['NZ_AUDIT_TRACE'];
if (folder) {
  const file = `${folder}/${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const append = fs.appendFileSync.bind(fs);
  const seen = new Set<string>();
  const note = (kind: 'r' | 'w', path: unknown): void => {
    if (typeof path !== 'string' && !(path instanceof URL) && !Buffer.isBuffer(path)) return;
    let abs: string;
    try {
      abs = resolve(path instanceof URL ? fileURLToPath(path) : path.toString());
    } catch {
      return;
    }
    if (seen.has(kind + abs)) return;
    seen.add(kind + abs);
    try {
      append(file, `${kind} ${abs}\n`);
    } catch {
      // the trace folder is gone: the audit has finished with this run
    }
  };
  const wrap = (target: object, name: string, kind: 'r' | 'w', second?: 'w'): void => {
    const original: unknown = Reflect.get(target, name);
    if (typeof original !== 'function') return;
    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      note(kind, args[0]);
      if (second) note(second, args[1]);
      return Reflect.apply(original, this, args);
    };
    // fs.realpath.native and friends stay reachable on the wrapper
    for (const key of Object.keys(original)) Reflect.set(wrapped, key, Reflect.get(original, key));
    Reflect.set(target, name, wrapped);
  };
  for (const name of [...READ, ...STREAMS]) {
    wrap(fs, name, 'r');
    wrap(fs, `${name}Sync`, 'r');
    wrap(fs.promises, name, 'r');
  }
  for (const name of WRITE) {
    wrap(fs, name, 'w');
    wrap(fs, `${name}Sync`, 'w');
    wrap(fs.promises, name, 'w');
  }
  for (const name of MOVE) {
    wrap(fs, name, 'r', 'w');
    wrap(fs, `${name}Sync`, 'r', 'w');
    wrap(fs.promises, name, 'r', 'w');
  }
  syncBuiltinESMExports();
  append(file, `p ${process.argv.slice(1, 3).join(' ')}\n`);
}
