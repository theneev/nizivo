// The pure half of the local release script (release.ts; ARCHITECTURE.md §19.2, M14): the publish
// order, the version, engine, registry, licence and 2FA rules, and the exact npm and git arguments.
// Nothing here runs a command or touches a file (npmCwdProblem is handed its file check), so
// plan.test.ts covers it without a network.
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';

/** The fixed group (§5.4) in publish order: every package after the packages it depends on. */
export const PUBLISHED = [
  { name: '@nizivo/tokens', dir: 'packages/tokens' },
  { name: '@nizivo/icons', dir: 'packages/icons' },
  { name: '@nizivo/react', dir: 'packages/react' },
  // v0.2: charts depends on tokens only, never on react (§14.1)
  { name: '@nizivo/charts', dir: 'packages/charts' },
] as const;

/** The npm owner account that publishes (decision 9). */
export const NPM_OWNER = 'neevtechnologies';
/** The only registry the script reads from or publishes to; passed explicitly on every npm call. */
export const REGISTRY = 'https://registry.npmjs.org/';
/** 0.x releases go to `next` (§5.4, §19.2). */
export const DIST_TAG = 'next';

/**
 * Lanes outside `pnpm check` that a release runs after it (§18.1: "on `main`" and nightly lanes), and
 * that `pnpm check:full` runs after `pnpm check` (lanes.ts). Each is a script of the package in `dir`
 * (relative to the repo root; '' is the root). A lane whose script does not exist yet is a blocker: a
 * real run stops on it, and a dry run reports it.
 *
 * Not here: `size` (inside `pnpm check` since week 5); the floor lanes (they need a Firefox 129 binary
 * and the iOS 17.5 Simulator, and they are exit criterion 6, not a per-release gate); and the browser
 * lane in WebKit (above). Firefox joined in week 6, once packages/react/test/browser-engine.ts gave
 * Playwright's Firefox a home folder it can open on macOS.
 */
export interface Lane {
  id: string;
  why: string;
  dir: string;
  script: string;
  env?: Record<string, string>;
  /**
   * `false`: the lane runs and reports, but its failure stops neither a release nor
   * `pnpm check:full` (the react-hooks lane, D-cd). Deleting the line makes it blocking.
   */
  blocking?: false;
}

export const RELEASE_LANES: readonly Lane[] = [
  {
    id: 'browser',
    why: 'browser lane, Chromium (§18.1 unit and interaction; §16.4 de-DE locale determinism)',
    dir: 'packages/react',
    script: 'test:browser',
  },
  // Playwright's current Firefox, not the 129 floor (the floor lane covers that); WebKit's browser
  // lane is not here: WebKit on macOS does not Tab to buttons, links or radios by default.
  {
    id: 'browser-firefox',
    why: 'browser lane, Firefox (§18.1)',
    dir: 'packages/react',
    script: 'test:browser',
    env: { NZ_BROWSER: 'firefox' },
  },
  ...(['chromium', 'webkit', 'firefox'] as const).map((browser) => ({
    id: `overlay-${browser}`,
    why: `overlay conformance in ${browser} (§12.5)`,
    dir: 'packages/react',
    script: 'test:overlay',
    env: { NZ_BROWSER: browser },
  })),
  // The React matrix's 19.2 side (§9.6, M45): the node suite, the browser lane and overlay
  // conformance on React 19.2.9 in Chromium (packages/react/test/react-matrix.ts). Every other lane
  // runs the workspace's React 19.3.
  ...(
    [
      ['test', 'the node suite (SSR, contracts) on React 19.2', 'test:react-19.2'],
      ['browser', 'the browser lane on React 19.2, Chromium', 'test:browser'],
      ['overlay', 'overlay conformance on React 19.2, Chromium', 'test:overlay'],
    ] as const
  ).map(([id, what, script]) => ({
    id: `${id}-react-19.2`,
    why: `${what} (§9.6)`,
    dir: 'packages/react',
    script,
    env: { NZ_REACT: '19.2' },
  })),
  // The second Tooltip adapter (§9.4, D-cc): the node suite, the browser lane and overlay
  // conformance in all three engines on React Aria's hooks with Nizivo's own DOM
  // (NZ_ADAPTER=hooks, packages/react/test/adapters.ts). The node lane keeps its own module cache.
  {
    id: 'test-tooltip-hooks',
    why: 'the node suite on the hooks Tooltip adapter (§9.4)',
    dir: 'packages/react',
    script: 'test:adapter',
    env: { NZ_ADAPTER: 'hooks' },
  },
  {
    id: 'browser-tooltip-hooks',
    why: 'the browser lane on the hooks Tooltip adapter, Chromium (§9.4)',
    dir: 'packages/react',
    script: 'test:browser',
    env: { NZ_ADAPTER: 'hooks' },
  },
  ...(['chromium', 'webkit', 'firefox'] as const).map((browser) => ({
    id: `overlay-tooltip-hooks-${browser}`,
    why: `overlay conformance on the hooks Tooltip adapter in ${browser} (§9.4, §12.5)`,
    dir: 'packages/react',
    script: 'test:overlay',
    env: { NZ_ADAPTER: 'hooks', NZ_BROWSER: browser },
  })),
  // @nizivo/charts (v0.2): its browser specs (the stroke check, the island, the marks, bars and
  // donut) in all three engines, then the charts-only fixture (tokens.css + charts' styles.css, no
  // @nizivo/react CSS; §14.1) on the packed tarballs. Both read the built dist/.
  ...(['chromium', 'webkit', 'firefox'] as const).map((browser) => ({
    id: `charts-${browser}`,
    why: `@nizivo/charts browser specs in ${browser} (§14.1, R14)`,
    dir: 'packages/charts',
    script: 'test:browser',
    env: { NZ_BROWSER: browser },
  })),
  {
    id: 'fixture-charts',
    why: 'the charts-only fixture: axe, focus-visible, visually hidden, CSP Profile B (§14.1)',
    dir: 'fixtures/runner',
    script: 'fixture:charts',
  },
  ...(['next', 'vite', 'vite-ssr', 'react-router', 'astro'] as const).map((fixture) => ({
    id: `fixture-${fixture}`,
    why: `the ${fixture} fixture on the packed packages (§18.1, exit criterion 2)`,
    dir: 'fixtures/runner',
    script: `fixture:${fixture}`,
  })),
  // The copy-paste registry (v0.3, D-dj): the shadcn CLI adds every item to a Vite app on the
  // packed packages, which typechecks, builds and renders (§19.3, K13).
  {
    id: 'fixture-registry',
    why: 'the registry fixture: `shadcn add` of every item, then tsc, build and render (§19.3, K13)',
    dir: 'fixtures/runner',
    script: 'fixture:registry',
  },
  // The Base UI canary (M65, D-dk): the overlay family's Dialog and Select on Base UI, through the
  // same conformance specs. Non-blocking: its failures are the contract's drift toward React Aria,
  // recorded in the week's results, until the maintainer makes it blocking.
  {
    id: 'overlay-base-ui-chromium',
    why: 'the Base UI canary: Dialog and Select on a second overlay family, non-blocking (§10.4, D-dk)',
    dir: 'packages/react',
    script: 'test:overlay',
    env: { NZ_ADAPTER: 'base-ui', NZ_BROWSER: 'chromium' },
    blocking: false,
  },
  // eslint-plugin-react-hooks 7 on the client leaves and adapters (§19 "Compiler rules", D14-hooks,
  // M47): non-blocking until React Compiler phase 2 is scheduled.
  {
    id: 'react-hooks',
    why: 'the React Compiler rules on client leaves and adapters, non-blocking (§19, D14-hooks)',
    dir: 'packages/tooling/react-hooks-lint',
    script: 'lint:hooks',
    blocking: false,
  },
  {
    id: 'visual',
    why: 'in-repo visual regression; baselines hold on darwin-arm64 only (§18.1)',
    dir: 'packages/react',
    script: 'test:visual',
  },
  {
    id: 'visual-charts',
    why: '@nizivo/charts visual regression, the same harness and baseline policy (§18.1)',
    dir: 'packages/charts',
    script: 'test:visual',
  },
];

/**
 * Licences allowed in the shipped runtime tree of a published package (§19.3). Anything else fails
 * unless `LICENCE_EXCEPTIONS` names the package with a written reason.
 */
export const RUNTIME_LICENCES = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'CC0-1.0',
  'BlueOak-1.0.0',
  'Unlicense',
  'Python-2.0',
]);
/** `name` → why it is allowed. None is needed today. */
export const LICENCE_EXCEPTIONS: Readonly<Record<string, string>> = {};

export interface Manifest {
  name: string;
  version: string;
  dependencies?: Record<string, string> | undefined;
  peerDependencies?: Record<string, string> | undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- Versions ------------------------------------------------------------------------------------

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

function parts(version: string): [number, number, number] | undefined {
  const match = SEMVER.exec(version.trim().replace(/^v/, ''));
  if (match === null) return undefined;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Whether `version` meets a `>=x.y.z` range, the only form the root `engines.node` uses. */
export function meetsMinimum(version: string, range: string): boolean | undefined {
  const min = /^>=\s*(\S+)$/.exec(range.trim());
  const have = parts(version);
  const want = min?.[1] === undefined ? undefined : parts(min[1]);
  if (have === undefined || want === undefined) return undefined;
  for (let i = 0; i < 3; i += 1) {
    if (have[i] !== want[i]) return (have[i] ?? 0) > (want[i] ?? 0);
  }
  return true;
}

/**
 * The fixed group's one version, or the problems with it: every package at the same valid version
 * (0.0.0 is flagged as `unreleased`) and, with `exactInternal` (packed manifests: pnpm pack writes
 * `workspace:*` as the exact version), every internal dependency on exactly that version, so the
 * packed react names the tokens it was checked with.
 */
export function checkVersions(
  manifests: readonly Manifest[],
  { exactInternal }: { exactInternal: boolean },
): {
  version: string | undefined;
  /** True at 0.0.0: nothing was versioned yet. A dry run expects it before the version step. */
  unreleased: boolean;
  problems: string[];
} {
  const problems: string[] = [];
  const versions = new Set(manifests.map((m) => m.version));
  const version = versions.size === 1 ? [...versions][0] : undefined;
  if (version === undefined) {
    problems.push(
      `the fixed group is at different versions: ${manifests.map((m) => `${m.name}@${m.version}`).join(', ')}`,
    );
  } else if (parts(version) === undefined) {
    problems.push(`version "${version}" is not semver`);
  }
  const names = new Set(manifests.map((m) => m.name));
  for (const manifest of manifests) {
    for (const field of ['dependencies', 'peerDependencies'] as const) {
      for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
        if (!exactInternal || !names.has(dep)) continue;
        if (range !== version) {
          problems.push(
            `${manifest.name} ${field}.${dep} is "${range}", expected "${String(version)}"`,
          );
        }
      }
    }
  }
  return { version, unreleased: version === '0.0.0', problems };
}

/**
 * Checks that `order` publishes every package after the group packages it depends on, so a consumer
 * never resolves a dependent before its dependency exists on the registry.
 */
export function checkOrder(order: readonly string[], manifests: readonly Manifest[]): string[] {
  const problems: string[] = [];
  const position = new Map(order.map((name, index) => [name, index]));
  for (const manifest of manifests) {
    const at = position.get(manifest.name);
    if (at === undefined) {
      problems.push(`${manifest.name} is not in the publish order`);
      continue;
    }
    for (const dep of Object.keys({ ...manifest.dependencies, ...manifest.peerDependencies })) {
      const depAt = position.get(dep);
      if (depAt !== undefined && depAt > at) {
        problems.push(`${manifest.name} is published before its dependency ${dep}`);
      }
    }
  }
  return problems;
}

// --- Changesets ----------------------------------------------------------------------------------

export interface PendingRelease {
  name: string;
  type: string;
  oldVersion: string;
  newVersion: string;
}

/**
 * The version bumps that pending changesets would make to published packages, from
 * `changeset status --output <file>`. Empty when the versions are already applied.
 */
export function pendingReleases(status: unknown): PendingRelease[] {
  if (!isRecord(status) || !Array.isArray(status['releases'])) {
    throw new Error('changeset status output has no "releases" array');
  }
  const published = new Set<string>(PUBLISHED.map((p) => p.name));
  return status['releases']
    .filter(isRecord)
    .map((r) => ({
      name: String(r['name']),
      type: String(r['type']),
      oldVersion: String(r['oldVersion']),
      newVersion: String(r['newVersion']),
    }))
    .filter((r) => published.has(r.name) && r.type !== 'none');
}

// --- npm -----------------------------------------------------------------------------------------

export interface ExecResult {
  status: number;
  stdout: string;
  stderr: string;
}

/** The `{ error: { code } }` object npm prints with `--json` on failure (on stdout), if any. */
function npmErrorCode(result: ExecResult): string | undefined {
  for (const text of [result.stdout, result.stderr]) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (isRecord(parsed) && isRecord(parsed['error'])) return String(parsed['error']['code']);
    } catch {
      // not JSON
    }
  }
  const match = /npm error code (E[A-Z0-9]+)/.exec(result.stderr);
  return match?.[1];
}

export type RegistryState =
  | { kind: 'absent' }
  | { kind: 'published'; integrity: string | undefined }
  | { kind: 'error'; message: string };

/**
 * Reads `npm view <name>@<version> dist.integrity --json`. E404 (no such package or version) and an
 * empty answer mean the version is not on the registry; any other failure is an error, never "absent",
 * so a network fault cannot turn into a second publish attempt.
 */
export function registryState(result: ExecResult): RegistryState {
  if (result.status === 0) {
    const text = result.stdout.trim();
    if (text === '') return { kind: 'absent' };
    try {
      const parsed: unknown = JSON.parse(text);
      return { kind: 'published', integrity: typeof parsed === 'string' ? parsed : undefined };
    } catch {
      return { kind: 'published', integrity: undefined };
    }
  }
  const code = npmErrorCode(result);
  if (code === 'E404') return { kind: 'absent' };
  return {
    kind: 'error',
    message: `npm view failed (${code ?? `exit ${result.status}`}): ${result.stderr.trim().split('\n')[0] ?? ''}`,
  };
}

export type WhoAmI =
  | { kind: 'user'; name: string }
  | { kind: 'logged-out' }
  | { kind: 'error'; message: string };

export function whoAmI(result: ExecResult): WhoAmI {
  if (result.status === 0) {
    const text = result.stdout.trim();
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed === 'string') return { kind: 'user', name: parsed };
    } catch {
      // plain text
    }
    return { kind: 'user', name: text };
  }
  const code = npmErrorCode(result);
  if (code === 'E401' || code === 'ENEEDAUTH') return { kind: 'logged-out' };
  return { kind: 'error', message: `npm whoami failed (${code ?? `exit ${result.status}`})` };
}

/**
 * 2FA from `npm profile get --json`: `tfa` is false when off, else `{ mode, pending }`. Publishing
 * with a one-time password per package needs mode `auth-and-writes`.
 */
export function twoFactor(result: ExecResult): { ok: boolean; detail: string } {
  if (result.status !== 0)
    return { ok: false, detail: `npm profile get failed (exit ${result.status})` };
  let profile: unknown;
  try {
    profile = JSON.parse(result.stdout);
  } catch {
    return { ok: false, detail: 'npm profile get printed no JSON' };
  }
  const tfa = isRecord(profile) ? profile['tfa'] : undefined;
  if (!isRecord(tfa)) return { ok: false, detail: '2FA is off on this npm account' };
  if (tfa['pending'] === true) return { ok: false, detail: '2FA setup is still pending' };
  const mode = String(tfa['mode']);
  if (mode !== 'auth-and-writes') {
    return { ok: false, detail: `2FA mode is "${mode}"; publishing needs "auth-and-writes"` };
  }
  return { ok: true, detail: '2FA on (auth-and-writes)' };
}

// --- The npm login file and npm's working directory (the maintainer's decision of 2026-10-17) ------
//
// The release logs in to npm through a config file of the project's own, never through ~/.npmrc (on
// the maintainer's machine it holds an unrelated, invalid token). Every npm call gets
// `--userconfig <file>` and runs in an empty folder outside the repo and the home folder, because
// npm also reads a *project* config: `<localPrefix>/.npmrc`, where localPrefix is the nearest folder
// at or above the working directory that holds a package.json or a node_modules, else the working
// directory itself (@npmcli/config loadLocalPrefix). Run from the home folder, that is ~/.npmrc; npm
// skips it only while it is also the user config, so with --userconfig it is read as project config,
// which outranks the user config: its old token wins and npm answers 401.

/** Names another npm login file than the default. */
export const USERCONFIG_ENV = 'NIZIVO_NPM_USERCONFIG';

/** `path` with the home folder written as `~`, for commands the maintainer copies. */
export function tilde(path: string, home: string): string {
  const p = resolve(path);
  return isInside(p, home) ? `~${p.slice(resolve(home).length)}` : p;
}

function isInside(path: string, folder: string): boolean {
  const p = resolve(path);
  const f = resolve(folder);
  return p === f || p.startsWith(f.endsWith(sep) ? f : f + sep);
}

/** A path as a shell word: `~/…` stays unquoted (quotes would stop the shell expanding it). */
function shellWord(path: string, home: string): string {
  const short = tilde(path, home);
  if (/^[\w@%+=:,./~-]+$/.test(short)) return short;
  return `'${path.replace(/'/g, `'\\''`)}'`;
}

/**
 * The npm login file: USERCONFIG_ENV if set (absolute, or starting with `~/`), else
 * `~/.config/nizivo/npmrc`. Never ~/.npmrc, never a file in the repo (a token there could be
 * committed), and never a file directly in the home folder (logging in from there hits the
 * project-config trap above).
 */
export function npmUserconfig(
  env: Readonly<Record<string, string | undefined>>,
  home: string,
  repo: string,
): { path: string } | { problem: string } {
  const raw = env[USERCONFIG_ENV]?.trim() ?? '';
  const named = raw === '' ? join(home, '.config', 'nizivo', 'npmrc') : raw;
  const expanded = named.startsWith('~/') ? join(home, named.slice(2)) : named;
  const where = raw === '' ? 'the npm login file' : `${USERCONFIG_ENV} (${raw})`;
  if (!isAbsolute(expanded)) {
    return { problem: `${where} must be an absolute path or start with ~/` };
  }
  const path = resolve(expanded);
  if (path === join(resolve(home), '.npmrc')) {
    return { problem: `${where} is ~/.npmrc, which the release never uses; unset it` };
  }
  if (isInside(path, repo)) {
    return { problem: `${where} is inside the repo, where a token could be committed` };
  }
  if (dirname(path) === resolve(home)) {
    return {
      problem: `${where} is directly in the home folder; keep it in a folder of its own, such as ~/.config/nizivo/npmrc`,
    };
  }
  return { path };
}

/** Every npm call's arguments: `--userconfig` goes last, so the subcommand stays first. */
export function withUserconfig(args: readonly string[], userconfig: string): string[] {
  return [...args, '--userconfig', userconfig];
}

/**
 * Why npm must not run in `cwd`, or undefined when it may: inside the repo npm 11 refuses to run
 * (EBADDEVENGINES: the root package.json's devEngines names pnpm); in the home folder, or below any
 * folder npm would take as a project, it would read that folder's .npmrc over --userconfig.
 */
export function npmCwdProblem(
  cwd: string,
  { repo, home, exists }: { repo: string; home: string; exists: (path: string) => boolean },
): string | undefined {
  const folder = resolve(cwd);
  if (isInside(folder, repo)) return `npm's working directory ${folder} is inside the repo`;
  if (folder === resolve(home)) {
    return `npm's working directory is the home folder, where npm reads ~/.npmrc over --userconfig`;
  }
  for (let p = folder; ; p = dirname(p)) {
    for (const marker of ['package.json', 'node_modules']) {
      if (exists(join(p, marker))) {
        return `npm would take ${p} (it has a ${marker}) as the project above its working directory ${folder}, and read its .npmrc over --userconfig`;
      }
    }
    if (dirname(p) === p) break;
  }
  if (exists(join(folder, '.npmrc'))) return `npm's working directory ${folder} has a .npmrc`;
  return undefined;
}

/**
 * What the maintainer runs when the login file is missing or npm says nobody is logged in: from the
 * login file's own folder (not the repo, not ~), with that file as the user config.
 */
export function loginCommand(
  userconfig: string,
  home: string,
  { mkdir }: { mkdir: boolean },
): string {
  const folder = shellWord(dirname(userconfig), home);
  const login = `cd ${folder} && npm login --registry ${REGISTRY} --userconfig ${shellWord(userconfig, home)}`;
  return mkdir ? `mkdir -p ${folder} && ${login}` : login;
}

/** Logging out again, the same way (RELEASING.md). */
export function logoutCommand(userconfig: string, home: string): string {
  return `cd ${shellWord(dirname(userconfig), home)} && npm logout --registry ${REGISTRY} --userconfig ${shellWord(userconfig, home)}`;
}

/** `npm publish` arguments for one checked tarball. The one-time password never goes on argv. */
export function publishArgs(tarball: string, dryRun: boolean): string[] {
  const args = [
    'publish',
    tarball,
    '--access',
    'public',
    '--tag',
    DIST_TAG,
    '--registry',
    REGISTRY,
  ];
  if (dryRun) args.push('--dry-run');
  return args;
}

export function viewArgs(name: string, version: string): string[] {
  return ['view', `${name}@${version}`, 'dist.integrity', '--json', '--registry', REGISTRY];
}

/** A one-time password as npm accepts it, or empty to let npm ask (web or OTP prompt) itself. */
export function isOtp(value: string): boolean {
  return value === '' || /^\d{6,8}$/.test(value);
}

// --- Licences ------------------------------------------------------------------------------------

/** Problems in `pnpm licenses list --prod --json` for one package. */
export function checkLicences(listing: unknown): string[] {
  if (!isRecord(listing)) return ['pnpm licenses list printed no JSON object'];
  const problems: string[] = [];
  for (const [licence, entries] of Object.entries(listing)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries.filter(isRecord)) {
      const name = String(entry['name']);
      const versions = Array.isArray(entry['versions']) ? entry['versions'].join(', ') : '';
      if (RUNTIME_LICENCES.has(licence) || LICENCE_EXCEPTIONS[name] !== undefined) continue;
      problems.push(`${name}@${versions}: ${licence}`);
    }
  }
  return problems;
}

// --- The publish plan ----------------------------------------------------------------------------

export interface Packed {
  name: string;
  version: string;
  tarball: string;
  /** `sha512-…` of the tarball as checked, the same format as npm's `dist.integrity`. */
  integrity: string;
}

export type Step =
  | { action: 'publish'; packed: Packed }
  | { action: 'skip'; packed: Packed; reason: string; warning?: string };

/**
 * One step per package in publish order: publish it, or skip it because that version is already on
 * the registry (a re-run after a partial publish). A version already published with other bytes is
 * a problem for a real run (it stops before publishing or tagging anything) and a warning in a dry
 * run: npm never lets a version be published twice.
 */
export function planPublish(
  packed: readonly Packed[],
  registry: ReadonlyMap<string, RegistryState>,
  options: { dryRun: boolean },
): { steps: Step[]; problems: string[] } {
  const problems: string[] = [];
  const byName = new Map(packed.map((p) => [p.name, p]));
  const steps: Step[] = [];
  for (const { name } of PUBLISHED) {
    const item = byName.get(name);
    if (item === undefined) {
      problems.push(`${name} was not packed`);
      continue;
    }
    const state = registry.get(name);
    if (state === undefined || state.kind === 'error') {
      problems.push(
        `${name}@${item.version}: ${state?.kind === 'error' ? state.message : 'registry not read'}`,
      );
    } else if (state.kind === 'absent') {
      steps.push({ action: 'publish', packed: item });
    } else if (state.integrity !== undefined && state.integrity !== item.integrity) {
      const differs = `the registry's ${name}@${item.version} has other bytes than this tarball (${state.integrity})`;
      // pnpm pack is byte-reproducible, so other bytes mean the published package is not HEAD's
      // (a fix committed after a partial publish, or a publish from elsewhere). A real run must not
      // publish dependents against it or tag HEAD as that version; a dry run reports it.
      if (options.dryRun) {
        steps.push({
          action: 'skip',
          packed: item,
          reason: 'already on the registry',
          warning: differs,
        });
      } else {
        problems.push(
          `${differs}: HEAD is not what was published. Publish nothing and tag nothing; see RELEASING.md`,
        );
      }
    } else {
      steps.push({ action: 'skip', packed: item, reason: 'already on the registry' });
    }
  }
  return { steps, problems };
}

// --- git -----------------------------------------------------------------------------------------

/** `@nizivo/tokens@0.1.0`, the Changesets tag format §19.2 names. */
export function tagName(name: string, version: string): string {
  return `${name}@${version}`;
}

/** The command the maintainer runs after the release; the script never pushes. */
export function pushCommand(tags: readonly string[]): string {
  return `git push origin ${tags.map((tag) => `refs/tags/${tag}`).join(' ')}`;
}
