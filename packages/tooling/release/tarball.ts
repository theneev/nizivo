// The tarball content allowlist (ARCHITECTURE.md §19.3): the exact paths each published package may
// ship, the files it must ship, and the published package.json rules. Pure: check.ts feeds it the
// entries of a real `pnpm pack` tarball.

export interface TarballPolicy {
  /** Top-level files that must be present and non-empty, besides package.json. */
  required: string[];
  /** Top-level files that may be present. */
  optional: string[];
  /** Extensions allowed under dist/. Source, tests, examples and source maps are never allowed. */
  dist: string[];
}

export const POLICIES: Record<string, TarballPolicy> = {
  // README.md is required since week 5: npm shows it on the package page (§18.1 package correctness).
  '@nizivo/tokens': {
    required: ['LICENSE', 'README.md'],
    optional: [],
    dist: ['.js', '.d.ts', '.css', '.json'],
  },
  '@nizivo/react': {
    // THIRD_PARTY_NOTICES covers the glyphs inlined from Lucide (§14.2).
    required: ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES'],
    optional: [],
    dist: ['.js', '.d.ts', '.css', '.json'],
  },
  '@nizivo/icons': {
    // THIRD_PARTY_NOTICES: Lucide ISC + Feather MIT, Simple Icons CC0 and the Instagram rule (§14.2).
    required: ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES'],
    optional: [],
    dist: ['.js', '.d.ts'],
  },
};

/** npm lifecycle scripts that run on a consumer's machine or around a publish. */
const LIFECYCLE = new Set([
  'preinstall',
  'install',
  'postinstall',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
  'prepack',
  'postpack',
  'prepublishOnly',
  'publish',
  'postpublish',
]);

const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
  'devDependencies',
];

/** Protocols that only mean something inside this repo; pnpm pack must have replaced them. */
const LOCAL_PROTOCOL = /^(workspace|catalog|link|file|portal):/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Why a path under dist/ is refused, or undefined when it is allowed. */
function distProblem(path: string, policy: TarballPolicy): string | undefined {
  if (path.endsWith('.map')) return 'source map';
  if (/(^|\/)(__tests__|test|tests)\//.test(path) || /\.(test|spec|test-d)\./.test(path)) {
    return 'test file';
  }
  if (/\.(example|stories)\./.test(path)) return 'example or story';
  if (/(^|\/)\.env/.test(path)) return 'env file';
  if (/\.tsx?$/.test(path) && !path.endsWith('.d.ts')) return 'source file';
  if (!policy.dist.some((extension) => path.endsWith(extension))) return 'file type not allowed';
  return undefined;
}

/**
 * Checks one tarball. `entries` are the tarball's file paths (`package/…`); `manifest` is its
 * package.json; `size(path)` returns a file's byte size inside the tarball.
 */
export function checkTarball(
  name: string,
  entries: readonly string[],
  manifest: Record<string, unknown>,
  size: (path: string) => number,
): string[] {
  const policy = POLICIES[name];
  if (policy === undefined) return [`no tarball policy for ${name}`];
  const failures: string[] = [];
  const files = new Set<string>();

  for (const entry of entries) {
    if (!entry.startsWith('package/')) {
      failures.push(`${entry}: outside the package/ folder`);
      continue;
    }
    const path = entry.slice('package/'.length);
    files.add(path);
    if (path.startsWith('dist/')) {
      const problem = distProblem(path, policy);
      if (problem !== undefined) failures.push(`${path}: ${problem}`);
    } else if (
      path !== 'package.json' &&
      !policy.required.includes(path) &&
      !policy.optional.includes(path)
    ) {
      failures.push(`${path}: not in the allowlist`);
    }
  }

  for (const path of ['package.json', ...policy.required]) {
    if (!files.has(path)) failures.push(`${path}: missing`);
    else if (size(path) === 0) failures.push(`${path}: empty`);
  }
  if (![...files].some((path) => path.startsWith('dist/'))) {
    failures.push('dist/: missing (build first)');
  }

  if (manifest['name'] !== name) {
    failures.push(`package.json: name is ${String(manifest['name'])}, expected ${name}`);
  }
  if (manifest['private'] === true) failures.push('package.json: private is true');
  const scripts = manifest['scripts'];
  if (isRecord(scripts)) {
    for (const script of Object.keys(scripts).filter((key) => LIFECYCLE.has(key))) {
      failures.push(`package.json: lifecycle script "${script}"`);
    }
  }
  for (const field of DEPENDENCY_FIELDS) {
    const deps = manifest[field];
    if (!isRecord(deps)) continue;
    for (const [dep, range] of Object.entries(deps)) {
      if (typeof range === 'string' && LOCAL_PROTOCOL.test(range)) {
        failures.push(`package.json: ${field}.${dep} is "${range}"`);
      }
    }
  }
  return failures;
}
