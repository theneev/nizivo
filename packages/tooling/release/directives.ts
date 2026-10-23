// The directive guard and the `export * as` lint (ARCHITECTURE.md §9.2, §21.1 exit criterion 3), run on
// a package's published dist/ next to its source. Pure: check.ts reads the files.
//
// - 'use client' is the first statement of every *.client.js module and appears nowhere else.
// - Source and dist agree module by module. A source module with no dist counterpart is tolerated
//   (an elided hop such as engine.ts), unless it carries the directive.
// - A server-tier component's graph crosses into client code only through a component's public
//   *.client.js leaf, and reaches no engine module or engine package on the way.
// - Namespace objects are built in directive-free *.parts.js modules (spike S2).
// - `export * as` never targets, and never sits in, a 'use client' module; `export *` never
//   re-exports one (verdict V3: barrels re-export by name).
import { isSecondAdapter } from '../gen/adapter.ts';

export interface DirectiveInput {
  /** Published files, keyed `dist/…`. */
  dist: ReadonlyMap<string, string>;
  /** Source modules, keyed `src/…`. Tests, examples and stories are ignored. */
  src: ReadonlyMap<string, string>;
  /** Component folders under src/ (`button`, `unstable/<name>`) and their component.json tier. */
  components: ReadonlyMap<string, string>;
  /** Namespace objects must live in *.parts.js (the react package's convention). */
  partsOnly: boolean;
}

export const ENGINE =
  /^(react-aria|react-aria-components|react-stately|@react-aria\/|@react-stately\/|@internationalized\/)/;

/** True when the module's first statement is the 'use client' directive. */
export function isClient(text: string): boolean {
  return /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*\s*['"]use client['"]/.test(text);
}

/** Every line that is a bare 'use client' or 'use server' statement. */
function directiveLines(text: string): { directive: string; line: number }[] {
  const out: { directive: string; line: number }[] = [];
  text.split('\n').forEach((line, index) => {
    const match = /^\s*(['"])use (client|server)\1;?\s*$/.exec(line);
    if (match?.[2] !== undefined) out.push({ directive: `use ${match[2]}`, line: index + 1 });
  });
  return out;
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
}

/** Every module specifier in `import … from`, `export … from`, `import '…'` and `import('…')`. */
export function specifiers(text: string): string[] {
  const pattern = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/g;
  return [...stripComments(text).matchAll(pattern)].flatMap((m) =>
    m[1] === undefined ? [] : [m[1]],
  );
}

/** `export * from` and `export * as X from` statements. */
function starExports(text: string): { namespace: string | undefined; specifier: string }[] {
  const pattern = /\bexport\s*\*\s*(?:as\s+([\w$]+)\s*)?from\s*['"]([^'"]+)['"]/g;
  return [...stripComments(text).matchAll(pattern)].flatMap((m) =>
    m[2] === undefined ? [] : [{ namespace: m[1], specifier: m[2] }],
  );
}

function dirname(file: string): string {
  return file.slice(0, file.lastIndexOf('/'));
}

function join(dir: string, specifier: string): string {
  const parts = dir.split('/');
  for (const segment of specifier.split('/')) {
    if (segment === '..') parts.pop();
    else if (segment !== '.' && segment !== '') parts.push(segment);
  }
  return parts.join('/');
}

/** Resolves a relative specifier: exact in dist, or with the source extensions in src. */
function resolve(
  files: ReadonlyMap<string, string>,
  from: string,
  specifier: string,
): string | undefined {
  const base = join(dirname(from), specifier);
  const stem = base.replace(/\.js$/, '');
  const candidates = from.startsWith('dist/')
    ? [base]
    : [base, `${stem}.ts`, `${stem}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  return candidates.find((candidate) => files.has(candidate));
}

function isSourceModule(file: string): boolean {
  return (
    /\.tsx?$/.test(file) &&
    !file.endsWith('.d.ts') &&
    !/\.(test|spec|test-d|example|stories)\.tsx?$/.test(file)
  );
}

function distCounterpart(srcFile: string): string {
  return `dist/${srcFile.slice('src/'.length).replace(/\.tsx?$/, '.js')}`;
}

function srcCounterparts(distFile: string): string[] {
  const stem = `src/${distFile.slice('dist/'.length).replace(/\.js$/, '')}`;
  return [`${stem}.ts`, `${stem}.tsx`, `${stem}.json`];
}

function placement(dist: ReadonlyMap<string, string>, failures: string[]): void {
  for (const [file, text] of dist) {
    if (!file.endsWith('.js')) continue;
    const client = isClient(text);
    if (file.endsWith('.client.js') && !client) {
      failures.push(`${file}: a *.client.js leaf must start with 'use client'`);
    }
    if (!file.endsWith('.client.js') && client) {
      failures.push(`${file}: carries 'use client' but is not a *.client.js leaf`);
    }
    const lines = directiveLines(text);
    for (const { directive, line } of lines) {
      if (directive === 'use server') {
        failures.push(`${file}:${line}: 'use server' in a published module`);
      } else if (!(client && line === lines[0]?.line)) {
        failures.push(`${file}:${line}: 'use client' below the first statement is ignored`);
      }
    }
  }
}

function sourceAgainstDist(input: DirectiveInput, failures: string[]): void {
  const { dist, src } = input;
  for (const [file, text] of src) {
    if (!isSourceModule(file)) continue;
    const built = distCounterpart(file);
    const builtText = dist.get(built);
    if (builtText === undefined) {
      // a second adapter is not built until it becomes the default (gen/adapter.ts)
      if (isClient(text) && !isSecondAdapter(file)) {
        failures.push(`${file}: 'use client' module has no ${built}`);
      }
    } else if (isClient(text) !== isClient(builtText)) {
      failures.push(
        isClient(text)
          ? `${built}: lost the 'use client' of ${file}`
          : `${built}: carries 'use client' that ${file} does not`,
      );
    }
  }
  for (const [file, text] of dist) {
    if (!file.endsWith('.js') || !isClient(text)) continue;
    if (!srcCounterparts(file).some((candidate) => src.has(candidate))) {
      failures.push(`${file}: carries 'use client' but has no source module`);
    }
  }
}

/** A component's public leaf: `dist/<component>/<file>.client.js`, never _engines or _internal. */
function isDocumentedLeaf(file: string, components: ReadonlyMap<string, string>): boolean {
  const match = /^dist\/(.+)\/[^/]+\.client\.js$/.exec(file);
  return match?.[1] !== undefined && components.has(match[1]);
}

function serverSafe(input: DirectiveInput, failures: string[]): void {
  const { dist, components } = input;
  for (const [folder, tier] of components) {
    if (tier !== 'server') continue;
    const entry = `dist/${folder}/index.js`;
    if (!dist.has(entry)) {
      failures.push(`${entry}: missing (component.json tier "server")`);
      continue;
    }
    const via = new Map<string, string>([[entry, '']]);
    const queue = [entry];
    for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
      const text = dist.get(file) ?? '';
      const parents = via.get(file) ?? '';
      const path = parents === '' ? file : `${parents} → ${file}`;
      if (isClient(text)) {
        if (file === entry) failures.push(`${entry}: a server-tier entry carries 'use client'`);
        else if (!isDocumentedLeaf(file, components)) {
          failures.push(
            `${folder} (server): reaches ${file}, not a component's *.client.js leaf (via ${parents})`,
          );
        }
        continue;
      }
      if (file.includes('/_engines/')) {
        failures.push(`${folder} (server): reaches engine module ${file} (via ${parents})`);
        continue;
      }
      for (const specifier of specifiers(text)) {
        if (!specifier.startsWith('.')) {
          if (ENGINE.test(specifier) || specifier === 'client-only') {
            failures.push(`${folder} (server): ${file} imports ${specifier}`);
          }
          continue;
        }
        const target = resolve(dist, file, specifier);
        if (target === undefined) {
          failures.push(`${file}: cannot resolve ${specifier}`);
        } else if (!via.has(target)) {
          via.set(target, path);
          queue.push(target);
        }
      }
    }
  }
}

function namespaceObjects(input: DirectiveInput, failures: string[]): void {
  for (const [file, text] of input.dist) {
    if (!file.endsWith('.js') || !text.includes('__exportAll(')) continue;
    if (isClient(text))
      failures.push(`${file}: builds a namespace object in a 'use client' module`);
    else if (input.partsOnly && !file.endsWith('.parts.js')) {
      failures.push(`${file}: builds a namespace object outside a *.parts.js module`);
    }
  }
}

function starExportLint(files: ReadonlyMap<string, string>, failures: string[]): void {
  for (const [file, text] of files) {
    const module = file.startsWith('dist/') ? file.endsWith('.js') : isSourceModule(file);
    if (!module) continue;
    for (const { namespace, specifier } of starExports(text)) {
      const statement = namespace === undefined ? 'export *' : `export * as ${namespace}`;
      if (namespace !== undefined && isClient(text)) {
        failures.push(`${file}: ${statement} inside a 'use client' module`);
      }
      if (!specifier.startsWith('.')) continue;
      const target = resolve(files, file, specifier);
      if (target === undefined) failures.push(`${file}: ${statement} from ${specifier}: not found`);
      else if (isClient(files.get(target) ?? '')) {
        failures.push(`${file}: ${statement} from 'use client' module ${target}`);
      }
    }
  }
}

export function checkDirectives(input: DirectiveInput): string[] {
  const failures: string[] = [];
  placement(input.dist, failures);
  sourceAgainstDist(input, failures);
  serverSafe(input, failures);
  namespaceObjects(input, failures);
  starExportLint(input.src, failures);
  starExportLint(input.dist, failures);
  return failures;
}
