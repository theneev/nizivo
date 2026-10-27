// The local release script (ARCHITECTURE.md §19.2, M14): 0.x publishes by hand from the maintainer's
// machine, with npm 2FA and no provenance, while GitHub Actions is off.
//
//   node packages/tooling/release/release.ts              dry run (the default): everything but the
//                                                         publish and the tags; `npm publish --dry-run`
//   node packages/tooling/release/release.ts --publish    the real release; needs a terminal
//   dry-run only: --skip-gate (no `pnpm check`), --skip-lanes (no slow lanes), for a quick rehearsal
//
// Steps, stopping at the first failure:
// 1. Preflight: on main, a clean tree, HEAD equal to origin/main after `git fetch` (never a push),
//    Node and pnpm as the root package.json pins them, npm's working directory and login file (below),
//    `npm whoami` is the owner account, 2FA on.
// 2. Version: pending changesets → (real run) `pnpm changeset version`, show the diff, commit it on
//    confirmation, then stop: the maintainer pushes main and runs the script again from it (§19.2:
//    the commit to publish already carries the version bumps). A dry run only shows the plan.
// 3. The fixed group's version: one version for all three, never 0.0.0, internal dependencies exact;
//    and the copy-paste registry frozen at that version as this commit builds it (a real run blocks
//    without the freeze; registry-freeze.ts).
// 4. The full gate: `pnpm check` with TURBO_FORCE=true. 5. The slow lanes (plan.ts RELEASE_LANES).
// 6. Pack each package and run check:release on those tarballs (check.ts checkPackages); then the
//    shipped-runtime licence gate (§19.3). 7. `npm view` each name@version: a version already on the
//    registry is skipped, so a re-run after a partial publish carries on where it stopped.
// 8. Publish the checked tarballs in dependency order (tokens, icons, react) with
//    `npm publish <tgz> --access public --tag next`, asking for a one-time password for each (passed to
//    npm through its environment, never stored, logged or put on the command line). Each tarball's
//    sha512 must still equal the one that was checked.
// 9. Annotated local tags `<name>@<version>` on HEAD, and the push command for the maintainer.
//
// npm (the maintainer's decision of 2026-10-17; plan.ts explains why): every npm call (whoami,
// profile, view, publish) gets `--userconfig <login file>`, the project's own login file
// (`~/.config/nizivo/npmrc`, or NIZIVO_NPM_USERCONFIG), never ~/.npmrc, and runs in an empty folder
// of its own that is neither in the repo (npm 11 refuses to run there: devEngines names pnpm,
// EBADDEVENGINES) nor the home folder (npm would read ~/.npmrc as project config, over
// --userconfig). If that folder is not neutral, or the login file's path is refused, no npm command
// runs at all.
/* oxlint-disable no-await-in-loop -- every step runs in order and may prompt */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { isatty } from 'node:tty';
import { parseArgs } from 'node:util';
import { REPO_ROOT } from '../../../fixtures/runner/pack.ts';
import { checkPackages, missingBuilds, type CheckedPackage } from './check.ts';
import { registryFreeze, type RegistryFreeze } from './registry-freeze.ts';
import {
  checkLicences,
  checkOrder,
  checkVersions,
  DIST_TAG,
  isOtp,
  loginCommand,
  meetsMinimum,
  npmCwdProblem,
  npmUserconfig,
  NPM_OWNER,
  pendingReleases,
  planPublish,
  publishArgs,
  PUBLISHED,
  pushCommand,
  REGISTRY,
  RELEASE_LANES,
  registryState,
  tagName,
  tilde,
  twoFactor,
  viewArgs,
  whoAmI,
  withUserconfig,
  type ExecResult,
  type Manifest,
  type Packed,
  type RegistryState,
} from './plan.ts';

export interface ExecOptions {
  cwd: string;
  env?: Record<string, string>;
  /** Show the command's output live (stdio inherited) instead of capturing it. */
  inherit?: boolean;
}

/** Everything the script does to the outside world, so tests can stub it. */
export interface Io {
  exec(command: string, args: string[], options: ExecOptions): ExecResult;
  ask(question: string): Promise<string>;
  /** Reads a line without echoing it. */
  secret(question: string): Promise<string>;
  log(line: string): void;
  /** Whether stdin is a terminal: a real run needs one for its prompts. */
  interactive: boolean;
  nodeVersion: string;
  readText(path: string): string;
  exists(path: string): boolean;
  remove(path: string): void;
  /** `sha512-<base64>` of a file. */
  integrity(path: string): string;
  /** A new empty folder outside the repo. */
  stage(): string;
  /** Another new empty folder, npm's working directory: outside the repo and the home folder. */
  npmCwd(): string;
  /** The home folder (os.homedir()). */
  home: string;
  /** The environment the script reads NIZIVO_NPM_USERCONFIG from. */
  env: Readonly<Record<string, string | undefined>>;
  checkPackages(stage: string): Promise<{ failed: number; packages: CheckedPackage[] }>;
  missingBuilds(): string[];
  /** The copy-paste registry's freeze for a version (registry-freeze.ts). */
  registryFreeze(version: string): RegistryFreeze;
}

export interface Options {
  dryRun: boolean;
  skipGate: boolean;
  skipLanes: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toManifest(value: unknown, where: string): Manifest {
  if (
    !isRecord(value) ||
    typeof value['name'] !== 'string' ||
    typeof value['version'] !== 'string'
  ) {
    throw new Error(`${where}: not a package.json with a name and a version`);
  }
  const deps = (field: string): Record<string, string> | undefined => {
    const record = value[field];
    if (!isRecord(record)) return undefined;
    return Object.fromEntries(
      Object.entries(record).flatMap(([key, range]) =>
        typeof range === 'string' ? [[key, range] as const] : [],
      ),
    );
  };
  return {
    name: value['name'],
    version: value['version'],
    dependencies: deps('dependencies'),
    peerDependencies: deps('peerDependencies'),
  };
}

/** `git status --porcelain` lines → paths (the new path of a rename). */
function porcelainPaths(text: string): { path: string; untracked: boolean }[] {
  return text
    .split('\n')
    .filter((line) => line.length > 3)
    .map((line) => {
      const path = line.slice(3).split(' -> ').at(-1) ?? '';
      return { path: path.replace(/^"|"$/g, ''), untracked: line.startsWith('??') };
    });
}

export async function release(options: Options, io: Io): Promise<number> {
  const { dryRun } = options;
  const blockers: string[] = [];
  const published: string[] = [];
  const onRegistry: Packed[] = [];
  const block = (message: string): void => {
    blockers.push(message);
    io.log(`  BLOCKER  ${message}`);
  };
  const ok = (message: string): void => io.log(`  ok       ${message}`);
  const note = (message: string): void => io.log(`  note     ${message}`);
  const heading = (message: string): void => io.log(`\n== ${message}`);
  const stop = (message: string): number => {
    io.log(`\nSTOPPED: ${message}`);
    if (published.length > 0) io.log(`Published in this run: ${published.join(', ')}`);
    io.log(dryRun ? 'Dry run: nothing was published or tagged.' : 'Nothing else was published.');
    return 1;
  };
  /** A real run stops on any blocker found so far; a dry run reports it and goes on. */
  const halt = (): boolean => !dryRun && blockers.length > 0;

  io.log(
    dryRun
      ? 'nizivo release: DRY RUN (the default). npm publish runs with --dry-run; no tag is created.'
      : 'nizivo release: PUBLISH. This publishes to npm.',
  );
  if (!dryRun && (options.skipGate || options.skipLanes)) {
    return stop('--skip-gate and --skip-lanes are for dry runs only');
  }
  if (!dryRun && !io.interactive) return stop('--publish needs a terminal for its prompts');

  const root: unknown = JSON.parse(io.readText(join(REPO_ROOT, 'package.json')));
  if (!isRecord(root)) return stop('the root package.json is not an object');
  const devEngines = isRecord(root['devEngines']) ? root['devEngines'] : {};
  const packageManager = isRecord(devEngines['packageManager']) ? devEngines['packageManager'] : {};
  const pnpmVersion = String(packageManager['version']);
  const pnpm = (args: string[], extra: Partial<ExecOptions> = {}): ExecResult =>
    io.exec('corepack', [`pnpm@${pnpmVersion}`, ...args], { cwd: REPO_ROOT, ...extra });
  const git = (args: string[], extra: Partial<ExecOptions> = {}): ExecResult =>
    io.exec('git', args, { cwd: REPO_ROOT, ...extra });
  const stage = io.stage();
  const npmCwd = io.npmCwd();
  const cwdProblem = npmCwdProblem(npmCwd, {
    repo: REPO_ROOT,
    home: io.home,
    exists: (path) => io.exists(path),
  });
  const userconfig = npmUserconfig(io.env, io.home, REPO_ROOT);
  const npmRefused = cwdProblem ?? ('problem' in userconfig ? userconfig.problem : undefined);
  /** The one way the script runs npm: in npmCwd, with the login file, or not at all. */
  const npm = (args: string[], extra: Partial<ExecOptions> = {}): ExecResult => {
    if (npmRefused !== undefined || !('path' in userconfig)) {
      return { status: 1, stdout: '', stderr: `npm not run: ${npmRefused ?? 'no login file'}` };
    }
    return io.exec('npm', withUserconfig(args, userconfig.path), { ...extra, cwd: npmCwd });
  };
  io.log(`stage: ${stage}`);
  io.log(`npm runs in: ${npmCwd}`);

  // 1. Preflight ---------------------------------------------------------------------------------
  heading('1. Preflight');
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  if (branch === 'main') ok('on main');
  else block(`on branch "${branch}", not main`);
  const status = git(['status', '--porcelain']);
  if (status.status === 0 && status.stdout.trim() === '') ok('clean working tree');
  else
    block(`the working tree is not clean (${porcelainPaths(status.stdout).length} changed paths)`);
  const fetch = git(['fetch', 'origin', 'main', '--quiet']);
  if (fetch.status !== 0) block(`git fetch origin main failed: ${fetch.stderr.trim()}`);
  else {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();
    const upstream = git(['rev-parse', 'origin/main']).stdout.trim();
    if (head !== '' && head === upstream) ok(`HEAD ${head.slice(0, 7)} is origin/main`);
    else {
      const counts = git([
        'rev-list',
        '--left-right',
        '--count',
        'HEAD...origin/main',
      ]).stdout.trim();
      const [ahead = '?', behind = '?'] = counts.split(/\s+/);
      block(`HEAD is not origin/main (${ahead} ahead, ${behind} behind)`);
    }
  }
  const engines = isRecord(root['engines']) ? String(root['engines']['node']) : '';
  const nodeOk = meetsMinimum(io.nodeVersion, engines);
  if (nodeOk === true) ok(`Node ${io.nodeVersion} meets engines.node "${engines}"`);
  else block(`Node ${io.nodeVersion} does not meet engines.node "${engines}"`);
  if (packageManager['name'] !== 'pnpm' || root['packageManager'] !== `pnpm@${pnpmVersion}`) {
    block(`devEngines.packageManager and packageManager disagree (pnpm@${pnpmVersion})`);
  } else {
    const version = pnpm(['--version']).stdout.trim();
    if (version === pnpmVersion) ok(`pnpm ${version} (devEngines)`);
    else block(`pnpm is ${version || 'unavailable'}, devEngines pins ${pnpmVersion}`);
  }
  if (cwdProblem === undefined) ok(`npm's working directory is neutral (${npmCwd})`);
  else block(`${cwdProblem}; npm was not run (set TMPDIR to a folder outside the repo and ~)`);
  if ('problem' in userconfig) block(`${userconfig.problem}; npm was not run`);
  else if (!io.exists(userconfig.path)) {
    const shown = tilde(userconfig.path, io.home);
    const command = loginCommand(userconfig.path, io.home, {
      mkdir: !io.exists(dirname(userconfig.path)),
    });
    block(`no npm login file at ${shown}. The maintainer runs:  ${command}  (as ${NPM_OWNER})`);
  } else if (cwdProblem === undefined) {
    const shown = tilde(userconfig.path, io.home);
    const who = whoAmI(npm(['whoami', '--json', '--registry', REGISTRY]));
    if (who.kind === 'logged-out') {
      const command = loginCommand(userconfig.path, io.home, { mkdir: false });
      block(
        `${shown} is not logged in to npm. The maintainer runs:  ${command}  (as ${NPM_OWNER})`,
      );
    } else if (who.kind === 'error') {
      block(who.message);
    } else if (who.name !== NPM_OWNER) {
      block(`npm whoami (${shown}) is "${who.name}", expected ${NPM_OWNER}`);
    } else {
      ok(`npm whoami (${shown}): ${who.name}`);
      const tfa = twoFactor(npm(['profile', 'get', '--json', '--registry', REGISTRY]));
      if (tfa.ok) ok(tfa.detail);
      else block(tfa.detail);
    }
  }
  if (halt()) return stop('preflight failed; fix the blockers above and run it again');

  // 2. Version -----------------------------------------------------------------------------------
  heading('2. Version (Changesets)');
  const statusFile = join(stage, 'changeset-status.json');
  const changesetStatus = pnpm(['changeset', 'status', '--output', statusFile]);
  if (changesetStatus.status !== 0 || !io.exists(statusFile)) {
    return stop(
      `pnpm changeset status failed:\n${changesetStatus.stdout}${changesetStatus.stderr}`,
    );
  }
  const pending = pendingReleases(JSON.parse(io.readText(statusFile)));
  if (pending.length === 0) ok('no pending changesets: the versions are applied');
  else {
    for (const r of pending) note(`${r.name}: ${r.oldVersion} → ${r.newVersion} (${r.type})`);
    if (dryRun) {
      note(
        'a real run runs `pnpm changeset version` here, shows the diff, commits it when you confirm,',
      );
      note(
        'and stops: push main (or merge it through a pull request), then run the release again.',
      );
      note('This dry run goes on with the current versions.');
    } else {
      return versionStep(
        io,
        git,
        pnpm,
        pending.map((r) => `${r.name}@${r.newVersion}`),
      );
    }
  }

  // 3. The fixed group's version -------------------------------------------------------------------
  heading('3. Versions');
  const manifests = PUBLISHED.map(({ dir }) =>
    toManifest(JSON.parse(io.readText(join(REPO_ROOT, dir, 'package.json'))), dir),
  );
  // The source manifests still say `workspace:*`; pnpm pack makes them exact (checked in step 6).
  const versions = checkVersions(manifests, { exactInternal: false });
  const order = PUBLISHED.map((p) => p.name);
  for (const problem of [...checkOrder(order, manifests), ...versions.problems]) block(problem);
  if (versions.unreleased) {
    if (dryRun && pending.length > 0) note('the packages are at 0.0.0 until the version step');
    else block('the packages are at 0.0.0 and no changeset is pending: add one (`pnpm changeset`)');
  } else if (versions.version !== undefined) ok(`the fixed group is at ${versions.version}`);
  ok(`publish order: ${order.join(' → ')}`);
  // The registry ships with the docs: a released version is frozen, and frozen as this commit builds it
  if (versions.version !== undefined && !versions.unreleased) {
    const v = versions.version;
    const freeze = io.registryFreeze(v);
    if (!freeze.frozen) {
      const how = `run \`node apps/docs/scripts/registry.ts --freeze\` and commit apps/docs/registry/v${v}/`;
      if (dryRun) note(`the registry's v${v} is not frozen yet: ${how}`);
      else block(`the registry's v${v} is not frozen: ${how}`);
    } else if (freeze.drift.length > 0) {
      block(
        `apps/docs/registry/v${v}/ differs from what this commit builds (${freeze.drift.join(', ')}): ` +
          'a change landed after the freeze. Before publishing, delete the folder and run --freeze again',
      );
    } else ok(`the registry is frozen at v${v} and matches this commit`);
  }
  if (halt()) return stop('the versions are not releasable');

  // 4. The full gate -------------------------------------------------------------------------------
  // What the tree looked like before the gate and the lanes, to find anything they rewrite.
  const statusBefore = new Set(git(['status', '--porcelain']).stdout.split('\n'));
  heading('4. The full gate: pnpm check (TURBO_FORCE=true)');
  if (options.skipGate) note('skipped (--skip-gate, dry run only)');
  else {
    const check = pnpm(['check'], {
      inherit: true,
      env: { TURBO_FORCE: 'true', TURBO_TELEMETRY_DISABLED: '1' },
    });
    if (check.status !== 0) return stop(`pnpm check failed (exit ${check.status})`);
    ok('pnpm check');
  }

  // 5. Slow lanes ----------------------------------------------------------------------------------
  heading('5. Release lanes outside pnpm check');
  for (const lane of RELEASE_LANES) {
    const manifest: unknown = JSON.parse(io.readText(join(REPO_ROOT, lane.dir, 'package.json')));
    const scripts = isRecord(manifest) && isRecord(manifest['scripts']) ? manifest['scripts'] : {};
    const where = `${lane.dir === '' ? 'root' : lane.dir} "${lane.script}"`;
    if (typeof scripts[lane.script] !== 'string') {
      block(`lane ${lane.id}: no script ${where} (${lane.why})`);
      continue;
    }
    if (options.skipLanes) {
      note(`lane ${lane.id}: skipped (--skip-lanes, dry run only)`);
      continue;
    }
    io.log(`  run      lane ${lane.id}: ${where}${lane.env ? ` ${JSON.stringify(lane.env)}` : ''}`);
    const result = pnpm(['run', lane.script], {
      cwd: join(REPO_ROOT, lane.dir),
      inherit: true,
      env: { TURBO_TELEMETRY_DISABLED: '1', ...lane.env },
    });
    if (result.status !== 0 && lane.blocking === false) {
      note(`lane ${lane.id}: failed (exit ${result.status}); non-blocking, reported only`);
      continue;
    }
    if (result.status !== 0) return stop(`lane ${lane.id} failed (exit ${result.status})`);
    ok(`lane ${lane.id}`);
  }
  if (halt()) return stop('a release lane is missing');

  // 6. Pack, check:release on the tarballs, licences ------------------------------------------------
  heading('6. Pack and check the tarballs');
  // The gate and the lanes may rewrite committed results; the packages' own files must be HEAD's.
  const drift = porcelainPaths(
    git(['status', '--porcelain', '--', ...PUBLISHED.map((p) => p.dir)]).stdout,
  ).map((t) => t.path);
  if (drift.length > 0) block(`the published packages differ from HEAD: ${drift.join(', ')}`);
  // Nothing the gate or a lane runs may leave the tree dirty (the fixture lanes write their results
  // to a temporary folder unless --record), or a re-run after a partial publish could not start.
  const rewritten = porcelainPaths(
    git(['status', '--porcelain'])
      .stdout.split('\n')
      .filter((line) => !statusBefore.has(line))
      .join('\n'),
  ).map((t) => t.path);
  if (rewritten.length > 0) {
    block(`the gate or a lane changed the tree: ${rewritten.join(', ')} (restore them)`);
  }
  if (halt()) return stop('the tree changed during the gate');
  const missing = io.missingBuilds();
  if (missing.length > 0) return stop(`not built: ${missing.join(', ')} (run pnpm build)`);
  const checked = await io.checkPackages(stage);
  if (checked.failed > 0) return stop(`check:release found ${checked.failed} problem(s)`);
  const packedManifests = checked.packages.map((p) => toManifest(p.manifest, p.tarball));
  const packedVersions = checkVersions(packedManifests, { exactInternal: true });
  for (const problem of packedVersions.problems) block(`packed: ${problem}`);
  if (packedVersions.version !== versions.version) {
    block(
      `packed version ${String(packedVersions.version)} differs from ${String(versions.version)}`,
    );
  }
  const packed: Packed[] = checked.packages.map((p) => ({
    name: p.name,
    version: String(packedVersions.version),
    tarball: p.tarball,
    integrity: io.integrity(p.tarball),
  }));
  for (const p of packed) ok(`${p.name}: ${p.tarball} ${p.integrity.slice(0, 24)}…`);

  heading('6b. Shipped-runtime licences (pnpm licenses list --prod)');
  for (const { name } of PUBLISHED) {
    const result = pnpm(['--filter', name, 'licenses', 'list', '--prod', '--json']);
    let problems: string[];
    try {
      problems =
        result.status === 0
          ? checkLicences(JSON.parse(result.stdout.trim() === '' ? '{}' : result.stdout))
          : [`pnpm licenses list failed (exit ${result.status})`];
    } catch {
      problems = ['pnpm licenses list printed no JSON'];
    }
    if (problems.length === 0) ok(name);
    for (const problem of problems) block(`${name} licence: ${problem}`);
  }
  if (halt()) return stop('the tarballs are not releasable');

  // 7. Registry ----------------------------------------------------------------------------------
  heading('7. Registry (npm view)');
  const registry = new Map<string, RegistryState>();
  for (const p of packed) {
    const state = registryState(npm(viewArgs(p.name, p.version)));
    registry.set(p.name, state);
    note(`${p.name}@${p.version}: ${state.kind === 'error' ? state.message : state.kind}`);
  }
  const plan = planPublish(packed, registry, { dryRun });
  for (const problem of plan.problems) block(problem);
  if (plan.problems.length > 0) return stop('the registry state blocks this release');
  for (const step of plan.steps) {
    if (step.action === 'publish')
      note(`will publish ${step.packed.name}@${step.packed.version} (tag ${DIST_TAG})`);
    else {
      note(`skip ${step.packed.name}@${step.packed.version}: ${step.reason}`);
      if (step.warning !== undefined) io.log(`  WARNING  ${step.warning}`);
    }
  }
  const toPublish = plan.steps.filter((s) => s.action === 'publish');
  if (!dryRun && toPublish.length > 0) {
    const answer = await io.ask(
      `\nPublish ${toPublish.map((s) => `${s.packed.name}@${s.packed.version}`).join(', ')} to ${REGISTRY} with dist-tag "${DIST_TAG}"?\nType "publish" to go on: `,
    );
    if (answer.trim() !== 'publish') return stop('not confirmed; nothing was published');
  }

  // 8. Publish -----------------------------------------------------------------------------------
  heading(dryRun ? '8. Publish (npm publish --dry-run)' : '8. Publish');
  for (const step of plan.steps) {
    const { name, version, tarball, integrity } = step.packed;
    if (step.action === 'skip') {
      onRegistry.push(step.packed);
      continue;
    }
    if (io.integrity(tarball) !== integrity) {
      return stop(`${tarball} changed after it was checked; publish nothing more`);
    }
    const env: Record<string, string> = {};
    if (!dryRun) {
      let otp: string;
      try {
        otp = await io.secret(
          `npm one-time password for ${name}@${version} (Enter: let npm ask): `,
        );
        while (!isOtp(otp.trim())) {
          otp = await io.secret('  a one-time password is 6 to 8 digits; again: ');
        }
      } catch {
        return stop(`cancelled before ${name}@${version} was published`);
      }
      // npm reads `otp` from its environment: never on argv, never written anywhere.
      if (otp.trim() !== '') env['npm_config_otp'] = otp.trim();
    }
    const result = npm(publishArgs(tarball, dryRun), { inherit: true, env });
    if (result.status !== 0) {
      const after = plan.steps
        .slice(plan.steps.indexOf(step))
        .map((s) => `${s.packed.name}@${s.packed.version}`);
      return stop(
        `npm publish of ${name}@${version} failed (exit ${result.status}). Not published: ${after.join(', ')}`,
      );
    }
    ok(`${dryRun ? '(dry run) ' : ''}${name}@${version}`);
    if (!dryRun) published.push(`${name}@${version}`);
    onRegistry.push(step.packed);
  }

  // 9. Tags --------------------------------------------------------------------------------------
  heading('9. Tags');
  const tags = onRegistry.map((p) => tagName(p.name, p.version));
  if (dryRun) {
    for (const tag of tags) note(`a real run creates the local tag ${tag} on HEAD`);
  } else {
    const head = git(['rev-parse', 'HEAD']).stdout.trim();
    for (const tag of tags) {
      const existing = git(['rev-parse', '-q', '--verify', `refs/tags/${tag}^{commit}`]);
      if (existing.status === 0) {
        if (existing.stdout.trim() === head) ok(`${tag} already on HEAD`);
        else
          block(`tag ${tag} exists on ${existing.stdout.trim().slice(0, 7)}, not HEAD; left alone`);
        continue;
      }
      const made = git(['tag', '-a', tag, '-m', tag]);
      if (made.status === 0) ok(`created ${tag}`);
      else block(`git tag ${tag} failed: ${made.stderr.trim()}`);
    }
  }
  if (tags.length > 0) {
    io.log(`\nThe maintainer pushes the tags (this script never pushes):\n  ${pushCommand(tags)}`);
  }

  io.log('');
  if (dryRun) {
    if (blockers.length === 0)
      io.log('Dry run complete: no blocker. `--publish` would publish the steps above.');
    else {
      io.log(`Dry run complete with ${blockers.length} blocker(s); a real run stops at the first:`);
      for (const blocker of blockers) io.log(`  - ${blocker}`);
    }
    return blockers.length === 0 ? 0 : 1;
  }
  io.log(
    `Released: ${published.length > 0 ? published.join(', ') : 'nothing new (all already on the registry)'}`,
  );
  io.log('0.x has no npm provenance (it needs CI); the release notes say so (§19.2).');
  return blockers.length === 0 ? 0 : 1;
}

/** Real run with pending changesets: version, show, confirm, commit (or revert), stop. */
async function versionStep(
  io: Io,
  git: (args: string[], extra?: Partial<ExecOptions>) => ExecResult,
  pnpm: (args: string[], extra?: Partial<ExecOptions>) => ExecResult,
  releases: string[],
): Promise<number> {
  const result = pnpm(['changeset', 'version'], { inherit: true });
  const touched = porcelainPaths(git(['status', '--porcelain', '--untracked-files=all']).stdout);
  if (result.status !== 0) {
    io.log(`\nSTOPPED: pnpm changeset version failed (exit ${result.status}).`);
    io.log('Inspect the tree with `git status`; nothing was committed or published.');
    return 1;
  }
  io.log('\nThe version step changed:');
  for (const { path, untracked } of touched) io.log(`  ${untracked ? 'new' : '   '} ${path}`);
  git(['--no-pager', 'diff'], { inherit: true });
  for (const { path } of touched.filter((t) => t.untracked)) {
    io.log(`\n--- new file ${path}\n${io.readText(join(REPO_ROOT, path))}`);
  }
  const answer = await io.ask('\nCommit these version changes? [y/N] ');
  if (!/^y(es)?$/i.test(answer.trim())) {
    const tracked = touched.filter((t) => !t.untracked).map((t) => t.path);
    if (tracked.length > 0)
      git(['restore', '--source=HEAD', '--staged', '--worktree', '--', ...tracked]);
    for (const { path } of touched.filter((t) => t.untracked)) io.remove(join(REPO_ROOT, path));
    io.log('\nSTOPPED: not confirmed; the version changes were reverted. Nothing was published.');
    return 1;
  }
  const paths = touched.map((t) => t.path);
  const add = git(['add', '-A', '--', ...paths]);
  const commit =
    add.status === 0
      ? git(['commit', '-m', `chore(release): version packages\n\n${releases.join('\n')}`])
      : add;
  if (commit.status !== 0) {
    io.log(`\nSTOPPED: the commit failed: ${commit.stderr.trim()}`);
    return 1;
  }
  io.log('\nCommitted the version bumps on main. Nothing was published.');
  io.log('Next: push main (`git push origin main`, or merge it through a pull request), then run');
  io.log('`pnpm release` (dry run) and `pnpm release --publish` again from that main.');
  return 0;
}

// --- The real world ------------------------------------------------------------------------------

/** npm and lifecycle variables a `pnpm run` parent sets; they must not steer the npm child. */
function childEnv(extra: Record<string, string> | undefined): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    // npm reads its environment variables in any case: NPM_CONFIG_USERCONFIG is one too.
    if (/^npm_(config|package|lifecycle)_/i.test(key)) continue;
    env[key] = value;
  }
  return { ...env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', ...extra };
}

async function readSecret(question: string): Promise<string> {
  const { stdin, stdout } = process;
  stdout.write(question);
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (): void => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    function onData(chunk: string): void {
      for (const char of chunk) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('cancelled'));
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    }
    stdin.setEncoding('utf8');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

export const realIo: Io = {
  exec(command, args, { cwd, env, inherit }) {
    const result = spawnSync(command, args, {
      cwd,
      env: childEnv(env),
      encoding: 'utf8',
      stdio: inherit === true ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    if (result.error !== undefined) {
      return { status: 127, stdout: '', stderr: `${command}: ${result.error.message}` };
    }
    return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  },
  async ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      return await rl.question(question);
    } finally {
      rl.close();
    }
  },
  secret: readSecret,
  log: (line) => console.log(line),
  interactive: isatty(0),
  nodeVersion: process.versions.node,
  readText: (path) => readFileSync(path, 'utf8'),
  exists: existsSync,
  remove: (path) => rmSync(path, { force: true }),
  integrity: (path) => `sha512-${createHash('sha512').update(readFileSync(path)).digest('base64')}`,
  stage: () => mkdtempSync(join(tmpdir(), 'nz-publish-')),
  // The real path: npm sees it as its working directory, and the checks compare real paths.
  npmCwd: () => realpathSync(mkdtempSync(join(tmpdir(), 'nz-npm-'))),
  home: homedir(),
  env: process.env,
  checkPackages,
  missingBuilds,
  registryFreeze,
};

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      publish: { type: 'boolean' },
      'dry-run': { type: 'boolean' },
      'skip-gate': { type: 'boolean' },
      'skip-lanes': { type: 'boolean' },
    },
  });
  if (values.publish === true && values['dry-run'] === true) {
    console.error('release: --publish and --dry-run together; pick one');
    process.exitCode = 1;
  } else {
    try {
      process.exitCode = await release(
        {
          dryRun: values.publish !== true,
          skipGate: values['skip-gate'] === true,
          skipLanes: values['skip-lanes'] === true,
        },
        realIo,
      );
    } catch (error) {
      // Ctrl-C at a prompt: nothing after that prompt ran.
      console.error(`\nrelease: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  }
}
