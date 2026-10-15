// The seam cost harness (ARCHITECTURE.md §4.2 K6, §17.2 "Engine seam overhead", §21.1 W5 and exit
// criterion 9): what the engine adapter layer costs over using React Aria directly, for Select,
// Dialog, Tooltip, Menu and Tabs, alone and together.
//
//   node packages/tooling/size/seam/seam.ts            print the tables
//   node packages/tooling/size/seam/seam.ts --write    also write seam/results.json and SIZES.md's
//                                                      seam section
//
// Run after `pnpm build`. Every bundle goes through the same esbuild binary size-limit uses (0.28.2,
// resolved through @size-limit/esbuild), with method.ts's options, React external, then gzip -9 of the
// output. These are raw output sizes, so each reads 32 B above size-limit's figure for the same file
// (size-limit subtracts its empty-bundle constant); differences are unaffected.
//
// Per component, four bundles:
//   floor    the React Aria values the Nizivo subpath imports (found by walking its dist graph),
//            re-exported: the engine code any React Aria implementation of the same parts carries
//   direct   seam/direct/<name>.tsx: the same parts written on React Aria directly, with the same
//            classes and data-slot hooks and the locale provider (each file lists what it leaves out)
//   adapter  dist/_engines/react-aria/<name>.client.js: the engine adapter alone
//   subpath  dist/<name>/index.js: what a consumer imports
// and the subpath's own code, by layer, from esbuild's metafile (minified bytes, before gzip).
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { ESBUILD_METHOD, PEERS, REACT_DIR, REPO_ROOT } from '../method.ts';
import { formatMarkdown, replaceBlock } from '../measure.ts';

// The slice of esbuild's API used here (its types live with size-limit's plugin, not this package).
interface Metafile {
  outputs: Record<string, { inputs: Record<string, { bytesInOutput: number }> }>;
}
interface BuildResult {
  outputFiles: Array<{ path: string; contents: Uint8Array }>;
  metafile: Metafile;
}
interface Esbuild {
  version: string;
  build(options: Record<string, unknown>): Promise<BuildResult>;
}

// pnpm links esbuild beside the plugin in its store folder, so resolve from the real path.
const fromPlugin = createRequire(
  realpathSync(join(REACT_DIR, 'node_modules', '@size-limit', 'esbuild', 'package.json')),
);
const loaded: unknown = fromPlugin('esbuild');
function isEsbuild(value: unknown): value is Esbuild {
  return (
    typeof value === 'object' &&
    value !== null &&
    'build' in value &&
    typeof value.build === 'function' &&
    'version' in value &&
    typeof value.version === 'string'
  );
}
if (!isEsbuild(loaded)) throw new Error('esbuild did not load from @size-limit/esbuild');
const esbuild = loaded;

const DIST = join(REACT_DIR, 'dist');
const DIRECT = join(import.meta.dirname, 'direct');
const RESULTS = join(import.meta.dirname, 'results.json');
const SIZES_MD = join(REACT_DIR, 'SIZES.md');
export const COMPONENTS = ['select', 'dialog', 'tooltip', 'menu', 'tabs'] as const;

/** The temporary folder for generated entries; created by main(). */
let stage = '';

/** Bundles one entry with the size method; returns gzip bytes and the metafile's inputs. */
async function bundle(entry: string): Promise<{ gzip: number; inputs: Record<string, number> }> {
  const result = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
    ...ESBUILD_METHOD,
    external: [...PEERS],
    // The direct baselines and the generated floor live outside @nizivo/react, the only package
    // that resolves React Aria under pnpm.
    nodePaths: [join(REACT_DIR, 'node_modules')],
    absWorkingDir: REPO_ROOT,
    outdir: stage,
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  const js = result.outputFiles.filter((file) => file.path.endsWith('.js'));
  if (js.length !== 1) throw new Error(`${entry}: expected one output, got ${js.length}`);
  const [output] = Object.values(result.metafile.outputs);
  const inputs: Record<string, number> = {};
  for (const [path, input] of Object.entries(output?.inputs ?? {}))
    inputs[path] = input.bytesInOutput;
  return { gzip: gzipSync(js[0]?.contents ?? new Uint8Array(), { level: 9 }).length, inputs };
}

// `import … from "x"`, `export … from "x"` and bare `import "x"` in rolldown's dist output.
const IMPORT =
  /(?:import|export)\s+([^'";]*?)\s*from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

/**
 * The React Aria values a dist module graph imports, by specifier (`react-aria-components`,
 * `react-aria/<hook>`), found by following its relative imports.
 */
export function engineImports(entry: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  const seen = new Set<string>();
  const walk = (file: string): void => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
      const clause = match[1] ?? '';
      const specifier = match[2] ?? match[3] ?? '';
      if (specifier.startsWith('.') || isAbsolute(specifier)) {
        walk(resolve(dirname(file), specifier));
      } else if (specifier.startsWith('react-aria')) {
        const names = /^\{([^}]*)\}$/.exec(clause)?.[1];
        if (names === undefined)
          throw new Error(`${file}: "${clause}" from ${specifier} is not a named import`);
        const set = out.get(specifier) ?? new Set<string>();
        for (const name of names.split(',')) {
          const imported = name.trim().split(/\s+as\s+/)[0];
          if (imported) set.add(imported);
        }
        out.set(specifier, set);
      }
    }
  };
  walk(entry);
  return out;
}

/** Writes an entry that re-exports the given React Aria values, and returns its path. */
function floorEntry(name: string, imports: Map<string, Set<string>>): string {
  const lines = [...imports]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([specifier, names]) => {
      // The same value can come from two specifiers; alias by specifier so names never collide.
      const tag = specifier.replace(/\W+/g, '_');
      const list = [...names].toSorted().map((n) => `${n} as ${tag}_${n}`);
      return `export { ${list.join(', ')} } from '${specifier}';`;
    });
  const file = join(stage, `floor-${name}.js`);
  writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

function reexportEntry(name: string, modules: Record<string, string>): string {
  const lines = Object.entries(modules).map(([as, path]) => `export * as ${as} from '${path}';`);
  const file = join(stage, `${name}.js`);
  writeFileSync(file, `${lines.join('\n')}\n`);
  return file;
}

/** The metafile layer a bundled input belongs to. */
export function layer(input: string): Layer {
  const path = input.split(sep).join('/');
  if (path.includes('/node_modules/')) return 'engine';
  const at = path.indexOf('packages/react/dist/');
  // A generated entry (the five-together re-export) holds only export statements.
  if (at === -1) return 'leaf';
  const rel = path.slice(at + 'packages/react/dist/'.length);
  if (
    /^contracts\/(state|details)\.js$/.test(rel) ||
    /^_engines\/react-aria\/(dom|dom-allowlist|locale\.client)\.js$/.test(rel) ||
    rel === 'config/config.client.js'
  ) {
    return 'k6';
  }
  if (/^contracts\/(render|merge-props)\.js$/.test(rel)) return 'k7';
  if (/^_engines\/react-aria\/(overlay|popup)\.client\.js$/.test(rel)) return 'family';
  if (rel.startsWith('_engines/')) return 'adapter';
  return 'leaf';
}
export type Layer = 'engine' | 'k6' | 'k7' | 'family' | 'adapter' | 'leaf';
const LAYERS: Layer[] = ['leaf', 'adapter', 'family', 'k6', 'k7'];

interface Row {
  name: string;
  floor: number;
  direct: number;
  adapter: number;
  subpath: number;
  /** Minified bytes (before gzip) of the subpath's own code, by layer. */
  own: Record<Exclude<Layer, 'engine'>, number>;
}

async function measure(
  name: string,
  subpathEntry: string,
  adapterEntry: string,
  directEntry: string,
): Promise<Row> {
  const imports = engineImports(subpathEntry);
  const [floor, direct, adapter, subpath] = await Promise.all([
    bundle(floorEntry(name, imports)),
    bundle(directEntry),
    bundle(adapterEntry),
    bundle(subpathEntry),
  ]);
  const own = { leaf: 0, adapter: 0, family: 0, k6: 0, k7: 0 };
  for (const [input, bytes] of Object.entries(subpath.inputs)) {
    const l = layer(input);
    if (l !== 'engine') own[l] += bytes;
  }
  return {
    name,
    floor: floor.gzip,
    direct: direct.gzip,
    adapter: adapter.gzip,
    subpath: subpath.gzip,
    own,
  };
}

const n = (value: number): string => value.toLocaleString('en-US');
const signed = (value: number): string => (value >= 0 ? `+${n(value)}` : `−${n(-value)}`);
const TITLE: Record<string, string> = {
  select: 'Select',
  dialog: 'Dialog',
  tooltip: 'Tooltip',
  menu: 'Menu',
  tabs: 'Tabs',
  all: 'All five together',
};

export function seamTables(rows: readonly Row[], k6: number): string {
  const out = [
    `esbuild ${esbuild.version}; gzip -9 bytes of the raw output (32 B above size-limit's figure for the same entry). React external; React Aria bundled, all locales.`,
    '',
    '| Component | React Aria floor | RAC direct | Nizivo adapter | Nizivo subpath | Subpath − direct | Adapter − floor | Subpath − adapter |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map(
      (r) =>
        `| ${TITLE[r.name] ?? r.name} | ${n(r.floor)} | ${n(r.direct)} | ${n(r.adapter)} | ${n(r.subpath)} | ${signed(r.subpath - r.direct)} | ${signed(r.adapter - r.floor)} | ${signed(r.subpath - r.adapter)} |`,
    ),
    '',
    "The subpath's own code by layer (minified bytes before gzip, from esbuild's metafile; gzip compresses the sum, so the columns do not add up to the gzip deltas):",
    '',
    '| Component | Leaf (parts, classes, glyphs) | Adapter | Family helpers (overlay, popup) | K6 helpers | K7 helpers | Own total |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...rows.map((r) => {
      const total = LAYERS.reduce((sum, l) => sum + (l === 'engine' ? 0 : r.own[l]), 0);
      return `| ${TITLE[r.name] ?? r.name} | ${n(r.own.leaf)} | ${n(r.own.adapter)} | ${n(r.own.family)} | ${n(r.own.k6)} | ${n(r.own.k7)} | ${n(total)} |`;
    }),
    '',
    `K6 helpers alone (stateAttrs, details, EngineLocale with the config context, engineDom and defined with the attribute allowlist), React Aria external: **${n(k6)} B** gzip raw (the size budget's figure is 32 B lower).`,
  ];
  return out.join('\n');
}

const START =
  '<!-- seam:tables:start (generated by packages/tooling/size/seam/seam.ts --write) -->';
const END = '<!-- seam:tables:end -->';

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { write: { type: 'boolean' } } });
  stage = mkdtempSync(join(tmpdir(), 'nz-seam-'));
  try {
    const rows: Row[] = await Promise.all(
      COMPONENTS.map((name) =>
        measure(
          name,
          join(DIST, name, 'index.js'),
          join(DIST, '_engines', 'react-aria', `${name}.client.js`),
          join(DIRECT, `${name}.tsx`),
        ),
      ),
    );
    rows.push(
      await measure(
        'all',
        reexportEntry(
          'subpath-all',
          Object.fromEntries(COMPONENTS.map((c) => [c, join(DIST, c, 'index.js')])),
        ),
        reexportEntry(
          'adapter-all',
          Object.fromEntries(
            COMPONENTS.map((c) => [c, join(DIST, '_engines', 'react-aria', `${c}.client.js`)]),
          ),
        ),
        join(DIRECT, 'all.ts'),
      ),
    );
    const k6 = await bundleK6();
    const tables = seamTables(rows, k6);
    console.log(tables);
    if (values.write === true) {
      const results = {
        $comment:
          'Written by packages/tooling/size/seam/seam.ts --write. gzip -9 bytes of raw esbuild output; `own` is minified bytes by layer.',
        esbuild: esbuild.version,
        k6,
        rows,
      };
      writeFileSync(RESULTS, `${JSON.stringify(results, null, 2)}\n`);
      replaceBlock(SIZES_MD, START, END, tables);
      formatMarkdown(SIZES_MD);
      console.log(
        `\nWrote ${relative(REPO_ROOT, RESULTS)} and the seam section of ${relative(REPO_ROOT, SIZES_MD)}`,
      );
    }
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}

/** The K6 helpers alone, React Aria external (the same entry as the size budget's seam K6 check). */
async function bundleK6(): Promise<number> {
  const result = await esbuild.build({
    entryPoints: [join(import.meta.dirname, '..', 'entries', 'seam-k6.js')],
    bundle: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
    treeShaking: true,
    ...ESBUILD_METHOD,
    external: [...PEERS, 'react-aria-components', 'react-aria'],
    outdir: stage,
    write: false,
    logLevel: 'silent',
  });
  const js = result.outputFiles.find((file) => file.path.endsWith('.js'));
  return gzipSync(js?.contents ?? new Uint8Array(), { level: 9 }).length;
}

if (import.meta.main) await main();
