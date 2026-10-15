/* oxlint-disable no-await-in-loop -- each scenario runs in its own stubbed world, one after another */
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from '../../../fixtures/runner/pack.ts';
import type { CheckedPackage } from './check.ts';
import {
  checkLicences,
  checkOrder,
  checkVersions,
  isOtp,
  meetsMinimum,
  pendingReleases,
  planPublish,
  publishArgs,
  PUBLISHED,
  pushCommand,
  RELEASE_LANES,
  registryState,
  tagName,
  twoFactor,
  whoAmI,
  type ExecResult,
  type Packed,
  type RegistryState,
} from './plan.ts';
import { release, type ExecOptions, type Io, type Options } from './release.ts';

const OK = (stdout = ''): ExecResult => ({ status: 0, stdout, stderr: '' });
const NPM_404 = (what: string): ExecResult => ({
  status: 1,
  stdout: JSON.stringify({ error: { code: 'E404', summary: `Not Found - GET ${what}` } }),
  stderr: 'npm error code E404\nnpm error 404 Not Found',
});

/** The fixed group at `version`, react depending on tokens at `tokensRange`. */
const group = (version: string, tokensRange: string) => [
  { name: '@nizivo/tokens', version },
  { name: '@nizivo/icons', version },
  {
    name: '@nizivo/react',
    version,
    dependencies: { '@nizivo/tokens': tokensRange, clsx: '^2' },
  },
];

describe('plan', () => {
  test('publishes tokens, then icons, then react', () => {
    expect(PUBLISHED.map((p) => p.name)).toEqual([
      '@nizivo/tokens',
      '@nizivo/icons',
      '@nizivo/react',
    ]);
  });

  test('checkOrder refuses a dependent before its dependency', () => {
    const manifests = [
      { name: '@nizivo/tokens', version: '0.1.0' },
      { name: '@nizivo/react', version: '0.1.0', dependencies: { '@nizivo/tokens': '0.1.0' } },
    ];
    expect(checkOrder(['@nizivo/tokens', '@nizivo/react'], manifests)).toEqual([]);
    expect(checkOrder(['@nizivo/react', '@nizivo/tokens'], manifests)).toEqual([
      '@nizivo/react is published before its dependency @nizivo/tokens',
    ]);
    expect(checkOrder(['@nizivo/tokens'], manifests)).toEqual([
      '@nizivo/react is not in the publish order',
    ]);
  });

  test('checkVersions: one version, 0.0.0 flagged, internal dependencies exact when packed', () => {
    expect(checkVersions(group('0.1.0', '0.1.0'), { exactInternal: true })).toEqual({
      version: '0.1.0',
      unreleased: false,
      problems: [],
    });
    expect(checkVersions(group('0.0.0', 'workspace:*'), { exactInternal: false })).toMatchObject({
      unreleased: true,
      problems: [],
    });
    expect(checkVersions(group('0.1.0', 'workspace:*'), { exactInternal: true }).problems).toEqual([
      '@nizivo/react dependencies.@nizivo/tokens is "workspace:*", expected "0.1.0"',
    ]);
    const skewed = [
      ...group('0.1.0', '0.1.0').slice(1),
      { name: '@nizivo/tokens', version: '0.2.0' },
    ];
    expect(checkVersions(skewed, { exactInternal: false }).problems[0]).toMatch(
      /different versions/,
    );
    expect(checkVersions(group('next', 'next'), { exactInternal: false }).problems).toEqual([
      'version "next" is not semver',
    ]);
  });

  test('pendingReleases keeps only bumps of published packages', () => {
    const status = {
      releases: [
        { name: '@nizivo/tokens', type: 'minor', oldVersion: '0.0.0', newVersion: '0.1.0' },
        { name: '@nizivo/docs', type: 'none', oldVersion: '0.0.0', newVersion: '0.0.0' },
        { name: '@nizivo/tooling', type: 'patch', oldVersion: '0.0.0', newVersion: '0.0.1' },
      ],
    };
    expect(pendingReleases(status)).toEqual([
      { name: '@nizivo/tokens', type: 'minor', oldVersion: '0.0.0', newVersion: '0.1.0' },
    ]);
    expect(pendingReleases({ changesets: [], releases: [] })).toEqual([]);
    expect(() => pendingReleases({})).toThrow(/releases/);
  });

  test('registryState: E404 and an empty answer are absent; other failures are errors', () => {
    expect(registryState(NPM_404('@nizivo%2ftokens'))).toEqual({ kind: 'absent' });
    expect(registryState(OK(''))).toEqual({ kind: 'absent' });
    expect(registryState(OK('"sha512-abc"\n'))).toEqual({
      kind: 'published',
      integrity: 'sha512-abc',
    });
    const offline = registryState({
      status: 1,
      stdout: '',
      stderr: 'npm error code ETIMEDOUT\nnpm error network',
    });
    expect(offline).toMatchObject({ kind: 'error' });
    expect(offline.kind === 'error' && offline.message).toMatch(/ETIMEDOUT/);
  });

  test('whoAmI and twoFactor', () => {
    expect(whoAmI(OK('"neevtechnologies"\n'))).toEqual({ kind: 'user', name: 'neevtechnologies' });
    expect(whoAmI(OK('someone\n'))).toEqual({ kind: 'user', name: 'someone' });
    expect(
      whoAmI({ status: 1, stdout: '', stderr: 'npm error code E401\nnpm error 401 Unauthorized' }),
    ).toEqual({ kind: 'logged-out' });
    expect(whoAmI({ status: 1, stdout: '', stderr: 'npm error code ENOTFOUND' })).toMatchObject({
      kind: 'error',
    });
    expect(
      twoFactor(OK(JSON.stringify({ tfa: { mode: 'auth-and-writes', pending: false } }))),
    ).toEqual({
      ok: true,
      detail: '2FA on (auth-and-writes)',
    });
    expect(twoFactor(OK(JSON.stringify({ tfa: false }))).ok).toBe(false);
    expect(twoFactor(OK(JSON.stringify({ tfa: { mode: 'auth-only' } }))).detail).toMatch(
      /auth-only/,
    );
    expect(
      twoFactor(OK(JSON.stringify({ tfa: { mode: 'auth-and-writes', pending: true } }))).ok,
    ).toBe(false);
  });

  test('checkLicences allows the §19.3 runtime list only', () => {
    expect(checkLicences({})).toEqual([]);
    expect(
      checkLicences({
        MIT: [{ name: 'clsx', versions: ['2.1.1'] }],
        '0BSD': [{ name: 'tslib', versions: ['2.8.1'] }],
        'LGPL-3.0': [{ name: 'libvips', versions: ['8.0.0'] }],
        Unknown: [{ name: 'mystery', versions: ['1.0.0'] }],
      }),
    ).toEqual(['libvips@8.0.0: LGPL-3.0', 'mystery@1.0.0: Unknown']);
    expect(checkLicences([])).toEqual(['pnpm licenses list printed no JSON object']);
  });

  test('planPublish skips versions already on the registry; other bytes block a real run', () => {
    const packed: Packed[] = PUBLISHED.map(({ name }) => ({
      name,
      version: '0.1.0',
      tarball: `/stage/${name}.tgz`,
      integrity: `sha512-${name}`,
    }));
    const registry = new Map<string, RegistryState>([
      ['@nizivo/tokens', { kind: 'published', integrity: 'sha512-@nizivo/tokens' }],
      ['@nizivo/icons', { kind: 'published', integrity: 'sha512-other' }],
      ['@nizivo/react', { kind: 'absent' }],
    ]);
    const { steps, problems } = planPublish(packed, registry, { dryRun: true });
    expect(problems).toEqual([]);
    expect(steps.map((s) => [s.packed.name, s.action])).toEqual([
      ['@nizivo/tokens', 'skip'],
      ['@nizivo/icons', 'skip'],
      ['@nizivo/react', 'publish'],
    ]);
    expect(steps[0]).not.toHaveProperty('warning');
    expect(steps[1]).toHaveProperty('warning');
    // A real run: the published icons are not HEAD's, so nothing may be published against them.
    const real = planPublish(packed, registry, { dryRun: false });
    expect(real.problems).toHaveLength(1);
    expect(real.problems[0]).toContain("the registry's @nizivo/icons@0.1.0 has other bytes");
    expect(real.steps.map((s) => s.packed.name)).not.toContain('@nizivo/icons');

    registry.set('@nizivo/react', { kind: 'error', message: 'npm view failed (ETIMEDOUT)' });
    expect(planPublish(packed, registry, { dryRun: true }).problems).toEqual([
      '@nizivo/react@0.1.0: npm view failed (ETIMEDOUT)',
    ]);
    expect(planPublish(packed.slice(1), registry, { dryRun: true }).problems).toContain(
      '@nizivo/tokens was not packed',
    );
  });

  test('npm and git arguments', () => {
    expect(publishArgs('/s/t.tgz', true)).toEqual([
      'publish',
      '/s/t.tgz',
      '--access',
      'public',
      '--tag',
      'next',
      '--registry',
      'https://registry.npmjs.org/',
      '--dry-run',
    ]);
    expect(publishArgs('/s/t.tgz', false)).not.toContain('--dry-run');
    expect(tagName('@nizivo/tokens', '0.1.0')).toBe('@nizivo/tokens@0.1.0');
    expect(pushCommand(['@nizivo/tokens@0.1.0'])).toBe(
      'git push origin refs/tags/@nizivo/tokens@0.1.0',
    );
    expect([
      isOtp(''),
      isOtp('123456'),
      isOtp('12345678'),
      isOtp('12345'),
      isOtp('12a456'),
    ]).toEqual([true, true, true, false, false]);
  });

  test('meetsMinimum reads >=x.y.z only', () => {
    expect(meetsMinimum('24.16.0', '>=24.16.0')).toBe(true);
    expect(meetsMinimum('v25.0.1', '>=24.16.0')).toBe(true);
    expect(meetsMinimum('24.15.9', '>=24.16.0')).toBe(false);
    expect(meetsMinimum('24.16.0', '^24')).toBeUndefined();
  });
});

// --- release() end to end with a stubbed world ---------------------------------------------------

interface Call {
  command: string;
  args: string[];
  options: ExecOptions;
}

interface World {
  branch?: string;
  dirty?: boolean;
  behind?: boolean;
  npmUser?: string | undefined;
  version?: string;
  pending?: boolean;
  /** name → integrity on the registry */
  registry?: Record<string, string>;
  failPublish?: string;
  missingScripts?: string[];
  answers?: string[];
  otps?: string[];
  interactive?: boolean;
  /** a tarball whose bytes change after the check */
  tamper?: string;
  /** a lane that rewrites a committed file */
  laneDirties?: boolean;
}

const STAGE = '/tmp/nz-publish-test';

function world(w: World = {}) {
  const calls: Call[] = [];
  const logs: string[] = [];
  const asked: string[] = [];
  const removed: string[] = [];
  const answers = [...(w.answers ?? [])];
  const otps = [...(w.otps ?? [])];
  let version = w.version ?? '0.1.0';
  let versioned = false;
  let laneRan = false;
  const files = new Map<string, string>();
  const scripts = (names: string[]) =>
    Object.fromEntries(
      names.filter((n) => !(w.missingScripts ?? []).includes(n)).map((n) => [n, 'x']),
    );
  const manifests = () => {
    files.set(
      join(REPO_ROOT, 'package.json'),
      JSON.stringify({
        name: 'nizivo',
        packageManager: 'pnpm@12.11.2',
        devEngines: { packageManager: { name: 'pnpm', version: '12.11.2', onFail: 'error' } },
        engines: { node: '>=24.16.0' },
        scripts: scripts(['check']),
      }),
    );
    files.set(
      join(REPO_ROOT, 'fixtures/runner/package.json'),
      JSON.stringify({ scripts: scripts(['fixture:next', 'fixture:vite', 'fixture:astro']) }),
    );
    for (const { name, dir } of PUBLISHED) {
      files.set(
        join(REPO_ROOT, dir, 'package.json'),
        JSON.stringify({
          name,
          version,
          ...(name === '@nizivo/react'
            ? {
                dependencies: { '@nizivo/tokens': 'workspace:*' },
                scripts: scripts(['test:browser', 'test:overlay', 'test:visual']),
              }
            : {}),
        }),
      );
    }
  };
  manifests();
  const integrity = new Map<string, string>();

  const exec = (command: string, args: string[], options: ExecOptions): ExecResult => {
    calls.push({ command, args, options });
    const line = [command, ...args].join(' ');
    if (command === 'git') {
      if (line === 'git rev-parse --abbrev-ref HEAD') return OK(`${w.branch ?? 'main'}\n`);
      if (args[0] === 'status') {
        if (versioned)
          return OK(' M packages/react/package.json\n?? packages/react/CHANGELOG.md\n');
        // `git status --porcelain -- <package dirs>` never sees the fixture results
        const results = laneRan && w.laneDirties === true && args.length === 2;
        return OK(
          (w.dirty === true ? ' M packages/react/src/x.ts\n' : '') +
            (results ? ' M fixtures/vite/results/build.json\n' : ''),
        );
      }
      if (line === 'git rev-parse HEAD') return OK('aaaaaaa1\n');
      if (line === 'git rev-parse origin/main')
        return OK(w.behind === true ? 'bbbbbbb2\n' : 'aaaaaaa1\n');
      if (args[0] === 'rev-list') return OK('0\t3\n');
      if (args[0] === 'rev-parse' && args[1] === '-q') return { status: 1, stdout: '', stderr: '' };
      return OK();
    }
    if (command === 'corepack') {
      const pnpmArgs = args.slice(1);
      if (pnpmArgs[0] === '--version') return OK('12.11.2\n');
      if (pnpmArgs[0] === 'run' && String(pnpmArgs[1]).startsWith('fixture:')) laneRan = true;
      if (pnpmArgs[0] === 'changeset' && pnpmArgs[1] === 'status') {
        const releases =
          w.pending === true && !versioned
            ? PUBLISHED.map(({ name }) => ({
                name,
                type: 'minor',
                oldVersion: version,
                newVersion: '0.1.0',
              }))
            : [];
        files.set(String(pnpmArgs[3]), JSON.stringify({ changesets: [], releases }));
        return OK();
      }
      if (pnpmArgs[0] === 'changeset' && pnpmArgs[1] === 'version') {
        versioned = true;
        version = '0.1.0';
        manifests();
        files.set(join(REPO_ROOT, 'packages/react/CHANGELOG.md'), '# @nizivo/react\n\n## 0.1.0\n');
        return OK();
      }
      if (pnpmArgs.includes('licenses')) {
        return OK(
          pnpmArgs[1] === '@nizivo/react'
            ? JSON.stringify({ MIT: [{ name: 'clsx', versions: ['2.1.1'] }] })
            : '{}',
        );
      }
      return OK();
    }
    if (command === 'npm') {
      if (args[0] === 'whoami') {
        return w.npmUser === undefined
          ? { status: 1, stdout: '', stderr: 'npm error code E401\nnpm error 401 Unauthorized' }
          : OK(JSON.stringify(w.npmUser));
      }
      if (args[0] === 'profile')
        return OK(JSON.stringify({ tfa: { mode: 'auth-and-writes', pending: false } }));
      if (args[0] === 'view') {
        const name = String(args[1]).replace(/@[^@]+$/, '');
        const published = w.registry?.[name];
        return published === undefined ? NPM_404(name) : OK(JSON.stringify(published));
      }
      if (args[0] === 'publish') {
        const tarball = String(args[1]);
        if (
          w.failPublish !== undefined &&
          tarball.includes(w.failPublish.replace('@nizivo/', ''))
        ) {
          return { status: 1, stdout: '', stderr: '' };
        }
        return OK();
      }
    }
    return { status: 99, stdout: '', stderr: `unexpected ${line}` };
  };

  const io: Io = {
    exec,
    ask: async (question) => {
      asked.push(question);
      return answers.shift() ?? '';
    },
    secret: async (question) => {
      asked.push(question);
      return otps.shift() ?? '';
    },
    log: (line) => logs.push(line),
    interactive: w.interactive ?? true,
    nodeVersion: '24.16.0',
    readText: (path) => {
      const text = files.get(path);
      if (text === undefined) throw new Error(`no file ${path}`);
      return text;
    },
    exists: (path) => files.has(path),
    remove: (path) => removed.push(path),
    integrity: (path) => {
      const first = integrity.get(path);
      if (first === undefined) {
        integrity.set(path, `sha512-${path}`);
        return `sha512-${path}`;
      }
      return w.tamper !== undefined && path.includes(w.tamper) ? 'sha512-changed' : first;
    },
    stage: () => STAGE,
    checkPackages: async (stage): Promise<{ failed: number; packages: CheckedPackage[] }> => ({
      failed: 0,
      packages: PUBLISHED.map(({ name, dir }) => ({
        name,
        dir,
        tarball: `${stage}/${name.replace('@', '').replace('/', '-')}-${version}.tgz`,
        manifest: {
          name,
          version,
          ...(name === '@nizivo/react' ? { dependencies: { '@nizivo/tokens': version } } : {}),
        },
      })),
    }),
    missingBuilds: () => [],
  };
  const lines = () => calls.map((c) => [c.command, ...c.args].join(' '));
  const publishes = () => calls.filter((c) => c.command === 'npm' && c.args[0] === 'publish');
  return { io, calls, logs, asked, removed, lines, publishes };
}

const DRY: Options = { dryRun: true, skipGate: false, skipLanes: false };
const REAL: Options = { dryRun: false, skipGate: false, skipLanes: false };
const READY: World = { npmUser: 'neevtechnologies' };

/** Nothing in any run may push, log in or publish for real unless asked. */
function expectSafe(lines: string[], dryRun: boolean): void {
  expect(lines.filter((l) => /^git push\b/.test(l))).toEqual([]);
  expect(lines.filter((l) => /\bnpm login\b|\badduser\b/.test(l))).toEqual([]);
  // A real run may publish, tag and version; a dry run never does.
  const dry = dryRun ? lines : [];
  expect(dry.filter((l) => l.startsWith('npm publish') && !l.endsWith('--dry-run'))).toEqual([]);
  expect(dry.filter((l) => /^git (tag|commit|add|restore)\b/.test(l))).toEqual([]);
  expect(dry.filter((l) => /changeset version/.test(l))).toEqual([]);
}

describe('release', () => {
  test('dry run: every step, npm publish --dry-run in dependency order, no tag', async () => {
    const { io, calls, lines, publishes, logs } = world(READY);
    expect(await release(DRY, io)).toBe(0);
    expectSafe(lines(), true);
    expect(publishes().map((c) => c.args[1])).toEqual([
      `${STAGE}/nizivo-tokens-0.1.0.tgz`,
      `${STAGE}/nizivo-icons-0.1.0.tgz`,
      `${STAGE}/nizivo-react-0.1.0.tgz`,
    ]);
    // npm never runs inside the repo (devEngines names pnpm: EBADDEVENGINES).
    expect(calls.filter((c) => c.command === 'npm').every((c) => c.options.cwd === STAGE)).toBe(
      true,
    );
    const check = calls.find((c) => c.args.join(' ') === 'pnpm@12.11.2 check');
    expect(check?.options.env).toMatchObject({ TURBO_FORCE: 'true' });
    const visual = calls.find((c) => c.args.join(' ') === 'pnpm@12.11.2 run test:visual');
    expect(visual?.options.cwd).toBe(join(REPO_ROOT, 'packages/react'));
    expect(
      calls
        .filter((c) => c.args.includes('test:overlay'))
        .map((c) => c.options.env?.['NZ_BROWSER']),
    ).toEqual(['chromium', 'webkit']);
    expect(logs.join('\n')).toContain(
      'a real run creates the local tag @nizivo/react@0.1.0 on HEAD',
    );
  });

  test('dry run reports blockers, still rehearses the publish, and exits 1', async () => {
    const { io, lines, publishes, logs } = world({ npmUser: undefined, dirty: true, behind: true });
    expect(await release(DRY, io)).toBe(1);
    expectSafe(lines(), true);
    expect(publishes()).toHaveLength(3);
    const text = logs.join('\n');
    expect(text).toContain('cd ~ && npm login --registry https://registry.npmjs.org/');
    expect(text).toMatch(/not clean/);
    expect(text).toMatch(/0 ahead, 3 behind/);
  });

  test('dry run with pending changesets previews the bump and never runs changeset version', async () => {
    const { io, lines, logs } = world({ ...READY, pending: true, version: '0.0.0' });
    expect(await release(DRY, io)).toBe(0);
    expectSafe(lines(), true);
    expect(logs.join('\n')).toContain('@nizivo/tokens: 0.0.0 → 0.1.0 (minor)');
  });

  test('a real run stops at preflight when nobody is logged in, and prints the login command', async () => {
    const { io, lines, logs } = world({ npmUser: undefined });
    expect(await release(REAL, io)).toBe(1);
    expectSafe(lines(), false);
    expect(lines().some((l) => l.endsWith(' check'))).toBe(false);
    expect(lines().some((l) => l.startsWith('npm publish'))).toBe(false);
    expect(logs.join('\n')).toContain('cd ~ && npm login');
  });

  test('a real run refuses the wrong npm account, a dirty tree, another branch', async () => {
    for (const w of [
      { npmUser: 'someone' },
      { ...READY, dirty: true },
      { ...READY, branch: 'feature' },
    ]) {
      const { io, lines } = world(w);
      expect(await release(REAL, io)).toBe(1);
      expect(lines().some((l) => l.startsWith('npm publish'))).toBe(false);
    }
  });

  test('a real run publishes in order with a one-time password each, kept off argv, then tags', async () => {
    const otps = ['111111', '222222', '333333'];
    const { io, calls, lines, publishes, asked, logs } = world({
      ...READY,
      answers: ['publish'],
      otps,
    });
    expect(await release(REAL, io)).toBe(0);
    expectSafe(lines(), false);
    expect(publishes().map((c) => c.args.at(-1))).toEqual([
      'https://registry.npmjs.org/',
      'https://registry.npmjs.org/',
      'https://registry.npmjs.org/',
    ]);
    expect(publishes().map((c) => c.options.env?.['npm_config_otp'])).toEqual(otps);
    for (const otp of otps) {
      expect(lines().some((l) => l.includes(otp))).toBe(false);
      expect(logs.some((l) => l.includes(otp))).toBe(false);
    }
    expect(asked.filter((q) => q.includes('one-time password'))).toHaveLength(3);
    expect(lines().filter((l) => l.startsWith('git tag'))).toEqual([
      'git tag -a @nizivo/tokens@0.1.0 -m @nizivo/tokens@0.1.0',
      'git tag -a @nizivo/icons@0.1.0 -m @nizivo/icons@0.1.0',
      'git tag -a @nizivo/react@0.1.0 -m @nizivo/react@0.1.0',
    ]);
    expect(logs.join('\n')).toContain('git push origin refs/tags/@nizivo/tokens@0.1.0');
    expect(calls.some((c) => c.command === 'git' && c.args[0] === 'push')).toBe(false);
  });

  test('a re-run skips versions already on the registry', async () => {
    const tarball = `sha512-${STAGE}/nizivo-tokens-0.1.0.tgz`;
    const { io, publishes, lines } = world({
      ...READY,
      registry: { '@nizivo/tokens': tarball },
      answers: ['publish'],
      otps: ['', ''],
    });
    expect(await release(REAL, io)).toBe(0);
    expect(publishes().map((c) => c.args[1])).toEqual([
      `${STAGE}/nizivo-icons-0.1.0.tgz`,
      `${STAGE}/nizivo-react-0.1.0.tgz`,
    ]);
    // An empty answer lets npm ask itself.
    expect(publishes().every((c) => c.options.env?.['npm_config_otp'] === undefined)).toBe(true);
    expect(lines().filter((l) => l.startsWith('git tag'))).toHaveLength(3);
  });

  test('a version on the registry with other bytes stops a real run: no publish, no tag', async () => {
    const { io, publishes, lines, logs, asked } = world({
      ...READY,
      registry: { '@nizivo/tokens': 'sha512-published-elsewhere' },
      answers: ['publish'],
    });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toEqual([]);
    expect(asked).toEqual([]);
    expect(lines().filter((l) => l.startsWith('git tag'))).toEqual([]);
    expect(logs.join('\n')).toContain('the registry state blocks this release');
    expectSafe(lines(), false);
  });

  test('a lane that leaves the tree dirty blocks the release', async () => {
    const { io, publishes, logs } = world({ ...READY, laneDirties: true, answers: ['publish'] });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toEqual([]);
    expect(logs.join('\n')).toContain(
      'the gate or a lane changed the tree: fixtures/vite/results/build.json',
    );
  });

  test('nothing is asked or published when everything is on the registry', async () => {
    const registry = Object.fromEntries(
      PUBLISHED.map(({ name }) => [
        name,
        `sha512-${STAGE}/${name.replace('@', '').replace('/', '-')}-0.1.0.tgz`,
      ]),
    );
    const { io, publishes, asked } = world({ ...READY, registry });
    expect(await release(REAL, io)).toBe(0);
    expect(publishes()).toEqual([]);
    expect(asked).toEqual([]);
  });

  test('a failed publish stops before the next package and creates no tag', async () => {
    const { io, publishes, lines, logs } = world({
      ...READY,
      failPublish: '@nizivo/icons',
      answers: ['publish'],
      otps: ['111111', '222222'],
    });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toHaveLength(2);
    expect(lines().some((l) => l.startsWith('git tag'))).toBe(false);
    const text = logs.join('\n');
    expect(text).toContain('Not published: @nizivo/icons@0.1.0, @nizivo/react@0.1.0');
    expect(text).toContain('Published in this run: @nizivo/tokens@0.1.0');
  });

  test('Ctrl-C at a one-time password prompt stops with what was published', async () => {
    const { io, publishes, logs } = world({ ...READY, answers: ['publish'], otps: ['111111'] });
    let prompts = 0;
    io.secret = async () => {
      prompts += 1;
      if (prompts === 2) throw new Error('cancelled');
      return '111111';
    };
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toHaveLength(1);
    expect(logs.join('\n')).toContain('cancelled before @nizivo/icons@0.1.0 was published');
    expect(logs.join('\n')).toContain('Published in this run: @nizivo/tokens@0.1.0');
  });

  test('without the typed confirmation nothing is published', async () => {
    const { io, publishes } = world({ ...READY, answers: ['yes'] });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toEqual([]);
  });

  test('a tarball that changed after its check is not published', async () => {
    const { io, publishes } = world({
      ...READY,
      answers: ['publish'],
      otps: ['111111'],
      tamper: 'icons',
    });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes().map((c) => c.args[1])).toEqual([`${STAGE}/nizivo-tokens-0.1.0.tgz`]);
  });

  test('a real run with pending changesets versions, shows, commits on yes, and stops', async () => {
    const { io, lines } = world({ ...READY, pending: true, version: '0.0.0', answers: ['y'] });
    expect(await release(REAL, io)).toBe(0);
    expectSafe(lines(), false);
    expect(lines()).toContain('corepack pnpm@12.11.2 changeset version');
    expect(lines()).toContain(
      'git add -A -- packages/react/package.json packages/react/CHANGELOG.md',
    );
    expect(
      lines().some((l) => l.startsWith('git commit -m chore(release): version packages')),
    ).toBe(true);
    expect(lines().some((l) => l.endsWith(' check') || l.startsWith('npm publish'))).toBe(false);
  });

  test('declining the version diff reverts it', async () => {
    const { io, lines, removed } = world({
      ...READY,
      pending: true,
      version: '0.0.0',
      answers: ['n'],
    });
    expect(await release(REAL, io)).toBe(1);
    expect(lines()).toContain(
      'git restore --source=HEAD --staged --worktree -- packages/react/package.json',
    );
    expect(removed).toEqual([join(REPO_ROOT, 'packages/react/CHANGELOG.md')]);
    expect(lines().some((l) => l.startsWith('git commit'))).toBe(false);
  });

  test('0.0.0 with nothing pending is a blocker', async () => {
    const { io, publishes } = world({ ...READY, version: '0.0.0' });
    expect(await release(REAL, io)).toBe(1);
    expect(publishes()).toEqual([]);
  });

  test('a missing lane stops a real run and fails a dry run', async () => {
    const real = world({ ...READY, missingScripts: ['fixture:astro'] });
    expect(await release(REAL, real.io)).toBe(1);
    expect(real.publishes()).toEqual([]);
    const dry = world({ ...READY, missingScripts: ['fixture:astro'] });
    expect(await release(DRY, dry.io)).toBe(1);
    expect(dry.logs.join('\n')).toContain(
      'lane fixture-astro: no script fixtures/runner "fixture:astro"',
    );
  });

  test('skip flags and a missing terminal are refused for a real run', async () => {
    for (const [options, w] of [
      [{ ...REAL, skipGate: true }, READY],
      [{ ...REAL, skipLanes: true }, READY],
      [REAL, { ...READY, interactive: false }],
    ] as const) {
      const { io, calls } = world(w);
      expect(await release(options, io)).toBe(1);
      expect(calls).toEqual([]);
    }
  });

  test('the lanes cover the browser, overlay, fixture and visual lanes', () => {
    expect(RELEASE_LANES.map((l) => l.id)).toEqual([
      'browser',
      'overlay-chromium',
      'overlay-webkit',
      'fixture-next',
      'fixture-vite',
      'fixture-astro',
      'visual',
    ]);
  });
});
