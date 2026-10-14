import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const bin = fileURLToPath(new URL('../bin/nz.ts', import.meta.url));

test('nz gen prints the not-implemented stub', () => {
  const out = execFileSync(process.execPath, [bin, 'gen'], { encoding: 'utf8' });
  expect(out.trim()).toBe('nz gen: not implemented yet');
});
