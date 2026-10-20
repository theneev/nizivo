/**
 * Computes every file under `contracts/api` (ARCHITECTURE.md §6, §14.1, §18.1) from the built
 * `@nizivo/react`, `@nizivo/charts` (when the repo has it) and `@nizivo/tokens`, the component
 * manifests and `contracts/vocabulary.json`. Pure apart from reading: it never writes. API-JSON.md
 * is the field reference.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { type ComponentConfig, isRecord, validateComponentConfig } from '../gen/schema.ts';
import {
  type ComponentManifest,
  layerStatement,
  loadComponents,
  loadVocabulary,
} from '../stylelint-config/contract.js';
import { extractCss } from './css.ts';
import { extractReact } from './react.ts';
import { printApiJson } from './text.ts';

export interface ApiResult {
  /** Absolute path → new content, or `null` for a stale generated file to delete. */
  files: Map<string, string | null>;
  errors: string[];
}

export interface ApiOptions {
  /** Token names; read from the built `@nizivo/tokens` under `root` when absent. */
  tokens?: ReadonlySet<string>;
}

const CSS_ENTRY = /^\.\/css\/([^/]+)\.css$/;
/** The part that styles every chart, first in `@nizivo/charts`' `styles.css` (its build-css.ts). */
const CHARTS_FIRST = 'chart-frame';

export function generateApi(root: string, options: ApiOptions = {}): ApiResult {
  const reactDir = join(root, 'packages', 'react');
  const srcDir = join(reactDir, 'src');
  const outDir = join(root, 'contracts', 'api');
  const rel = (file: string) => relative(root, file).split(sep).join('/');
  const errors: string[] = [];

  const pkg = readJson(join(reactDir, 'package.json'));
  const exportsMap = isRecord(pkg.exports) ? pkg.exports : {};
  const manifests = readManifests(srcDir, rel, errors);
  const tokens = options.tokens ?? contractTokens(root);
  const vocabulary = loadVocabulary(root);
  const components = loadComponents(root);
  if (errors.length > 0) return { files: new Map(), errors };

  const files = new Map<string, string | null>();
  const react = extractReact({
    root,
    reactDir,
    exportsMap,
    manifests,
    vocabulary,
    meanings: vocabularyMeanings(root),
  });
  errors.push(...react.errors);
  for (const [path, content] of react.files) files.set(join(outDir, path), printApiJson(content));

  for (const [key, target] of Object.entries(exportsMap)) {
    const name = CSS_ENTRY.exec(key)?.[1];
    if (name === undefined || typeof target !== 'string') continue;
    const built = join(reactDir, target);
    if (!existsSync(built)) {
      errors.push(`packages/react: ${target} is missing; build @nizivo/react first`);
      continue;
    }
    const source = [
      join(srcDir, name, `${name}.css`),
      join(srcDir, 'unstable', name, `${name}.css`),
      join(reactDir, 'styles', `${name}.css`),
    ].find((file) => existsSync(file));
    const css = extractCss({
      code: readFileSync(built, 'utf8'),
      filename: rel(built),
      entry: key,
      component: components.get(name),
      tokens,
      source: source === undefined ? undefined : readFileSync(source, 'utf8'),
    });
    errors.push(...css.errors);
    if (css.file !== undefined)
      files.set(join(outDir, 'css', `${name}.json`), printApiJson(css.file));
  }
  if (errors.length > 0) return { files: new Map(), errors };

  const chartsDir = join(root, 'packages', 'charts');
  if (existsSync(join(chartsDir, 'package.json'))) {
    const charts = generateCharts({ root, chartsDir, rel, tokens, vocabulary, components });
    errors.push(...charts.errors);
    for (const [path, content] of charts.files) files.set(join(outDir, path), content);
    if (errors.length > 0) return { files: new Map(), errors };
  }

  for (const file of jsonFiles(outDir)) if (!files.has(file)) files.set(file, null);
  return { files, errors };
}

interface ChartsInput {
  root: string;
  chartsDir: string;
  rel: (file: string) => string;
  tokens: ReadonlySet<string>;
  vocabulary: ReturnType<typeof loadVocabulary>;
  components: ReadonlyMap<string, ComponentManifest>;
}

/**
 * `charts/<entry>.json` for each JavaScript entry of `@nizivo/charts`, and `charts/css/<part>.json`
 * for each part sheet of its `./styles.css`. Charts parts have no `component.json`, so the files
 * have no `component` and no `slots`; what no subpath folder declares (`_core`) is documented in
 * `charts/index.json`.
 */
function generateCharts(input: ChartsInput): { files: Map<string, string>; errors: string[] } {
  const { chartsDir, rel } = input;
  const files = new Map<string, string>();
  const errors: string[] = [];
  const pkg = readJson(join(chartsDir, 'package.json'));
  const exportsMap = isRecord(pkg.exports) ? pkg.exports : {};

  const entries = extractReact({
    root: input.root,
    reactDir: chartsDir,
    exportsMap,
    manifests: new Map(),
    vocabulary: input.vocabulary,
    meanings: new Map(),
    packageName: '@nizivo/charts',
    barrelOwnsRest: true,
  });
  errors.push(...entries.errors);
  for (const [path, content] of entries.files) files.set(path, printApiJson(content));

  const target = exportsMap['./styles.css'];
  if (typeof target !== 'string') {
    errors.push('packages/charts/package.json: exports no ./styles.css');
    return { files, errors };
  }
  const built = join(chartsDir, target);
  if (!existsSync(built)) {
    errors.push(`packages/charts: ${target} is missing; build @nizivo/charts first`);
    return { files, errors };
  }
  const parts = chartsParts(join(chartsDir, 'src'));
  const sheets = splitSheets(readFileSync(built, 'utf8'), layerStatement(input.root));
  if (sheets.length !== parts.length) {
    errors.push(
      `${rel(built)} holds ${sheets.length} part sheets, src has ${parts.length} (${parts.join(', ')}); rebuild @nizivo/charts`,
    );
    return { files, errors };
  }
  for (const [index, part] of parts.entries()) {
    const code = sheets[index] ?? '';
    // Each part sheet selects its own classes (`.nz-<part>`, `.nz-<part>-*`): a sheet without one
    // is out of place, so dist is stale.
    if (!new RegExp(`\\.nz-${part}(?![a-z0-9_])`).test(code)) {
      errors.push(
        `${rel(built)}: part sheet ${index + 1} selects no .nz-${part} class; rebuild @nizivo/charts`,
      );
      continue;
    }
    const source = join(chartsDir, 'src', part, `${part}.css`);
    const css = extractCss({
      code,
      filename: `${rel(built)} (${part})`,
      entry: './styles.css',
      component: input.components.get(part),
      tokens: input.tokens,
      source: readFileSync(source, 'utf8'),
      package: '@nizivo/charts',
    });
    errors.push(...css.errors);
    if (css.file !== undefined)
      files.set(join('charts', 'css', `${part}.json`), printApiJson(css.file));
  }
  return { files, errors };
}

/**
 * The parts `styles.css` concatenates, in its order: every `src/<name>/<name>.css`, ChartFrame's
 * shared base first, then by path (packages/charts/scripts/build-css.ts, `sources()`).
 */
function chartsParts(srcDir: string): string[] {
  if (!existsSync(srcDir)) return [];
  const names = readdirSync(srcDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(srcDir, entry.name, `${entry.name}.css`)),
    )
    .map((entry) => entry.name);
  return names.toSorted(
    (a, b) =>
      Number(a !== CHARTS_FIRST) - Number(b !== CHARTS_FIRST) ||
      (sheetPath(a) < sheetPath(b) ? -1 : 1),
  );
}

/** `bar-chart` → `bar-chart/bar-chart.css`, the path build-css.ts sorts by. */
function sheetPath(name: string): string {
  return `${name}/${name}.css`;
}

/** A concatenation of built sheets, each starting with the canonical layer statement, split back. */
export function splitSheets(code: string, statement: string): string[] {
  if (!code.startsWith(statement)) return [];
  return code
    .split(statement)
    .slice(1)
    .map((rest) => `${statement}${rest}`);
}

function readJson(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isRecord(value)) throw new Error(`${file} must hold a JSON object`);
  return value;
}

/** Every `component.json` under `src` and `src/unstable`, validated, by folder (`alert`). */
function readManifests(
  srcDir: string,
  rel: (file: string) => string,
  errors: string[],
): Map<string, ComponentConfig> {
  const manifests = new Map<string, ComponentConfig>();
  const visit = (dir: string, prefix: string, unstable: boolean) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).toSorted((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      if (!entry.isDirectory()) continue;
      if (!unstable && entry.name === 'unstable') {
        visit(join(dir, entry.name), 'unstable/', true);
        continue;
      }
      const file = join(dir, entry.name, 'component.json');
      if (!existsSync(file)) continue;
      const validated = validateComponentConfig(readJson(file), basename(entry.name), unstable);
      if ('errors' in validated) {
        errors.push(...validated.errors.map((message) => `${rel(file)}: ${message}`));
      } else {
        manifests.set(`${prefix}${entry.name}`, validated.config);
      }
    }
  };
  visit(srcDir, '', false);
  return manifests;
}

/** The token names of `<root>/packages/tokens`'s published `contract.json` (its `variables`). */
export function contractTokens(root: string): Set<string> {
  const tokensDir = join(root, 'packages', 'tokens');
  const manifest = readJson(join(tokensDir, 'package.json'));
  const target = isRecord(manifest.exports) ? manifest.exports['./contract.json'] : undefined;
  if (typeof target !== 'string') {
    throw new Error('packages/tokens/package.json exports no ./contract.json');
  }
  const file = join(tokensDir, target);
  if (!existsSync(file)) {
    throw new Error(
      `packages/tokens/${target.replace(/^\.\//, '')} is missing; build @nizivo/tokens first`,
    );
  }
  const contract = readJson(file);
  if (!isRecord(contract.variables)) throw new Error(`${file} has no "variables" object`);
  return new Set(Object.keys(contract.variables));
}

/** The `meaning` of every attribute in `contracts/vocabulary.json`. */
function vocabularyMeanings(root: string): Map<string, string> {
  const raw = readJson(join(root, 'contracts', 'vocabulary.json'));
  const meanings = new Map<string, string>();
  for (const group of Object.values(raw)) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (isRecord(item) && typeof item.name === 'string' && typeof item.meaning === 'string') {
        meanings.set(item.name, item.meaning);
      }
    }
  }
  return meanings;
}

/** The `.json` files under `contracts/api`, at any depth. */
function jsonFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.json'))
    .map((file) => join(dir, file));
}
