// The generator (ARCHITECTURE.md §14.2): deterministic output, a committed manifest that catches a
// removed or changed glyph on a Lucide upgrade, mirror.json's rules, and the licence notices.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  generate,
  isRecord,
  manifestText,
  PACKAGE_DIR,
  pascal,
  readJson,
  readManifest,
} from '../scripts/generate.ts';

const first = generate();
const second = generate();
const committed = readManifest(join(PACKAGE_DIR, 'manifest.json'));
const lucideDir = join(createRequire(import.meta.url).resolve('lucide-static/package.json'), '..');

/** The paths among `files` whose text fails `ok`. */
function failing(
  files: ReadonlyMap<string, string>,
  ok: (text: string, path: string) => boolean,
): string[] {
  return [...files].filter(([path, text]) => !ok(text, path)).map(([path]) => path);
}

test('two runs produce byte-identical files and manifests', () => {
  expect([...second.files.keys()]).toEqual([...first.files.keys()]);
  expect(failing(first.files, (text, path) => second.files.get(path) === text)).toEqual([]);
  expect(manifestText(second.manifest)).toBe(manifestText(first.manifest));
});

function clean(text: string): boolean {
  return !text.includes(PACKAGE_DIR) && !/\b20\d\d-\d\d-\d\dT/.test(text);
}

function current(text: string, path: string): boolean {
  const file = join(PACKAGE_DIR, path);
  return existsSync(file) && readFileSync(file, 'utf8') === text;
}

test('the output carries no absolute path, clock or machine detail', () => {
  expect(failing(first.files, clean)).toEqual([]);
});

test('every Lucide icon is generated, one module each', () => {
  const nodes = readJson(join(lucideDir, 'icon-nodes.json'));
  const names = isRecord(nodes) ? Object.keys(nodes) : [];
  expect(names.length).toBeGreaterThan(1800);
  expect(Object.keys(first.manifest.icons)).toEqual(names.toSorted());
  expect(names.filter((name) => !first.files.has(`src/icons/${name}.ts`))).toEqual([]);
});

describe('manifest.json (run `node scripts/generate.ts --manifest` after reviewing an upgrade)', () => {
  const generated = first.manifest;

  test('no shipped icon disappears: a renamed one needs an aliases.json entry', () => {
    const now = new Set([...Object.keys(generated.icons), ...Object.keys(generated.aliases)]);
    const gone = [...Object.keys(committed.icons), ...Object.keys(committed.aliases)].filter(
      (name) => !now.has(name),
    );
    expect(gone).toEqual([]);
  });

  test('matches the generated drawings, versions and brands', () => {
    const changed = Object.keys(generated.icons).filter(
      (name) => committed.icons[name] !== generated.icons[name],
    );
    expect(changed).toEqual([]);
    expect(manifestText(generated)).toBe(manifestText(committed));
  });
});

test('export names are unique identifiers, distinct from the type exports', () => {
  const names = [...Object.keys(first.manifest.icons), ...Object.keys(first.manifest.aliases)].map(
    pascal,
  );
  expect(new Set(names).size).toBe(names.length);
  expect(names.filter((name) => !/^[A-Z][A-Za-z0-9]*$/.test(name))).toEqual([]);
  expect(names).not.toContain('IconProps');
  expect(names).not.toContain('BrandIconProps');
});

describe('mirror.json', () => {
  const json = readJson(join(PACKAGE_DIR, 'mirror.json'));
  const listed = isRecord(json) && Array.isArray(json['icons']) ? json['icons'].map(String) : [];

  test('is sorted and has no duplicates', () => {
    expect(listed.length).toBeGreaterThan(0);
    expect(listed).toEqual([...new Set(listed)].toSorted());
  });

  // §14.2 and §16: clocks, checks, search, rings and trend icons never mirror; neither do media
  // transport icons or vertical arrows (diagonal ones are simply not listed).
  test('lists no icon that must never mirror', () => {
    const never =
      /clock|check|search|ring|trend|play|pause|skip|step|rewind|fast-forward|-(up|down)$/;
    expect(listed.filter((name) => never.test(name))).toEqual([]);
  });

  test('marks exactly the listed icons', () => {
    const marked = [...first.files]
      .filter(([, text]) => text.includes('renderIcon(props, nodes, true)'))
      .map(([path]) => path.replace(/^src\/icons\/(.+)\.ts$/, '$1'));
    expect(marked).toEqual(listed);
  });
});

describe('THIRD_PARTY_NOTICES', () => {
  const notices = readFileSync(join(PACKAGE_DIR, 'THIRD_PARTY_NOTICES'), 'utf8');
  const lucideLicense = readFileSync(join(lucideDir, 'LICENSE'), 'utf8').trim();
  const lucide = readJson(join(lucideDir, 'package.json'));
  const lucideVersion = isRecord(lucide) ? String(lucide['version']) : '';

  test('is the generated text', () => {
    expect(notices).toBe(first.files.get('THIRD_PARTY_NOTICES'));
  });

  test('carries the Lucide ISC licence and the Feather MIT notice verbatim', () => {
    expect(notices).toContain(lucideLicense);
    expect(notices).toContain('Copyright (c) 2026 Lucide Icons and Contributors');
    expect(notices).toContain('Copyright (c) 2013-present Cole Bemis');
    expect(notices).toContain(`lucide-static ${lucideVersion}`);
  });

  test('carries the Simple Icons CC0 statement and the Instagram trademark rule', () => {
    expect(notices).toContain(`simple-icons ${first.manifest['simple-icons']}`);
    expect(notices).toContain('CC0 1.0 Universal');
    expect(notices).toContain('Instagram is a trademark of Instagram, LLC');
    expect(notices).toContain('only for "Connect" or "Follow on Instagram" links');
  });

  test('ships in the tarball', () => {
    const manifest = readJson(join(PACKAGE_DIR, 'package.json'));
    expect(isRecord(manifest) ? manifest['files'] : undefined).toContain('THIRD_PARTY_NOTICES');
  });
});

// The build, typecheck and test scripts all regenerate first; this catches a stale tree when a test
// runs on its own after an input changed.
test('the generated sources on disk are current', () => {
  expect(failing(first.files, current)).toEqual([]);
});
