import { describe, expect, test } from 'vitest';
import { allowedFiles, closure, type TaskInfo, undeclared } from './verdict.ts';

const task = (
  id: string,
  inputs: string[],
  deps: string[] = [],
  outputs: string[] = [],
): TaskInfo => ({
  id,
  dir: id.split('#')[0] ?? '',
  command: 'true',
  inputs,
  outputs,
  deps,
});

const tasks = new Map<string, TaskInfo>(
  [
    task('a#test', ['a/src/x.ts', 'a/test/x.test.ts'], ['b#build']),
    task('b#build', ['b/src/y.ts'], ['c#build'], ['dist/**']),
    task('c#build', ['c/src/z.ts'], [], ['dist/**']),
    task('d#build', ['d/src/w.ts']),
  ].map((t) => [t.id, t]),
);
const outputs = (t: TaskInfo): string[] => [`${t.dir}/dist/index.js`];
const exists = (path: string): boolean => !path.includes('missing');

describe('closure', () => {
  test('follows dependencies through other tasks', () => {
    expect([...closure(tasks, 'a#test')].toSorted()).toEqual(['b#build', 'c#build']);
    expect(closure(tasks, 'd#build').size).toBe(0);
  });
});

describe('allowedFiles', () => {
  test("is a task's inputs, the global inputs, and its dependencies' inputs and outputs", () => {
    expect([...allowedFiles(tasks, 'a#test', ['turbo-global.json'], outputs)].toSorted()).toEqual([
      'a/src/x.ts',
      'a/test/x.test.ts',
      'b/dist/index.js',
      'b/src/y.ts',
      'c/dist/index.js',
      'c/src/z.ts',
      'turbo-global.json',
    ]);
  });
});

describe('undeclared', () => {
  const allowed = allowedFiles(tasks, 'a#test', [], outputs);

  test('reports an existing file outside what the task may read', () => {
    const reads = ['a/src/x.ts', 'RELEASING.md', 'd/src/w.ts'];
    expect(undeclared({ reads, writes: [] }, allowed, exists)).toEqual([
      'RELEASING.md',
      'd/src/w.ts',
    ]);
  });

  test('allows the folders above allowed files, listed or probed', () => {
    expect(
      undeclared({ reads: ['', 'a', 'a/src', 'b/dist'], writes: [] }, allowed, exists),
    ).toEqual([]);
    expect(undeclared({ reads: ['d', 'd/src'], writes: [] }, allowed, exists)).toEqual([
      'd',
      'd/src',
    ]);
  });

  test('allows what the run wrote, inside it and above it', () => {
    const access = { reads: ['a/.out/x', 'a/.out/y/z', 'a/.out'], writes: ['a/.out'] };
    expect(undeclared(access, allowed, exists)).toEqual([]);
    expect(undeclared({ reads: ['a/gen'], writes: ['a/gen/x/y.ts'] }, allowed, exists)).toEqual([]);
  });

  test('ignores node_modules and paths that do not exist', () => {
    const reads = [
      'node_modules/x/package.json',
      'a/node_modules/y/index.js',
      'a/missing.config.ts',
    ];
    expect(undeclared({ reads, writes: [] }, allowed, exists)).toEqual([]);
  });
});
