// Every stylesheet the build writes to dist/css is importable through the exports map, and every
// ./css/*.css entry points at one it wrote (ARCHITECTURE.md §5.2). publint checks only the second
// half; nz gen keeps a hand-written entry such as ./css/base.css but never adds one.

const DIST_CSS = /^\.\/dist\/css\/([^/]+)\.css$/;

/** Problems with the `./css/*.css` entries of `exportsMap`, given the dist/css files written. */
export function cssExportProblems(exportsMap: unknown, written: readonly string[]): string[] {
  const entries: [string, unknown][] =
    typeof exportsMap === 'object' && exportsMap !== null && !Array.isArray(exportsMap)
      ? Object.entries(exportsMap)
      : [];
  const targets = new Set<string>();
  const problems: string[] = [];
  for (const [key, target] of entries) {
    if (typeof target !== 'string') continue;
    const name = DIST_CSS.exec(target)?.[1];
    if (name === undefined) continue;
    targets.add(target);
    if (!written.includes(name)) {
      problems.push(`package.json exports "${key}" → ${target}, which the build did not write`);
    }
  }
  for (const name of written) {
    const target = `./dist/css/${name}.css`;
    if (!targets.has(target)) {
      problems.push(
        `dist/css/${name}.css has no package.json exports entry ("./css/${name}.css": "${target}"); nobody could import it`,
      );
    }
  }
  return problems;
}
