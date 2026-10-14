import { spawnSync } from 'node:child_process';
import { appendFileSync, cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, expect, test } from 'vitest';

const bin = fileURLToPath(new URL('../bin/nz.ts', import.meta.url));
const fixture = fileURLToPath(new URL('fixtures/repo', import.meta.url));
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function nz(...args: string[]) {
  const result = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

function copyFixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'nz-cli-'));
  cpSync(fixture, root, { recursive: true });
  roots.push(root);
  return root;
}

test('prints usage and fails on an unknown command', () => {
  const result = nz('nope');
  expect(result.status).toBe(1);
  expect(result.output).toContain('Usage: nz <command>');
});

test('rejects unknown options', () => {
  const result = nz('gen', '--frobnicate');
  expect(result.status).toBe(1);
  expect(result.output).toContain('Usage: nz gen [--check] [--root <repo root>]');
});

test('gen --check fails and lists every file that would change, then passes after gen', () => {
  const root = copyFixture();
  const before = nz('gen', '--check', '--root', root);
  expect(before.status).toBe(1);
  expect(before.output).toBe(
    'nz gen --check: 7 file(s) out of date; run `pnpm nz gen`\n' +
      '  design/component-map.json\n' +
      '  packages/react/package.json\n' +
      '  packages/react/src/button/index.ts\n' +
      '  packages/react/src/index.ts\n' +
      '  packages/react/src/select/engine.ts\n' +
      '  packages/react/src/select/index.ts\n' +
      '  packages/react/src/select/select.parts.ts\n',
  );

  expect(nz('gen', '--root', root).status).toBe(0);
  expect(nz('gen', '--check', '--root', root)).toEqual({
    status: 0,
    output: 'nz gen --check: up to date\n',
  });
  expect(nz('gen', '--root', root).output).toBe('nz gen: up to date\n');

  appendFileSync(join(root, 'packages/react/src/select/index.ts'), '// drift\n');
  expect(nz('gen', '--check', '--root', root)).toEqual({
    status: 1,
    output:
      'nz gen --check: 1 file(s) out of date; run `pnpm nz gen`\n  packages/react/src/select/index.ts\n',
  });
});

test('gen reports an unreadable package.json without a stack trace', () => {
  const root = copyFixture();
  writeFileSync(join(root, 'packages/react/package.json'), '[]\n');
  const result = nz('gen', '--root', root);
  expect(result.status).toBe(1);
  expect(result.output).toMatch(/^nz gen: .*package\.json must hold a JSON object\n$/);
});

test('gen fails with the validation problems and writes nothing', () => {
  const root = copyFixture();
  rmSync(join(root, 'packages/react/src/_engines'), { recursive: true });
  const result = nz('gen', '--root', root);
  expect(result.status).toBe(1);
  expect(result.output).toBe(
    'nz gen: 1 problem\n' +
      '  packages/react/src/select/component.json: engine adapter not found: packages/react/src/_engines/react-aria/select.client.tsx\n',
  );
  expect(nz('gen', '--check', '--root', root).status).toBe(1);
});
