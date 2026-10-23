/**
 * Computes every file `nz gen` owns from the `component.json` files under packages/react/src
 * (ARCHITECTURE.md §6, §9.2, §5.2, §20.2). Pure: it reads the tree and returns contents, it never writes.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { clearExportCache, exportOrigin, interfaceMembers, readExports } from './exports.ts';
import { exportFrom, HEADER, printJson, TS_HEADER, tsModule } from './format.ts';
import { type ComponentConfig, isRecord, pascalCase, validateComponentConfig } from './schema.ts';

interface Export {
  name: string;
  /** Absolute path of the module in the component folder that exports it. */
  module: string;
}

interface Component {
  config: ComponentConfig;
  dir: string;
  /** `select` or `unstable/select`: the folder under src/ and the exports subpath. */
  subpath: string;
  pascal: string;
  /** Part name → its `<Pascal><Part>` export; empty for a simple component. */
  parts: { part: string; export: Export }[];
  /** Every flat value export of the subpath, parts first. */
  values: Export[];
  types: Export[];
  /** The adapter module and the `<Pascal>Engine` members that engine.ts re-exports from it. */
  engine?: { module: string; names: string[] };
  hasCss: boolean;
}

export interface GenResult {
  /** Absolute path → new content, or `null` for a stale generated file to delete. */
  files: Map<string, string | null>;
  errors: string[];
}

const SOURCE = /\.tsx?$/;
const NOT_SOURCE = /\.d\.ts$|\.(test|spec|example|stories)\.tsx?$/;

export function generate(root: string): GenResult {
  clearExportCache();
  const reactDir = join(root, 'packages', 'react');
  const srcDir = join(reactDir, 'src');
  const errors: string[] = [];
  const files = new Map<string, string | null>();
  const rel = (path: string) => relative(root, path).split(sep).join('/');

  const components: Component[] = [];
  for (const found of discover(srcDir)) {
    const configFile = join(found.dir, 'component.json');
    const componentErrors: string[] = [];
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(configFile, 'utf8'));
    } catch (error) {
      errors.push(`${rel(configFile)}: invalid JSON (${errorMessage(error)})`);
      continue;
    }
    const validated = validateComponentConfig(raw, basename(found.dir), found.unstable);
    if ('errors' in validated) {
      errors.push(...validated.errors.map((message) => `${rel(configFile)}: ${message}`));
      continue;
    }
    const component = resolveComponent(
      validated.config,
      found.dir,
      srcDir,
      reactDir,
      componentErrors,
      rel,
    );
    errors.push(...componentErrors.map((message) => `${rel(configFile)}: ${message}`));
    if (component !== undefined) components.push(component);
  }

  const names = new Map<string, string>();
  for (const component of components) {
    const previous = names.get(component.config.name);
    if (previous !== undefined) {
      errors.push(
        `component "${component.config.name}" exists twice: src/${previous} and src/${component.subpath}`,
      );
    }
    names.set(component.config.name, component.subpath);
  }

  for (const component of components) writeComponentFiles(component, files);
  files.set(join(srcDir, 'index.ts'), rootBarrel(components, errors));

  const packageFile = join(reactDir, 'package.json');
  const pkg = readJsonObject(packageFile);
  const exportsMap = isRecord(pkg.exports) ? pkg.exports : {};
  files.set(
    packageFile,
    `${JSON.stringify({ ...pkg, exports: packageExports(exportsMap, components, reactDir) }, null, 2)}\n`,
  );

  files.set(
    join(root, 'design', 'component-map.json'),
    componentMap(components, String(pkg.name), errors),
  );

  return errors.length > 0 ? { files: new Map(), errors } : { files, errors };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readJsonObject(file: string): Record<string, unknown> {
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!isRecord(value)) throw new Error(`${file} must hold a JSON object`);
  return value;
}

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .toSorted();
}

function discover(srcDir: string): { dir: string; unstable: boolean }[] {
  const found: { dir: string; unstable: boolean }[] = [];
  for (const dir of subdirs(srcDir)) {
    if (basename(dir) === 'unstable') {
      for (const inner of subdirs(dir)) {
        if (existsSync(join(inner, 'component.json'))) found.push({ dir: inner, unstable: true });
      }
    } else if (existsSync(join(dir, 'component.json'))) {
      found.push({ dir, unstable: false });
    }
  }
  return found;
}

function resolveComponent(
  config: ComponentConfig,
  dir: string,
  srcDir: string,
  reactDir: string,
  errors: string[],
  rel: (path: string) => string,
): Component | undefined {
  const pascal = pascalCase(config.name);
  const generatedNames = new Set(['index.ts', 'engine.ts', `${config.name}.parts.ts`]);
  const modules = readdirSync(dir)
    .filter((file) => SOURCE.test(file) && !NOT_SOURCE.test(file) && !generatedNames.has(file))
    .toSorted()
    .map((file) => join(dir, file));

  const find = (name: string): Export | undefined => {
    const owners = modules.filter((module) => readExports(module).values.has(name));
    if (owners.length === 1 && owners[0] !== undefined) return { name, module: owners[0] };
    if (owners.length > 1) {
      errors.push(
        `"${name}" is exported by more than one module (${owners.map(rel).join(', ')}); export it from one`,
      );
    } else {
      const asType = modules.some((module) => readExports(module).types.has(name));
      errors.push(
        asType
          ? `"${name}" is exported only as a type; it must be a value (a component or function)`
          : `"${name}" is not exported by any module in ${rel(dir)} (expected a named export such as "export function ${name}")`,
      );
    }
    return undefined;
  };

  const partNames = config.parts ?? [];
  const extra = config.exports ?? (partNames.length === 0 ? [pascal] : []);
  const clash = partNames.map((part) => pascal + part).filter((name) => extra.includes(name));
  if (clash.length > 0) errors.push(`"exports" repeats part exports ${clash.join(', ')}`);
  if (partNames.length > 0 && extra.includes(pascal)) {
    errors.push(
      `"exports" cannot list "${pascal}": it is the namespace of this compound component`,
    );
  }

  const parts: Component['parts'] = [];
  for (const part of partNames) {
    const found = find(pascal + part);
    if (found !== undefined) parts.push({ part, export: found });
  }
  const values = parts.map((part) => part.export);
  for (const name of extra) {
    const found = find(name);
    if (found !== undefined) values.push(found);
  }

  const contract = join(dir, `${config.name}.contract.ts`);
  let engineSeam: Component['engine'];
  const engine = config.engine;
  if (engine !== undefined) {
    // engine.ts re-exports the members of the typed <Pascal>Engine interface (§9.2), not the public
    // parts: leaf-only parts (Dialog's Body and Footer) have no engine counterpart.
    const seam = `${pascal}Engine`;
    const names = existsSync(contract) ? interfaceMembers(contract, seam) : undefined;
    if (names === undefined || names.length === 0) {
      errors.push(
        `engine-tier components declare their seam as an exported "interface ${seam}" with at least one member in ${rel(contract)}`,
      );
    }
    const module = [`${config.name}.client.tsx`, `${config.name}.client.ts`]
      .map((file) => join(srcDir, '_engines', engine, file))
      .find((file) => existsSync(file));
    if (module === undefined) {
      errors.push(
        `engine adapter not found: ${rel(join(srcDir, '_engines', engine, `${config.name}.client.tsx`))}`,
      );
    } else if (names !== undefined && names.length > 0) {
      const adapter = readExports(module);
      const missing = names.filter((name) => !adapter.values.has(name));
      if (missing.length > 0) {
        errors.push(
          `${rel(module)} must export every ${seam} member for engine.ts; missing ${missing.join(', ')}`,
        );
      }
      engineSeam = { module, names };
    }
    if (config.adapter !== undefined && names !== undefined && names.length > 0) {
      const second = join(
        srcDir,
        '_engines',
        engine,
        `${config.name}.${config.adapter}.client.tsx`,
      );
      if (!existsSync(second)) {
        errors.push(`"adapter": "${config.adapter}" names a missing file: ${rel(second)}`);
      } else {
        const missing = names.filter((name) => !readExports(second).values.has(name));
        if (missing.length > 0) {
          errors.push(
            `${rel(second)} must export every ${seam} member, as the default adapter does; missing ${missing.join(', ')}`,
          );
        }
      }
    }
    if (config.overlay === true) {
      const overlayEngine = readOverlayEngine(reactDir);
      if (overlayEngine !== config.engine) {
        errors.push(
          `"overlay": true components must use the overlay family engine from packages/react/engines.json ` +
            `("${overlayEngine ?? 'missing'}"), not "${config.engine}"`,
        );
      }
    }
  }

  const typeModules = existsSync(contract)
    ? [contract]
    : [...new Set(values.map((value) => value.module))].toSorted();
  const types: Export[] = [];
  const valueNames = new Set(values.map((value) => value.name));
  for (const module of typeModules) {
    for (const name of [...readExports(module).types.keys()].toSorted()) {
      // The <Name>Engine interface is the adapter seam, not public API (§9.2).
      if (name.endsWith('Engine') || valueNames.has(name)) continue;
      const existing = types.find((type) => type.name === name);
      if (existing === undefined) types.push({ name, module });
      else if (exportOrigin(existing.module, name, 'type') !== exportOrigin(module, name, 'type')) {
        errors.push(
          `type "${name}" is exported by both ${rel(existing.module)} and ${rel(module)}`,
        );
      }
    }
  }

  const subpath = relative(srcDir, dir).split(sep).join('/');
  const hasCss = existsSync(join(dir, `${config.name}.css`));
  const component: Component = { config, dir, subpath, pascal, parts, values, types, hasCss };
  if (engineSeam !== undefined) component.engine = engineSeam;
  return errors.length > 0 ? undefined : component;
}

function readOverlayEngine(reactDir: string): string | undefined {
  const file = join(reactDir, 'engines.json');
  if (!existsSync(file)) return undefined;
  const engines = readJsonObject(file);
  return typeof engines.overlay === 'string' ? engines.overlay : undefined;
}

/** `./select.client` for a module in the same folder; posix separators, no extension. */
function specifier(fromDir: string, module: string): string {
  const path = relative(fromDir, module).split(sep).join('/').replace(SOURCE, '');
  return path.startsWith('.') ? path : `./${path}`;
}

/** Groups exports by module, keeping the given order of first appearance. */
function byModule<T extends Export>(items: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(item.module, [...(groups.get(item.module) ?? []), item]);
  return groups;
}

function writeComponentFiles(component: Component, files: Map<string, string | null>): void {
  const { config, dir, pascal } = component;
  const compound = component.parts.length > 0;

  const index: string[] = [];
  for (const [module, values] of byModule(component.values)) {
    index.push(
      exportFrom(
        values.map((value) => value.name),
        specifier(dir, module),
      ),
    );
  }
  if (compound) index.push(`export * as ${pascal} from './${config.name}.parts';`);
  for (const [module, types] of byModule(component.types)) {
    index.push(
      exportFrom(
        types.map((type) => type.name),
        specifier(dir, module),
        true,
      ),
    );
  }
  files.set(join(dir, 'index.ts'), tsModule(index));

  const partsFile = join(dir, `${config.name}.parts.ts`);
  if (compound) {
    const statements: string[] = [];
    const parts = component.parts.map((part) => ({ ...part.export, alias: part.part }));
    for (const [module, group] of byModule(parts)) {
      statements.push(
        exportFrom(
          group.map((part) => `${part.name} as ${part.alias}`),
          specifier(dir, module),
        ),
      );
    }
    files.set(partsFile, tsModule(statements));
  } else {
    deleteIfGenerated(partsFile, files);
  }

  const engineFile = join(dir, 'engine.ts');
  if (component.engine === undefined) {
    deleteIfGenerated(engineFile, files);
  } else {
    const { module, names } = component.engine;
    files.set(engineFile, tsModule([exportFrom(names, specifier(dir, module))]));
  }
}

function deleteIfGenerated(file: string, files: Map<string, string | null>): void {
  if (existsSync(file) && readFileSync(file, 'utf8').startsWith(TS_HEADER)) files.set(file, null);
}

/**
 * src/index.ts: named re-exports of every stable component (unstable ones stay on their own subpath,
 * outside semver). Names must be unique across components unless they are the same binding.
 */
function rootBarrel(components: Component[], errors: string[]): string {
  const seen = new Map<string, { component: string; origin: string }>();
  const statements: string[] = [];
  const claim = (name: string, component: Component, origin: string): boolean => {
    const previous = seen.get(name);
    if (previous === undefined) {
      seen.set(name, { component: component.config.name, origin });
      return true;
    }
    if (previous.origin !== origin) {
      errors.push(
        `root barrel: "${name}" is exported by both ${previous.component} and ${component.config.name}; ` +
          'names in the root entry must be unique, so rename one',
      );
    }
    return false;
  };

  for (const component of components.filter((c) => c.config.status === 'stable')) {
    const from = `./${component.subpath}/index`;
    const values: string[] = [];
    if (
      component.parts.length > 0 &&
      claim(component.pascal, component, `${from}#${component.pascal}`)
    ) {
      values.push(component.pascal);
    }
    for (const value of component.values) {
      if (claim(value.name, component, exportOrigin(value.module, value.name, 'value')))
        values.push(value.name);
    }
    const types = component.types
      .filter((type) => claim(type.name, component, exportOrigin(type.module, type.name, 'type')))
      .map((type) => type.name);
    if (values.length > 0) statements.push(exportFrom(values, from));
    if (types.length > 0) statements.push(exportFrom(types, from, true));
  }

  if (statements.length === 0) {
    statements.push(
      '// oxlint-disable-next-line unicorn/require-module-specifiers -- no stable components yet',
      'export {};',
    );
  }
  return tsModule(statements);
}

const COMPONENT_KEY = /^\.\/(?:unstable\/)?[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CSS_KEY = /^\.\/css\/([a-z0-9]+(?:-[a-z0-9]+)*)\.css$/;

/**
 * The exports map: component entries are regenerated; any other entry is kept as written. An entry
 * shaped like a component subpath (`./x`, `./unstable/x`, `./css/x.css`) whose source no longer
 * exists is a removed component's leftover and is dropped. Keys are sorted into fixed groups.
 */
function packageExports(
  existing: Record<string, unknown>,
  components: Component[],
  reactDir: string,
): Record<string, unknown> {
  const generated: Record<string, unknown> = {};
  for (const component of components) {
    const { subpath, config } = component;
    generated[`./${subpath}`] = {
      types: `./dist/${subpath}/index.d.ts`,
      default: `./dist/${subpath}/index.js`,
    };
    if (component.hasCss) generated[`./css/${config.name}.css`] = `./dist/css/${config.name}.css`;
  }

  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (key in generated) continue;
    if (COMPONENT_KEY.test(key)) {
      const path = join(reactDir, 'src', key.slice(2));
      if (!existsSync(path) && !existsSync(`${path}.ts`) && !existsSync(`${path}.tsx`)) continue;
    }
    const css = CSS_KEY.exec(key);
    if (css !== null && !existsSync(join(reactDir, 'styles', `${css[1]}.css`))) continue;
    kept[key] = value;
  }

  const all: Record<string, unknown> = { ...kept, ...generated };
  const keys = Object.keys(all).toSorted(
    (a, b) => exportGroup(a) - exportGroup(b) || (a < b ? -1 : a > b ? 1 : 0),
  );
  return Object.fromEntries(keys.map((key) => [key, all[key]]));
}

/** `.`, then JS subpaths, then `./unstable/*`, then files (CSS, JSON), then `./package.json`. */
function exportGroup(key: string): number {
  if (key === '.') return 0;
  if (key === './package.json') return 4;
  if (key.startsWith('./unstable/')) return 2;
  return /\.[a-z]+$/.test(key) ? 3 : 1;
}

/** design/component-map.json: Figma canonical and ghost node ids → the export that implements them (§20.2). */
function componentMap(components: Component[], packageName: string, errors: string[]): string {
  const nodes: Record<string, Record<string, unknown>> = {};
  for (const component of components) {
    const { config } = component;
    const roles = [
      ['canonical', config.figma?.canonical ?? []],
      ['ghost', config.figma?.ghosts ?? []],
    ] as const;
    for (const [role, ids] of roles) {
      for (const id of ids) {
        const previous = nodes[id];
        if (previous !== undefined) {
          errors.push(
            `Figma node ${id} is listed by both ${String(previous.component)} and ${config.name}`,
          );
          continue;
        }
        const entry: Record<string, unknown> = {
          component: config.name,
          role,
          import: `${packageName}/${component.subpath}`,
          export: component.parts.length > 0 ? component.pascal : component.values[0]?.name,
        };
        if (component.parts.length > 0) entry.parts = component.parts.map((part) => part.part);
        if (config.variants !== undefined) entry.props = config.variants;
        nodes[id] = entry;
      }
    }
  }
  const sorted = Object.fromEntries(
    Object.keys(nodes)
      .toSorted(compareNodeIds)
      .map((id) => [id, nodes[id]]),
  );
  return printJson({ $comment: HEADER, package: packageName, nodes: sorted });
}

/** Figma node ids sort numerically: 745:222 before 7275:11438. */
function compareNodeIds(a: string, b: string): number {
  const [a1 = 0, a2 = 0] = a.split(':').map(Number);
  const [b1 = 0, b2 = 0] = b.split(':').map(Number);
  return a1 - b1 || a2 - b2;
}
