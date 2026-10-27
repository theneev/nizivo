// The copy-paste registry (ARCHITECTURE.md decision 5, §5.1, §19.3; D-dj): shadcn-compatible items
// built from the sources the docs already render, served by the static export at /r/v<version>/
// (immutable) and /r/latest/ (a short-cache alias of the newest version).
// - `init`: @nizivo/react and @nizivo/icons, and components/nizivo/nizivo.css, which imports the
//   package's one stylesheet;
// - one item per pattern (patterns/src/<name>/, MIT): its example module, which imports its own
//   stylesheet, and that stylesheet;
// - `<name>-css` for every stable component sheet (packages/react/src/<name>/<name>.css): the
//   re-skin (E3, §11) copy, readable source rather than the minified dist/css/<name>.css.
// Every item depends only on the @nizivo packages its files import, at `~x.y.0` of the release that
// built it (§5.1), and every file carries the MIT notice (decision 5). `registryProblems` is
// the item-policy linter (§19.3); generate.ts fails the docs build on any problem.
//
// Immutable URLs: a deploy replaces the whole site, so each released version is frozen into git
// (`node scripts/registry.ts --freeze`, RELEASING.md) under apps/docs/registry/v<version>/, and
// every build serves the frozen versions as they are. A version that is frozen is served frozen,
// so changes after a release reach the registry with the next version.
// The frozen files are byte for byte what `--freeze` wrote (their manifest hashes them), so the
// formatter leaves apps/docs/registry/ alone (.oxfmtrc.json) and nothing may rewrite them.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isRecord } from './json.ts';

const docsRoot = join(import.meta.dirname, '..');
const repoRoot = join(docsRoot, '..', '..');
const reactRoot = join(repoRoot, 'packages', 'react');
const patternsRoot = join(repoRoot, 'patterns');
/** Released versions, frozen (committed): `registry/v0.3.0/<file>`. */
export const FROZEN_DIR = join(docsRoot, 'registry');

export const ORIGIN = 'https://nizivo.neevtechnologies.in';
/** Every item's files land here, under the consumer's components alias (§19.3: component dirs). */
const TARGET_DIR = 'components/nizivo';
/** The packages an item may depend on. */
const PACKAGES = ['charts', 'icons', 'react', 'tokens'] as const;
type PackageName = (typeof PACKAGES)[number];

export interface RegistryFile {
  path: string;
  type: 'registry:component' | 'registry:file';
  target: string;
  content: string;
}

export interface RegistryItem {
  $schema: string;
  name: string;
  type: 'registry:block' | 'registry:item';
  title: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
}

function read(file: string): string {
  return readFileSync(file, 'utf8');
}

function versionOf(dir: string): string {
  const manifest: unknown = JSON.parse(read(join(dir, 'package.json')));
  if (!isRecord(manifest) || typeof manifest.version !== 'string') {
    throw new Error(`registry: ${relative(repoRoot, dir)}/package.json has no version`);
  }
  return manifest.version;
}

/** Each package's version now: the release this build is for. */
export function packageVersions(): Record<PackageName, string> {
  return {
    charts: versionOf(join(repoRoot, 'packages', 'charts')),
    icons: versionOf(join(repoRoot, 'packages', 'icons')),
    react: versionOf(reactRoot),
    tokens: versionOf(join(repoRoot, 'packages', 'tokens')),
  };
}

/** `0.3.2` → `~0.3.0` (§5.1: items from different patch releases never flip the consumer's core). */
export function range(version: string): string {
  const [major, minor] = version.split('.');
  return `~${major}.${minor}.0`;
}

function titleOf(name: string): string {
  const words = name.split('-').join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** patterns/LICENSE as a block comment, with the item and the URL it came from. */
function notice(name: string, version: string): string {
  const lines = [
    `Nizivo registry item "${name}", v${version}: ${ORIGIN}/r/v${version}/${name}.json`,
    'Yours to edit: the registry sends no updates. Licensed under MIT:',
    '',
    ...read(join(patternsRoot, 'LICENSE')).trimEnd().split('\n'),
  ];
  const body = lines.map((l) => (l === '' ? ' *' : ` * ${l}`)).join('\n');
  return `/*\n${body}\n */\n`;
}

/**
 * `code` with `text` after its last import. The shadcn CLI drops every comment above a module's
 * first statement (4.22.1, with `rsc` on or off), so a notice there would not reach the copy.
 */
function afterImports(code: string, text: string): string {
  const imports = [...code.matchAll(/^import\b[^;]*;\n/gm)].at(-1);
  if (imports === undefined) return `${text}${code}`;
  const end = imports.index + imports[0].length;
  return `${code.slice(0, end)}\n${text}${code.slice(end)}`;
}

/** The `@nizivo/<package>` names a module imports. */
function importedPackages(code: string): PackageName[] {
  const found = new Set<PackageName>();
  for (const m of code.matchAll(/^(?:import|export)\b[^;]*?from '@nizivo\/([a-z]+)[^']*';/gms)) {
    const name = PACKAGES.find((p) => p === m[1]);
    if (name === undefined) throw new Error(`registry: an import of @nizivo/${m[1]}`);
    found.add(name);
  }
  return [...found].toSorted();
}

function deps(names: readonly PackageName[], versions: Record<PackageName, string>): string[] {
  return names.map((p) => `@nizivo/${p}@${range(versions[p])}`);
}

/** A pattern page's front matter: its title and description. */
function frontMatter(name: string): { title: string; description: string } {
  const file = join(docsRoot, 'content', 'docs', 'patterns', `${name}.mdx`);
  const head = /^---\n([\s\S]*?)\n---/.exec(read(file))?.[1] ?? '';
  const field = (key: string): string =>
    new RegExp(String.raw`^${key}: (.+)$`, 'm').exec(head)?.[1]?.trim() ?? '';
  return { title: field('title'), description: field('description') };
}

function item(
  name: string,
  type: RegistryItem['type'],
  title: string,
  description: string,
  dependencies: string[],
  files: RegistryFile[],
): RegistryItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type,
    title,
    description,
    dependencies,
    files,
  };
}

function initItem(version: string, versions: Record<PackageName, string>): RegistryItem {
  const css = [
    notice('init', version),
    "/* Nizivo's stylesheet: the tokens, the base layer and every stable component's sheet, in",
    '   layer order (nz.tokens … nz.utilities). Import this file once, before your own CSS. The',
    '   pattern items write into nz.patterns; a <name>-css item replaces one component sheet. */',
    "@import '@nizivo/react/styles.css';",
    '',
  ].join('\n');
  return item(
    'init',
    'registry:item',
    'Nizivo',
    'Installs @nizivo/react and @nizivo/icons and adds components/nizivo/nizivo.css, which imports their stylesheet. Add it before any pattern.',
    deps(['icons', 'react'], versions),
    [
      {
        path: 'nizivo/nizivo.css',
        type: 'registry:file',
        target: `${TARGET_DIR}/nizivo.css`,
        content: css,
      },
    ],
  );
}

function patternItem(
  name: string,
  version: string,
  versions: Record<PackageName, string>,
): RegistryItem {
  const dir = join(patternsRoot, 'src', name);
  const source = read(join(dir, `${name}.example.tsx`));
  const cssFile = join(dir, `${name}.css`);
  const hasCss = existsSync(cssFile);
  const packages = importedPackages(source);
  // init's nizivo.css brings @nizivo/react's stylesheet; a pattern that draws charts brings theirs
  const sheets = [
    ...(packages.includes('charts') ? ["import '@nizivo/charts/styles.css';\n"] : []),
    ...(hasCss ? [`import './${name}.css';\n`] : []),
  ].join('');
  const files: RegistryFile[] = [
    {
      path: `nizivo/${name}.tsx`,
      type: 'registry:component',
      target: `${TARGET_DIR}/${name}.tsx`,
      content: afterImports(`${sheets}${source}`, notice(name, version)),
    },
  ];
  if (hasCss) {
    files.push({
      path: `nizivo/${name}.css`,
      type: 'registry:file',
      target: `${TARGET_DIR}/${name}.css`,
      content: `${notice(name, version)}${read(cssFile)}`,
    });
  }
  const { title, description } = frontMatter(name);
  return item(name, 'registry:block', title, description, deps(packages, versions), files);
}

/** The stable component sheets: `./css/<name>.css` in the exports map, base and unstable/ aside. */
export function componentSheets(): string[] {
  const manifest: unknown = JSON.parse(read(join(reactRoot, 'package.json')));
  const exports = isRecord(manifest) && isRecord(manifest.exports) ? manifest.exports : {};
  return Object.keys(exports)
    .flatMap((k) => /^\.\/css\/([a-z0-9-]+)\.css$/.exec(k)?.[1] ?? [])
    .filter((n) => n !== 'base' && existsSync(join(reactRoot, 'src', n, `${n}.css`)))
    .toSorted();
}

function cssItem(
  component: string,
  version: string,
  versions: Record<PackageName, string>,
): RegistryItem {
  const name = `${component}-css`;
  return item(
    name,
    'registry:item',
    `${titleOf(component)} CSS`,
    `The ${titleOf(component)} stylesheet to own and edit (re-skin). Import components/nizivo/${name}.css instead of @nizivo/react/css/${component}.css (or after styles.css, where it wins by order within nz.components). Markup, classes, data attributes, behaviour and the base layer still come from npm.`,
    deps(['react'], versions),
    [
      {
        path: `nizivo/${name}.css`,
        type: 'registry:file',
        target: `${TARGET_DIR}/${name}.css`,
        content: `${notice(name, version)}${read(join(reactRoot, 'src', component, `${component}.css`))}`,
      },
    ],
  );
}

/** Every item this release builds, in index order: init, the patterns, the component sheets. */
export function buildItems(
  patterns: readonly string[],
  versions: Record<PackageName, string> = packageVersions(),
): RegistryItem[] {
  const version = versions.react;
  return [
    initItem(version, versions),
    ...patterns.map((name) => patternItem(name, version, versions)),
    ...componentSheets().map((c) => cssItem(c, version, versions)),
  ];
}

/** The item-policy linter (§19.3, K13). An empty list passes. */
export function registryProblems(
  items: readonly RegistryItem[],
  versions: Record<PackageName, string>,
): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  const allowed = new Set(PACKAGES.map((p) => `@nizivo/${p}@${range(versions[p])}`));
  for (const it of items) {
    const at = `${it.name}.json`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(it.name)) problems.push(`${at}: not a kebab-case name`);
    if (names.has(it.name)) problems.push(`${at}: a second item of that name`);
    names.add(it.name);
    // the -source fork items (§5.1) are not built: D-dj
    if (it.name.endsWith('-source')) problems.push(`${at}: no -source fork items (D-dj)`);
    const keys = Object.keys(it).join();
    if (keys !== '$schema,name,type,title,description,dependencies,files') {
      // no registryDependencies (the CLI resolves bare names against shadcn's own registry), no
      // devDependencies, envVars, cssVars or docs
      problems.push(`${at}: fields ${keys}`);
    }
    if (it.title === '' || it.description === '') problems.push(`${at}: no title or description`);
    for (const d of it.dependencies) {
      if (!allowed.has(d)) problems.push(`${at}: dependency ${d} is not @nizivo/* at ~x.y.0`);
    }
    const imported = new Set<PackageName>();
    for (const f of it.files) {
      if (!f.target.startsWith(`${TARGET_DIR}/`) || f.target.includes('..')) {
        problems.push(`${at}: target ${f.target} is outside ${TARGET_DIR}/`);
      }
      // a stylesheet starts with the notice; a module has it after its imports (afterImports)
      const head = `/*\n * Nizivo registry item "${it.name}"`;
      if (
        f.type === 'registry:component'
          ? !f.content.includes(`;\n\n${head}`)
          : !f.content.startsWith(head)
      ) {
        problems.push(`${at}: ${f.path} does not carry the MIT notice where the CLI keeps it`);
      }
      if (!f.content.includes(' * MIT License\n')) problems.push(`${at}: ${f.path} has no licence`);
      if (f.type === 'registry:component') {
        for (const p of importedPackages(f.content)) imported.add(p);
        for (const m of f.content.matchAll(/^import\b[^;]*?'([^']+)';/gms)) {
          const from = m[1] ?? '';
          const own = it.files.some((g) => `./${g.target.slice(TARGET_DIR.length + 1)}` === from);
          if (!own && !from.startsWith('@nizivo/') && from !== 'react') {
            problems.push(`${at}: imports '${from}'`);
          }
        }
      }
    }
    if (it.files.some((f) => f.type === 'registry:component')) {
      const expected = deps([...imported].toSorted(), versions).join();
      if (it.dependencies.join() !== expected) {
        problems.push(`${at}: dependencies ${it.dependencies.join()}, its imports ${expected}`);
      }
    }
  }
  return problems;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** One version's files, relative to its folder: the items, index.json and manifest.json. */
export function versionFiles(items: readonly RegistryItem[], version: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const it of items) files.set(`${it.name}.json`, json(it));
  files.set(
    'index.json',
    json({
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'nizivo',
      homepage: `${ORIGIN}/docs/guides/registry/`,
      items: items.map(({ $schema: _schema, files: itemFiles, ...rest }) => ({
        ...rest,
        files: itemFiles.map(({ content: _content, ...file }) => file),
      })),
    }),
  );
  // every other file's hash, in name order; the manifest names the version it describes
  const sha = Object.fromEntries(
    [...files].toSorted(([a], [b]) => (a < b ? -1 : 1)).map(([f, t]) => [f, sha256(t)]),
  );
  files.set('manifest.json', json({ version, algorithm: 'sha256', files: sha }));
  return files;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** The frozen versions in apps/docs/registry/: `0.3.0` → its files. */
export function frozenVersions(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>();
  if (!existsSync(FROZEN_DIR)) return out;
  for (const entry of readdirSync(FROZEN_DIR, { withFileTypes: true })) {
    const version = /^v(\d+\.\d+\.\d+)$/.exec(entry.name)?.[1];
    if (!entry.isDirectory() || version === undefined) continue;
    const dir = join(FROZEN_DIR, entry.name);
    out.set(
      version,
      new Map(
        readdirSync(dir)
          .toSorted()
          .map((f) => [f, read(join(dir, f))]),
      ),
    );
  }
  return out;
}

export interface Registry {
  /** Path under public/ → text: r/v<version>/…, r/latest/… and _headers. */
  files: Map<string, string>;
  version: string;
  items: number;
  problems: string[];
  frozen: boolean;
}

/** The whole /r tree and the Cloudflare `_headers` that caches it (M67). */
export function buildRegistry(patterns: readonly string[]): Registry {
  const versions = packageVersions();
  const items = buildItems(patterns, versions);
  const problems = registryProblems(items, versions);
  const all = frozenVersions();
  const frozen = all.has(versions.react);
  if (!frozen) all.set(versions.react, versionFiles(items, versions.react));
  const ordered = [...all.keys()].toSorted(compareVersions);
  const latest = ordered.at(-1) ?? versions.react;
  const files = new Map<string, string>();
  for (const v of ordered) {
    for (const [f, text] of all.get(v) ?? []) files.set(`r/v${v}/${f}`, text);
  }
  for (const [f, text] of all.get(latest) ?? []) files.set(`r/latest/${f}`, text);
  files.set(
    '_headers',
    [
      '# generated by apps/docs/scripts/registry.ts; do not edit (Cloudflare Pages, M67)',
      ...ordered.flatMap((v) => [
        `/r/v${v}/*`,
        '  Access-Control-Allow-Origin: *',
        '  Cache-Control: public, max-age=31536000, immutable',
      ]),
      '/r/latest/*',
      '  Access-Control-Allow-Origin: *',
      '  Cache-Control: public, max-age=300',
      '',
    ].join('\n'),
  );
  return { files, version: versions.react, items: items.length, problems, frozen };
}

/** `--freeze`: writes this release's version into apps/docs/registry/ (RELEASING.md). */
function freeze(patterns: readonly string[]): void {
  const versions = packageVersions();
  const dir = join(FROZEN_DIR, `v${versions.react}`);
  if (existsSync(dir)) {
    console.error(
      `registry: v${versions.react} is already frozen; a released version never changes`,
    );
    process.exit(1);
  }
  const items = buildItems(patterns, versions);
  const problems = registryProblems(items, versions);
  if (problems.length > 0) {
    console.error(`registry: ${problems.join('\n')}`);
    process.exit(1);
  }
  mkdirSync(dir, { recursive: true });
  for (const [f, text] of versionFiles(items, versions.react)) writeFileSync(join(dir, f), text);
  console.log(`registry: froze ${items.length} items into ${relative(repoRoot, dir)}`);
}

if (import.meta.main && process.argv.includes('--freeze')) {
  const { patternNames } = await import('./examples.ts');
  freeze(patternNames());
}
