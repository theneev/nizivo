// The CSS contract (ARCHITECTURE.md §4.1 L3, §8): what shipped CSS may select and read. The
// stylelint rules check it in source; @nizivo/react's build checks it again on the emitted CSS.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {import('./contract.d.ts').VocabularyEntry} VocabularyEntry */
/** @typedef {import('./contract.d.ts').Vocabulary} Vocabulary */
/** @typedef {import('./contract.d.ts').ComponentManifest} ComponentManifest */
/** @typedef {import('./contract.d.ts').Components} Components */

export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** Root and part classes: nz-<component>[-<part>], kebab-case, no BEM separators (§8.2). */
export const CLASS_PATTERN = /^nz(-[a-z0-9]+)+$/;

/** Written by components through CSSOM (§8.3): read-only for consumers, and not tokens. */
export const RUNTIME_VARIABLES = new Set([
  '--nz-trigger-width',
  '--nz-available-width',
  '--nz-available-height',
  '--nz-transform-origin',
  '--nz-toast-inset',
  '--nz-layout-top-inset',
  '--nz-layout-bottom-inset',
]);

/** Native overlay state exists only for native overlays, so it is never public (§8.3 rule 2). */
export const NATIVE_OVERLAY_STATE = new Set([':popover-open', ':modal', '::backdrop', '[open]']);

const GROUPS = /** @type {const} */ (['state', 'presentational', 'local', 'scope']);
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** @param {string} file */
const posix = (file) => file.replaceAll('\\', '/');

/** @param {string} file @returns {unknown} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {unknown} value @returns {value is Record<string, unknown>} */
const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** `ProgressBar` → `progress-bar`; the same rule as nz gen's `kebabCase`. */
const kebabCase = (/** @type {string} */ pascal) =>
  pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** `data-full-width` → `fullWidth`: the manifest `variants` key for a `data-<prop>` attribute. */
const propOf = (/** @type {string} */ attribute) =>
  attribute.slice('data-'.length).replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());

/** The canonical layer statement: the one non-comment line of contracts/layers.css (§8.1). */
export function layerStatement(root = REPO_ROOT) {
  const text = readFileSync(join(root, 'contracts', 'layers.css'), 'utf8');
  const line = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((part) => part.trim())
    .find((part) => part !== '');
  if (line === undefined || !/^@layer [a-z.]+(, [a-z.]+)*;$/.test(line)) {
    throw new Error(`${join(root, 'contracts', 'layers.css')} must hold one @layer statement`);
  }
  return line;
}

/** `@layer a, b;` → `['a', 'b']`. */
export function layerNames(/** @type {string} */ statement) {
  return statement
    .replace(/^@layer\s+/, '')
    .replace(/;\s*$/, '')
    .split(',')
    .map((name) => name.trim());
}

/** @type {Map<string, Vocabulary>} */
const vocabularies = new Map();

/** contracts/vocabulary.json, keyed by attribute name (§8.3). */
export function loadVocabulary(root = REPO_ROOT) {
  const cached = vocabularies.get(root);
  if (cached !== undefined) return cached;
  const raw = readJson(join(root, 'contracts', 'vocabulary.json'));
  /** @type {Map<string, VocabularyEntry>} */
  const entries = new Map();
  for (const group of GROUPS) {
    const list = isRecord(raw) ? raw[group] : undefined;
    if (!Array.isArray(list)) throw new Error(`contracts/vocabulary.json: "${group}" is missing`);
    for (const item of list) {
      if (!isRecord(item) || typeof item.name !== 'string') continue;
      const values = Array.isArray(item.values)
        ? item.values.filter((value) => typeof value === 'string')
        : null;
      entries.set(item.name, {
        name: item.name,
        group,
        presence: item.presence === true,
        values: item.presence === true ? [] : values,
        reserved: item.reserved === true,
      });
    }
  }
  vocabularies.set(root, entries);
  return entries;
}

/** @param {string} dir */
function subdirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .toSorted();
}

/** @type {Map<string, Components>} */
const componentSets = new Map();

/**
 * Every packages/react/src/<name>/component.json and src/unstable/<name>/component.json, read as
 * plain JSON (nz gen validates them): the component name, its slot prefixes and its variants. Then
 * every @nizivo/charts part with a stylesheet (src/<name>/<name>.css), named by its folder.
 */
export function loadComponents(root = REPO_ROOT) {
  const cached = componentSets.get(root);
  if (cached !== undefined) return cached;
  const src = join(root, 'packages', 'react', 'src');
  /** @type {Map<string, ComponentManifest>} */
  const components = new Map();
  const dirs = subdirs(src).flatMap((dir) => (basename(dir) === 'unstable' ? subdirs(dir) : [dir]));
  for (const dir of dirs) {
    const file = join(dir, 'component.json');
    if (!existsSync(file)) continue;
    const raw = readJson(file);
    if (!isRecord(raw) || typeof raw.name !== 'string' || !KEBAB.test(raw.name)) continue;
    const exports = Array.isArray(raw.exports)
      ? raw.exports.filter((name) => typeof name === 'string')
      : [];
    /** @type {Record<string, string[]>} */
    const variants = {};
    if (isRecord(raw.variants)) {
      for (const [prop, values] of Object.entries(raw.variants)) {
        if (Array.isArray(values)) variants[prop] = values.filter((v) => typeof v === 'string');
      }
    }
    components.set(raw.name, {
      name: raw.name,
      prefixes: [...new Set([raw.name, ...exports.map(kebabCase)])],
      variants,
    });
  }
  // @nizivo/charts parts have no component.json (nz gen does not manage them): each
  // src/<name>/<name>.css is a part whose hooks are --nz-<name>-*, with no variants (§14.1).
  for (const dir of subdirs(join(root, 'packages', 'charts', 'src'))) {
    const name = basename(dir);
    if (!KEBAB.test(name) || !existsSync(join(dir, `${name}.css`)) || components.has(name))
      continue;
    components.set(name, { name, prefixes: [name], variants: {} });
  }
  componentSets.set(root, components);
  return components;
}

/**
 * The component a stylesheet belongs to: src/<name>/<name>.css, src/unstable/<name>/<name>.css or
 * dist/css/<name>.css. Shared stylesheets (styles/base.css) belong to none.
 */
export function componentOf(/** @type {string} */ file, /** @type {Components} */ components) {
  const path = posix(file);
  const match =
    /\/src\/(?:unstable\/)?([^/]+)\/[^/]+\.css$/.exec(path) ??
    /\/dist\/css\/([^/]+)\.css$/.exec(path) ??
    /^([^/]+)\.css$/.exec(path);
  return match?.[1] === undefined ? undefined : components.get(match[1]);
}

/** The layer a stylesheet writes into, from its path (§8.1). */
export function expectedLayer(/** @type {string} */ file) {
  const path = posix(file);
  const styles = /\/styles\/(base|reset|utilities)\.css$/.exec(path);
  if (styles?.[1] !== undefined) return `nz.${styles[1]}`;
  if (path.includes('/patterns/')) return 'nz.patterns';
  return 'nz.components';
}

/**
 * Every layer a stylesheet may write into: its own, plus nz.utilities for base.css, which ships the
 * a11y floor and the utilities in one file (§5.2).
 */
export function expectedLayers(/** @type {string} */ file) {
  const layer = expectedLayer(file);
  return layer === 'nz.base' ? [layer, 'nz.utilities'] : [layer];
}

/**
 * Whether a `data-*` attribute in a selector is in the vocabulary (§8.3). Values listed as null
 * in the vocabulary come from the component manifest: `data-variant` from `variants.variant`.
 *
 * @param {{ name: string; operator?: string | undefined; value?: string | undefined }} attribute
 * @param {import('./contract.d.ts').AttributeContext} context
 */
export function attributeProblem(attribute, context) {
  const { name, operator, value } = attribute;
  if (!name.startsWith('data-')) return undefined;
  const entry = context.vocabulary.get(name);
  if (entry === undefined) return `"${name}" is not in contracts/vocabulary.json (§8.3)`;
  if (entry.reserved) return `"${name}" is reserved and has no values in 0.x (§8.3)`;
  if (value === undefined) return undefined;
  if (operator !== '=') return `match "${name}" with "=" only: vocabulary values are exact (§8.3)`;
  if (entry.presence) {
    return `"${name}" is a presence attribute: select [${name}], not a value (§8.3 rule 4)`;
  }
  if (entry.values !== null) {
    return entry.values.includes(value)
      ? undefined
      : `"${value}" is not a value of "${name}" (expected ${entry.values.join(', ')}; §8.3)`;
  }
  if (name === 'data-slot') {
    const known = [...context.components.values()].some((component) =>
      component.prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}-`)),
    );
    return known ? undefined : `data-slot "${value}" is not a slot of any component (§8.2)`;
  }
  const prop = propOf(name);
  const owners =
    context.component === undefined ? [...context.components.values()] : [context.component];
  const values = owners.flatMap((component) => component.variants[prop] ?? []);
  if (values.includes(value)) return undefined;
  const where =
    context.component === undefined
      ? 'any component.json'
      : `${context.component.name}/component.json`;
  return `"${value}" is not a value of "${name}" in ${where} "variants.${prop}" (§8.3)`;
}

/**
 * What a custom property name read with `var()` is (§8.2, §8.4): a `--_nz-*` private, a runtime
 * variable, a token, or a hook of this component. The one classifier behind the stylelint rule, the
 * emitted-CSS check and `nz api`'s hook tables, so they cannot disagree. `unchecked` means the
 * token names are not available, so a hook-shaped name cannot be told from a token.
 *
 * @param {string} name
 * @param {import('./contract.d.ts').VariableContext} context
 * @returns {import('./contract.d.ts').VariableKind}
 */
export function classifyVariable(name, context) {
  if (name.startsWith('--_nz-')) return 'private';
  if (!name.startsWith('--nz-')) return 'foreign';
  if (name.startsWith('--nz-p-')) return 'primitive';
  if (RUNTIME_VARIABLES.has(name)) return 'runtime';
  if (context.tokens?.has(name) === true) return 'token';
  // Without the token names, a hook-shaped name may be a token (--nz-grid-columns in grid.css).
  const tokens = context.tokens;
  if (tokens === undefined) return 'unchecked';
  // A prefix that is also a token family (text, grid) names tokens only, so a missing name under it
  // is a missing token, never a hook.
  const hook = context.component?.prefixes.some(
    (prefix) =>
      name.startsWith(`--nz-${prefix}-`) &&
      ![...tokens].some((token) => token.startsWith(`--nz-${prefix}-`)),
  );
  return hook === true ? 'hook' : 'unknown';
}

/**
 * Whether a `var()` read is allowed (§8.2, §8.4): a token, a runtime variable, or a hook of this
 * component read with a fallback. `tokens` is undefined when the token names are not available,
 * and then only the shape is checked. The caller pairs `--_nz-*` reads with their declarations.
 *
 * @param {{ name: string; hasFallback: boolean }} variable
 * @param {import('./contract.d.ts').VariableContext} context
 */
export function variableProblem(variable, context) {
  const { name, hasFallback } = variable;
  switch (classifyVariable(name, context)) {
    case 'foreign':
      return `"${name}" is not a Nizivo variable: read --nz-* tokens and hooks or --_nz-* privates (§8.2)`;
    case 'primitive':
      return `"${name}" is a private primitive: read a semantic token instead (§7.2)`;
    case 'hook':
      return hasFallback
        ? undefined
        : `hook "${name}" must be read with a fallback, var(${name}, var(--_nz-…)) (§8.4 rule 1)`;
    case 'unknown':
      return `"${name}" is not a token in @nizivo/tokens, a runtime variable or a hook of this component (§8.4)`;
    default:
      return undefined;
  }
}

/**
 * The file @nizivo/tokens publishes at `subpath`, or undefined while its exports map does not list
 * that subpath yet. A listed file that is missing means the package has not been built.
 */
export function tokensFile(/** @type {string} */ subpath) {
  const require = createRequire(import.meta.url);
  const manifestFile = require.resolve('@nizivo/tokens/package.json');
  const manifest = readJson(manifestFile);
  const exportsMap = isRecord(manifest) && isRecord(manifest.exports) ? manifest.exports : {};
  const target = exportsMap[subpath];
  const relative =
    typeof target === 'string' ? target : isRecord(target) ? target.default : undefined;
  if (typeof relative !== 'string') return undefined;
  const file = join(dirname(manifestFile), relative);
  if (!existsSync(file)) {
    throw new Error(
      `@nizivo/tokens lists ${subpath} but ${file} is missing: build @nizivo/tokens first`,
    );
  }
  return file;
}

/**
 * The token names in @nizivo/tokens/contract.json (the keys of its `variables`), or undefined
 * while the package does not publish it.
 *
 * @returns {ReadonlySet<string> | undefined}
 */
export function loadContractTokens() {
  const file = tokensFile('./contract.json');
  if (file === undefined) return undefined;
  const contract = readJson(file);
  if (!isRecord(contract) || !isRecord(contract.variables)) {
    throw new Error(`${file} has no "variables" object`);
  }
  return new Set(Object.keys(contract.variables));
}
