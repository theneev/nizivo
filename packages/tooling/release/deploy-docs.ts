// Deploys the docs site, the registry included, to Cloudflare Pages from the maintainer's machine
// (ARCHITECTURE.md §18.2, M67): no GitHub Actions run, no paid plan. Run after a release is
// published and tagged (RELEASING.md "Deploying the docs").
//
//   node packages/tooling/release/deploy-docs.ts            dry run (the default): checks and builds
//                                                           everything, prints the deploy command
//   node packages/tooling/release/deploy-docs.ts --deploy   uploads apps/docs/out; needs a terminal
//
// Steps, stopping at the first failure:
// 1. Preflight: on main, a clean tree, HEAD equal to origin/main after `git fetch` (never a push), the
//    release tag `@nizivo/react@<version>` on HEAD or an ancestor (the docs describe what npm has).
// 2. The registry of this version is frozen in apps/docs/registry/v<version>/ (`node
//    apps/docs/scripts/registry.ts --freeze`, then commit): a deploy replaces the whole site, so only
//    frozen versions survive the next one.
// 3. `pnpm docs:check` with TURBO_FORCE=true: the static export from clean, then its smoke test
//    (every page, axe, the registry's files against their manifest).
// 4. `wrangler pages deploy apps/docs/out` through `pnpm dlx`, at the version pinned below, with
//    Wrangler's metrics off. Wrangler asks the maintainer to log in in a browser the first time
//    (`wrangler login`); the script never logs in, stores or prints a token.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const ROOT = join(import.meta.dirname, '..', '..', '..');
/** Exact, and older than the 3-day minimum release age (published 2026-10-22). */
const WRANGLER = 'wrangler@4.152.0';
/** The Cloudflare Pages project; its custom domain is nizivo.neevtechnologies.in (M67). */
const PROJECT = 'nizivo';
const PNPM = ['pnpm@12.11.2'];

const { values } = parseArgs({ options: { deploy: { type: 'boolean' } } });
const deploy = values.deploy === true;

function git(args: string[]): { ok: boolean; out: string } {
  const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, out: r.stdout.trim() };
}

function blocked(why: string): never {
  console.error(`docs:deploy: BLOCKER: ${why}`);
  process.exit(1);
}

// 1. preflight
if (git(['rev-parse', '--abbrev-ref', 'HEAD']).out !== 'main') blocked('not on main');
if (git(['status', '--porcelain']).out !== '') blocked('the tree is not clean');
if (!git(['fetch', 'origin', 'main']).ok) blocked('git fetch origin main failed');
const head = git(['rev-parse', 'HEAD']).out;
if (head !== git(['rev-parse', 'origin/main']).out) blocked('HEAD is not origin/main');
const manifest: unknown = JSON.parse(
  readFileSync(join(ROOT, 'packages', 'react', 'package.json'), 'utf8'),
);
const version =
  typeof manifest === 'object' && manifest !== null && 'version' in manifest
    ? String(manifest.version)
    : '';
const tag = `@nizivo/react@${version}`;
if (!git(['merge-base', '--is-ancestor', `refs/tags/${tag}`, 'HEAD']).ok) {
  blocked(`no tag ${tag} on HEAD or before it: publish and tag the release first (RELEASING.md)`);
}

// 2. the frozen registry
if (!existsSync(join(ROOT, 'apps', 'docs', 'registry', `v${version}`, 'manifest.json'))) {
  blocked(
    `the registry's v${version} is not frozen: run \`node apps/docs/scripts/registry.ts --freeze\` and commit apps/docs/registry/v${version}/`,
  );
}

// 3. the export, from clean, and its smoke test
const env = {
  ...process.env,
  COREPACK_ENABLE_DOWNLOAD_PROMPT: '0',
  TURBO_TELEMETRY_DISABLED: '1',
  TURBO_FORCE: 'true',
};
const check = spawnSync('corepack', [...PNPM, 'docs:check'], { cwd: ROOT, env, stdio: 'inherit' });
if (check.status !== 0) blocked('pnpm docs:check failed');
const out = join(ROOT, 'apps', 'docs', 'out');
if (!existsSync(join(out, 'r', `v${version}`, 'manifest.json'))) {
  blocked(`apps/docs/out has no r/v${version}/`);
}

// 4. the upload
const command = [
  ...PNPM,
  'dlx',
  WRANGLER,
  'pages',
  'deploy',
  out,
  '--project-name',
  PROJECT,
  '--branch',
  'main',
  '--commit-hash',
  head,
  '--commit-message',
  `docs ${version}`,
  '--commit-dirty=false',
];
if (!deploy) {
  console.log(
    `docs:deploy: dry run passed. To deploy ${version}, run \`pnpm docs:deploy --deploy\` in a terminal; it runs:\n  WRANGLER_SEND_METRICS=false corepack ${command.join(' ')}`,
  );
  process.exit(0);
}
if (!process.stdin.isTTY) blocked('--deploy needs a terminal (Wrangler may ask you to log in)');
const upload = spawnSync('corepack', command, {
  cwd: ROOT,
  env: { ...env, WRANGLER_SEND_METRICS: 'false' },
  stdio: 'inherit',
});
if (upload.status !== 0) blocked('wrangler pages deploy failed; nothing else changed');
console.log(
  `docs:deploy: deployed ${version} (${head.slice(0, 7)}) to the Pages project ${PROJECT}`,
);
