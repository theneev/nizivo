/**
 * Builds the CSS of @nizivo/react (ARCHITECTURE.md §8.1, §4.1 L3): each src/<name>/<name>.css
 * (also under src/unstable/) and each styles/<file>.css becomes dist/css/<name>.css, compiled by
 * Lightning CSS for the browser floor, minified, never bundled with tokens.css. Then it writes the
 * convenience sheet, dist/styles.css (§5.2: the layer statement, a byte-identical copy of
 * tokens.css, base.css and every stable component's sheet; scripts/css/styles.ts). Then it checks
 * what it wrote: the Lightning CSS guard, the emitted-CSS vocabulary check, that no published JS
 * imports CSS, and that every stylesheet it wrote has a package.json exports entry.
 *
 * Runs after tsdown, which empties dist/. Exits 1 on any problem.
 * `node scripts/build-css.ts [--tokens <file>] [--custom-media <file>]` reads those files instead
 * of the tokens.css and custom-media.css that @nizivo/tokens publishes.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  componentOf,
  expectedLayers,
  layerStatement,
  loadComponents,
  loadVocabulary,
  tokensFile,
} from '@nizivo/stylelint-config/contract';
import { compileCss } from './css/compile.ts';
import { checkEmitted, declaredProperties } from './css/emitted.ts';
import { cssExportProblems } from './css/exports.ts';
import { assembleStyles, type BuiltSheet, stylesExport, stylesOrder } from './css/styles.ts';

const PACKAGE = fileURLToPath(new URL('../', import.meta.url));
const OUT = join(PACKAGE, 'dist', 'css');
const STYLES = join(PACKAGE, 'dist', 'styles.css');
/** An import, re-export or dynamic import of a .css file (not a comment that names one). */
const CSS_IMPORT =
  /^\s*(?:import\s*['"][^'"\n]+\.css['"]|(?:import|export)\b[^;\n]*\bfrom\s*['"][^'"\n]+\.css['"])|\bimport\(\s*['"][^'"\n]+\.css['"]\s*\)/m;

const rel = (file: string): string => relative(PACKAGE, file).split(sep).join('/');

function subdirs(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name))
    .toSorted();
}

function cssFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .toSorted()
    .map((file) => join(dir, file));
}

/** Every stylesheet the package ships, keyed by its dist/css file name. */
function sources(problems: string[]): Map<string, string> {
  const found = new Map<string, string>();
  const add = (name: string, file: string): void => {
    const previous = found.get(name);
    if (previous === undefined) found.set(name, file);
    else problems.push(`${rel(file)}: dist/css/${name}.css also comes from ${rel(previous)}`);
  };
  const src = join(PACKAGE, 'src');
  const folders = subdirs(src).flatMap((dir) =>
    basename(dir) === 'unstable' ? subdirs(dir) : [dir],
  );
  for (const dir of folders) {
    const folder = basename(dir);
    for (const file of cssFiles(dir)) {
      if (basename(file) === `${folder}.css` && existsSync(join(dir, 'component.json'))) {
        add(folder, file);
      } else {
        problems.push(
          `${rel(file)}: a component ships one stylesheet, src/<name>/<name>.css next to its component.json`,
        );
      }
    }
  }
  for (const file of cssFiles(join(PACKAGE, 'styles'))) add(basename(file, '.css'), file);
  return found;
}

/** Published JS never imports CSS (settled 9): consumers import the stylesheets themselves. */
function jsImportingCss(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.js'))
    .map((file) => join(dir, file))
    .filter((file) => CSS_IMPORT.test(readFileSync(file, 'utf8')))
    .map((file) => `${rel(file)}: published JS must not import CSS`);
}

function main(args: string[]): number {
  const { values } = parseArgs({
    args,
    options: { tokens: { type: 'string' }, 'custom-media': { type: 'string' } },
  });
  const problems: string[] = [];
  const notes: string[] = [];
  const statement = layerStatement();
  const vocabulary = loadVocabulary();
  const components = loadComponents();

  const customMediaFile =
    values['custom-media'] === undefined
      ? tokensFile('./custom-media.css')
      : resolve(values['custom-media']);
  const customMedia =
    customMediaFile === undefined
      ? undefined
      : (readFileSync(customMediaFile, 'utf8').match(/@custom-media\s[^;]+;/g) ?? []).join('\n');
  if (customMedia === undefined) notes.push('@nizivo/tokens publishes no custom-media.css yet');

  const tokensCss =
    values.tokens === undefined ? tokensFile('./tokens.css') : resolve(values.tokens);
  const tokens =
    tokensCss === undefined
      ? undefined
      : declaredProperties(readFileSync(tokensCss, 'utf8'), tokensCss);
  if (tokens === undefined)
    notes.push('@nizivo/tokens publishes no tokens.css yet: token names not checked');

  const stylesheets = sources(problems);
  rmSync(OUT, { recursive: true, force: true });
  rmSync(STYLES, { force: true });
  mkdirSync(OUT, { recursive: true });
  const built: BuiltSheet[] = [];
  for (const [name, file] of stylesheets) {
    const compiled = compileCss(readFileSync(file, 'utf8'), rel(file), {
      layerStatement: statement,
      layer: expectedLayers(file),
      customMedia,
    });
    problems.push(...compiled.problems.map((problem) => `${rel(file)}: ${problem}`));
    if (compiled.code === '') continue;
    writeFileSync(join(OUT, `${name}.css`), compiled.code);
    const path = rel(file);
    built.push({
      name,
      code: compiled.code,
      component: path.startsWith('src/'),
      unstable: path.startsWith('src/unstable/'),
    });
  }

  // The convenience sheet, from the same compiled code and tokens.css's exact bytes.
  if (tokensCss === undefined) {
    problems.push('dist/styles.css: no tokens.css to copy into it (build @nizivo/tokens first)');
  } else if (problems.length === 0) {
    writeFileSync(STYLES, assembleStyles(statement, readFileSync(tokensCss, 'utf8'), built));
  }

  for (const file of cssFiles(OUT)) {
    const emitted = checkEmitted(readFileSync(file, 'utf8'), rel(file), {
      vocabulary,
      components,
      component: componentOf(file, components),
      tokens,
    });
    problems.push(...emitted.map((problem) => `${rel(file)}: ${problem}`));
  }
  problems.push(...jsImportingCss(join(PACKAGE, 'dist')));
  const manifest: unknown = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
  problems.push(
    ...cssExportProblems(
      typeof manifest === 'object' && manifest !== null && 'exports' in manifest
        ? manifest.exports
        : undefined,
      cssFiles(OUT).map((file) => basename(file, '.css')),
    ),
  );

  const styles = stylesExport(
    typeof manifest === 'object' && manifest !== null && 'exports' in manifest
      ? manifest.exports
      : undefined,
  );
  if (styles.problem !== undefined) problems.push(styles.problem);

  for (const note of notes) console.log(`build-css: note: ${note}`);
  if (problems.length > 0) {
    const count = `${problems.length} problem${problems.length === 1 ? '' : 's'}`;
    console.error(`build-css: ${count}\n  ${problems.join('\n  ')}`);
    return 1;
  }
  console.log(
    `build-css: wrote ${stylesheets.size} stylesheets to dist/css, and dist/styles.css (tokens, base and ${stylesOrder(built).length - 1} components)`,
  );
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`build-css: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
