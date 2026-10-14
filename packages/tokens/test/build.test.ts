// The emitted dist/ files (plan §7.1, §7.4–§7.6, §7.8): byte goldens, the light-dark() placement rule
// (Deviations D1), the Lightning CSS floor guard, the spring values and the other outputs.
// Update the goldens with `pnpm test -u` after an intended change and review the diff.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

const PACKAGE = fileURLToPath(new URL('..', import.meta.url));
const TZ = join(PACKAGE, 'node_modules/@terrazzo/cli/bin/cli.js');
const FILES = [
  'tokens.css',
  'custom-media.css',
  'tailwind.css',
  'contract.json',
  'tokens.json',
  'index.js',
  'index.d.ts',
] as const;
const CSS_FILES = FILES.filter((file) => file.endsWith('.css'));
const { version }: { version: string } = JSON.parse(
  readFileSync(join(PACKAGE, 'package.json'), 'utf8'),
);

/** The browser floor (decision 4): Chrome/Edge 123, Firefox 129, Safari 17.5. */
const FLOOR = { chrome: 123 << 16, firefox: 129 << 16, safari: (17 << 16) | (5 << 8) };

function build(env: Record<string, string> = {}): { dir: string; files: Record<string, string> } {
  const dir = mkdtempSync(join(tmpdir(), 'nz-tokens-dist-'));
  const result = spawnSync(process.execPath, [TZ, 'build', '-c', 'build/terrazzo.config.ts'], {
    cwd: PACKAGE,
    encoding: 'utf8',
    env: { ...process.env, NZ_TOKENS_OUT_DIR: dir, ...env },
  });
  if (result.status !== 0) throw new Error(`tz build failed:\n${result.stdout}${result.stderr}`);
  return {
    dir,
    files: Object.fromEntries(FILES.map((file) => [file, readFileSync(join(dir, file), 'utf8')])),
  };
}

let dist: ReturnType<typeof build>;
let acme: ReturnType<typeof build>;
const file = (name: (typeof FILES)[number]): string => dist.files[name] ?? '';

beforeAll(() => {
  dist = build();
  acme = build({ NZ_TOKEN_PREFIX: 'acme' });
}, 60_000);

afterAll(() => {
  for (const { dir } of [dist, acme]) rmSync(dir, { recursive: true, force: true });
});

describe('dist goldens', () => {
  // The .golden extension keeps oxfmt off them: they must stay byte-identical to the build.
  test.each(FILES)('%s matches test/golden', async (name) => {
    // Outside CI, toMatchFileSnapshot writes a missing golden and passes; the local gate must not.
    expect(existsSync(join(PACKAGE, 'test/golden', `${name}.golden`))).toBe(true);
    const text = file(name).replace(
      `--nz-css-version: "${version}";`,
      '--nz-css-version: "<version>";',
    );
    await expect(text).toMatchFileSnapshot(`golden/${name}.golden`);
  });

  test('tokens.css carries the package version for the dev-only skew check', () => {
    expect(file('tokens.css')).toContain(`--nz-css-version: "${version}";`);
  });
});

describe('tokens.css', () => {
  test('light-dark( appears only inside --nz-* custom property declarations (Deviations D1)', () => {
    for (const name of CSS_FILES) {
      for (const line of file(name)
        .split('\n')
        .filter((l) => l.includes('light-dark('))) {
        expect(line).toMatch(/^\s*--nz-[a-z0-9-]+: [^;]*light-dark\([^;]*;$/);
      }
    }
    expect(file('tokens.css').match(/light-dark\(/g)?.length).toBeGreaterThan(60);
  });

  test('opens with the canonical layer statement and keeps everything in nz.tokens', () => {
    const css = file('tokens.css');
    expect(css).toContain(
      '@layer nz.tokens, nz.themes, nz.reset, nz.base, nz.components, nz.patterns, nz.utilities;\n@layer nz.tokens {\n  :root {',
    );
    expect(css.trimEnd().endsWith('  }\n}')).toBe(true);
  });

  test('theme scopes set only color-scheme and the inverse scheme; :root sets none (opt-in light)', () => {
    const css = file('tokens.css');
    const root = css.slice(css.indexOf(':root {'), css.indexOf('\n  }'));
    expect(root).not.toContain('color-scheme');
    expect(root).toContain('--nz-scheme-inverse: dark;');
    expect(css).toContain(`  [data-nz-theme="light"] {
    color-scheme: light;
    --nz-scheme-inverse: dark;
  }
  [data-nz-theme="dark"] {
    color-scheme: dark;
    --nz-scheme-inverse: light;
  }
  [data-nz-theme="system"] {
    color-scheme: light dark;
    --nz-scheme-inverse: dark;
  }
  @media (prefers-color-scheme: dark) {
    [data-nz-theme="system"] {
      --nz-scheme-inverse: light;
    }
  }
  [data-nz-scheme="inverse"] {
    color-scheme: var(--nz-scheme-inverse);
  }`);
    expect(css).not.toContain('@property');
  });

  test('the a11y overrides and proposals reach the CSS (plan §15.3)', () => {
    const css = file('tokens.css');
    for (const declaration of [
      '--nz-text-secondary: light-dark(var(--nz-p-neutral-700), var(--nz-p-neutral-300));',
      '--nz-text-tertiary: light-dark(var(--nz-p-neutral-600), var(--nz-p-neutral-400));',
      '--nz-text-critical: light-dark(var(--nz-p-red-600), var(--nz-p-red-400));',
      '--nz-text-info: light-dark(var(--nz-p-blue-600), var(--nz-p-blue-400));',
      '--nz-bg-critical: var(--nz-p-red-600);',
      '--nz-bg-subtle: light-dark(var(--nz-p-neutral-25), var(--nz-p-neutral-925));',
      '--nz-icon-warning: light-dark(var(--nz-p-amber-600), var(--nz-p-amber-500));',
      '--nz-icon-critical: light-dark(var(--nz-p-red-500), var(--nz-p-red-400));',
      '--nz-border-default: light-dark(var(--nz-p-neutral-200), var(--nz-p-neutral-700));',
      '--nz-border-control: light-dark(var(--nz-p-neutral-450), var(--nz-p-neutral-500));',
      '--nz-bg-scrim: light-dark(rgb(24 27 25 / 0.32), rgb(0 0 0 / 0.6));',
      '--nz-text-on-critical: var(--nz-p-neutral-0);',
      '--nz-chart-warning: var(--nz-icon-warning);',
      '--nz-chart-critical: var(--nz-chart-negative);',
      '--nz-p-neutral-450: #828a81;',
      '--nz-p-neutral-925: #151816;',
      '--nz-p-red-400: #e47962;',
      '--nz-p-blue-400: #7098e0;',
      '--nz-focus-halo: color-mix(in oklab, var(--nz-border-focus) 28%, transparent);',
      '--nz-elevation-ring: light-dark(transparent, rgb(255 255 255 / 0.08));',
      '--nz-z-overlay: 1000;',
    ]) {
      expect(css).toContain(declaration);
    }
  });

  test('the spring pair comes from @nizivo/tooling/spring and matches its golden (plan §13.1)', () => {
    const require = createRequire(import.meta.url);
    const golden: { springs: Record<string, { easing: string; durationMs: number }> } = JSON.parse(
      readFileSync(
        join(require.resolve('@nizivo/tooling/package.json'), '../spring/spring.golden.json'),
        'utf8',
      ),
    );
    const css = file('tokens.css');
    for (const [figma, name] of [
      ['easing/spring', 'spring'],
      ['easing/spring-soft', 'spring-soft'],
    ] as const) {
      const spring = golden.springs[figma];
      expect(css).toContain(`    --nz-easing-${name}: ${spring?.easing};`);
      expect(css).toContain(`    --nz-duration-${name}: ${spring?.durationMs}ms;`);
      expect(css).toContain(`      --nz-easing-${name}: linear;`);
      expect(css).toContain(`      --nz-duration-${name}: 120ms;`);
    }
    expect(css).not.toContain('cubic-bezier(0.3, 0, 0, 1)');
  });

  test('Lightning CSS parses it at the floor without lowering light-dark()', () => {
    const code = Buffer.from(file('tokens.css'));
    const { code: out, warnings } = transform({
      filename: 'tokens.css',
      code,
      targets: FLOOR,
      errorRecovery: false,
    });
    const text = out.toString();
    expect(warnings).toEqual([]);
    expect(text).not.toContain('--lightningcss-');
    expect(text.match(/light-dark\(/g)?.length).toBe(
      file('tokens.css').match(/light-dark\(/g)?.length,
    );
  });

  test('NZ_TOKEN_PREFIX renames every variable and custom media (plan §7.3)', () => {
    for (const name of FILES) {
      // Token descriptions are source prose (breakpoint.sm's names `--nz-sm`); they are not renamed.
      const text = (acme.files[name] ?? '').replaceAll(/^ *"description": .*$/gm, '');
      expect(text).not.toMatch(/--nz-/);
    }
    expect(acme.files['tokens.css']).toContain('--acme-tracking-label-m: 0em;');
    // The JS keys come from token ids, so a prefix changes the values only.
    expect(acme.files['index.js']).toContain('  bgSurface: "var(--acme-bg-surface)",\n');
    expect(JSON.parse(acme.files['tokens.json'] ?? '{}')).toMatchObject({
      prefix: 'acme',
      tokens: { 'color.bg.surface': { cssVariable: '--acme-bg-surface' } },
    });
    expect(acme.files['tokens.css']).toContain(
      '--acme-focus-halo: color-mix(in oklab, var(--acme-border-focus) 28%',
    );
    expect(acme.files['custom-media.css']).toContain('@custom-media --acme-sm (width >= 40rem);');
  });
});

describe('custom-media.css, tailwind.css and contract.json', () => {
  test('custom media carry the code-owned breakpoints; lg is marked provisional', () => {
    expect(file('custom-media.css')).toContain('@custom-media --nz-sm (width >= 40rem);');
    expect(file('custom-media.css')).toMatch(
      /Provisional[^\n]*\n@custom-media --nz-lg \(width >= 80rem\);/,
    );
  });

  test('the Tailwind theme points at semantic variables, never primitives (plan §7.8)', () => {
    const tailwind = file('tailwind.css');
    expect(tailwind).toMatch(/^\/\*.*\*\/\n@theme inline \{\n/);
    expect(tailwind).not.toContain('--nz-p-');
    expect(tailwind).not.toContain('light-dark(');
    for (const line of [
      '  --color-nz-bg-surface: var(--nz-bg-surface);',
      '  --color-nz-text-primary: var(--nz-text-primary);',
      '  --radius-nz-md: var(--nz-radius-md);',
      '  --shadow-nz-1: var(--nz-elevation-1);',
      '  --ease-nz-standard: var(--nz-easing-standard);',
      '  --breakpoint-nz-sm: 40rem;',
      '  --breakpoint-nz-lg: 80rem;',
    ]) {
      expect(tailwind).toContain(line);
    }
  });

  test('contract.json lists exactly the variables tokens.css declares', () => {
    const contract: {
      prefix: string;
      layer: string;
      customMedia: Record<string, { query: string; status?: string }>;
      variables: Record<string, { token?: string; type: string; public: boolean }>;
    } = JSON.parse(file('contract.json'));
    const declaredNames = new Set(
      [...file('tokens.css').matchAll(/^\s*(--nz-[a-z0-9-]+):/gm)].map((match) => match[1]),
    );
    expect(new Set(Object.keys(contract.variables))).toEqual(declaredNames);
    expect(contract.prefix).toBe('nz');
    expect(contract.layer).toBe('nz.tokens');
    expect(contract.customMedia['--nz-lg']).toEqual({
      query: '(width >= 80rem)',
      status: 'provisional',
    });
    expect(contract.variables['--nz-p-green-700']?.public).toBe(false);
    expect(contract.variables['--nz-tracking-label-m']).toEqual({
      token: 'font.label.m',
      type: 'typography',
      public: true,
      part: 'letter-spacing',
    });
    const privateNames = Object.entries(contract.variables).filter(([, entry]) => !entry.public);
    expect(privateNames.every(([name]) => name.startsWith('--nz-p-'))).toBe(true);
  });
});
