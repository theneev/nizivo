// The convenience sheet, dist/styles.css (ARCHITECTURE.md §5.2): everything in one import, tokens
// included. Pure, so the build (scripts/build-css.ts) and the tests assemble it the same way.
//
// Byte layout, in this order:
// 1. the canonical @layer statement and a newline (§8.1: line 1 of every stylesheet Nizivo ships);
// 2. @nizivo/tokens' tokens.css, byte for byte (§5.2: a byte-identical copy at the same version, so
//    the two routes can never skew);
// 3. dist/css/base.css (the a11y floor and the utilities), as built;
// 4. every stable component's dist/css/<name>.css, as built, sorted by name.
// A newline is added after a part only when it does not end with one. Each built sheet keeps its own
// line-1 layer statement: repeating it is idempotent, and it keeps the sheet a plain concatenation
// that a test can check. reset.css (opt-in, §5.2) and unstable components are not in it.

/** One built stylesheet: its dist/css name (no extension) and its code. */
export interface BuiltSheet {
  name: string;
  code: string;
  /** Whether it is a component's sheet (src/<name>/<name>.css), not a styles/<file>.css one. */
  component: boolean;
  /** Whether the component lives under src/unstable/. */
  unstable?: boolean;
}

/** The sheets that go into styles.css after tokens.css, in order. */
export function stylesOrder(sheets: readonly BuiltSheet[]): BuiltSheet[] {
  const base = sheets.find((sheet) => sheet.name === 'base' && !sheet.component);
  if (base === undefined) throw new Error('styles.css needs base.css, and the build wrote none');
  const components = sheets
    .filter((sheet) => sheet.component && sheet.unstable !== true)
    .toSorted((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return [base, ...components];
}

const line = (part: string): string => (part.endsWith('\n') ? part : `${part}\n`);

/** dist/styles.css from the layer statement, tokens.css's exact text and the built sheets. */
export function assembleStyles(
  layerStatement: string,
  tokensCss: string,
  sheets: readonly BuiltSheet[],
): string {
  return [layerStatement, tokensCss, ...stylesOrder(sheets).map((sheet) => sheet.code)]
    .map(line)
    .join('');
}

/**
 * What is wrong with the package.json `./styles.css` entry, if anything: a missing entry or a wrong
 * target is a problem, so dist/styles.css never ships with no way to import it.
 */
export function stylesExport(exportsMap: unknown): { problem?: string } {
  const target: unknown =
    typeof exportsMap === 'object' && exportsMap !== null
      ? Reflect.get(exportsMap, './styles.css')
      : undefined;
  if (target === undefined) {
    return {
      problem:
        'dist/styles.css has no package.json exports entry ("./styles.css": "./dist/styles.css")',
    };
  }
  if (target !== './dist/styles.css') {
    return {
      problem: `package.json exports "./styles.css" → ${JSON.stringify(target)}, expected "./dist/styles.css"`,
    };
  }
  return {};
}
