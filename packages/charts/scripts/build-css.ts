/**
 * Builds @nizivo/charts' one stylesheet, dist/styles.css (ARCHITECTURE.md §5.2, §14.1): chart CSS
 * only, no tokens (they come from @nizivo/tokens/tokens.css or @nizivo/react/styles.css). Each part's
 * src/<name>/<name>.css is compiled by the same Lightning CSS build and floor guard as
 * @nizivo/react's (packages/react/scripts/css: a build-time import of plain functions, never a
 * runtime one), checked by the same emitted-CSS vocabulary and token check, and the results are
 * concatenated, ChartFrame's shared base first. Each keeps its line-1 layer statement, as the
 * sheets in react's styles.css do, so the file is an exact concatenation.
 *
 * Runs after tsdown, which empties dist/. Exits 1 on any problem.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  componentOf,
  expectedLayers,
  layerStatement,
  loadComponents,
  loadVocabulary,
  tokensFile,
} from '@nizivo/stylelint-config/contract';
import { compileCss } from '../../react/scripts/css/compile.ts';
import { checkEmitted, declaredProperties } from '../../react/scripts/css/emitted.ts';

const PACKAGE = fileURLToPath(new URL('../', import.meta.url));
const SRC = join(PACKAGE, 'src');
const DIST = join(PACKAGE, 'dist');
const STYLES = join(DIST, 'styles.css');
/** ChartFrame's sheet carries the base every chart shares (focus, visually hidden, the SVG base). */
const FIRST = 'chart-frame';
const CSS_IMPORT =
  /^\s*(?:import\s*['"][^'"\n]+\.css['"]|(?:import|export)\b[^;\n]*\bfrom\s*['"][^'"\n]+\.css['"])|\bimport\(\s*['"][^'"\n]+\.css['"]\s*\)/m;

const rel = (file: string): string => relative(PACKAGE, file).split(sep).join('/');

/** src/<name>/<name>.css for every part, ChartFrame first; any other stylesheet is a problem. */
export function sources(problems: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(SRC, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.css')) continue;
    const file = join(entry.parentPath, entry.name);
    const folder = basename(entry.parentPath);
    if (entry.parentPath === join(SRC, folder) && entry.name === `${folder}.css`) found.push(file);
    else problems.push(`${rel(file)}: a part ships one stylesheet, src/<name>/<name>.css`);
  }
  return found.toSorted((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1));
}

function rank(file: string): number {
  return basename(file, '.css') === FIRST ? 0 : 1;
}

function main(): number {
  const problems: string[] = [];
  const statement = layerStatement();
  const vocabulary = loadVocabulary();
  const components = loadComponents();
  const tokensCss = tokensFile('./tokens.css');
  const customMediaFile = tokensFile('./custom-media.css');
  if (tokensCss === undefined) throw new Error('@nizivo/tokens publishes no tokens.css');
  const tokens = declaredProperties(readFileSync(tokensCss, 'utf8'), tokensCss);
  const customMedia =
    customMediaFile === undefined
      ? undefined
      : (readFileSync(customMediaFile, 'utf8').match(/@custom-media\s[^;]+;/g) ?? []).join('\n');

  const sheets: string[] = [];
  for (const file of sources(problems)) {
    const compiled = compileCss(readFileSync(file, 'utf8'), rel(file), {
      layerStatement: statement,
      layer: expectedLayers(file),
      customMedia,
    });
    problems.push(...compiled.problems.map((problem) => `${rel(file)}: ${problem}`));
    if (compiled.code === '') continue;
    const emitted = checkEmitted(compiled.code, rel(file), {
      vocabulary,
      components,
      component: componentOf(file, components),
      tokens,
    });
    problems.push(...emitted.map((problem) => `${rel(file)} (emitted): ${problem}`));
    sheets.push(compiled.code);
  }
  if (sheets.length === 0) problems.push('no stylesheet under src/<name>/<name>.css');

  const manifest: unknown = JSON.parse(readFileSync(join(PACKAGE, 'package.json'), 'utf8'));
  const exportsMap =
    typeof manifest === 'object' && manifest !== null && 'exports' in manifest
      ? manifest.exports
      : undefined;
  const target =
    typeof exportsMap === 'object' && exportsMap !== null && './styles.css' in exportsMap
      ? exportsMap['./styles.css']
      : undefined;
  if (target !== './dist/styles.css') {
    problems.push('package.json: exports["./styles.css"] must be "./dist/styles.css"');
  }
  if (existsSync(DIST)) {
    for (const file of readdirSync(DIST, { recursive: true, encoding: 'utf8' })) {
      if (file.endsWith('.js') && CSS_IMPORT.test(readFileSync(join(DIST, file), 'utf8'))) {
        problems.push(`dist/${file}: published JS must not import CSS`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`build-css: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
    return 1;
  }
  writeFileSync(STYLES, sheets.join(''));
  console.log(`build-css: wrote dist/styles.css (${sheets.length} part stylesheets)`);
  return 0;
}

if (import.meta.main) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(`build-css: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
