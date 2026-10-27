// Build-time access to the monorepo. Every page is prerendered by `next build` (a static export),
// so these reads happen once, on the build machine; nothing here runs in a browser.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseJson } from '../scripts/json';

/** The monorepo root. `next build` runs with the docs app as its working directory. */
export const REPO_ROOT: string = (() => {
  const root = resolve(process.cwd(), '..', '..');
  if (
    !existsSync(join(root, 'pnpm-workspace.yaml')) ||
    !existsSync(join(root, 'packages', 'react'))
  ) {
    throw new Error(
      `docs: expected the Nizivo monorepo two levels above ${process.cwd()}. Run the docs build from apps/docs.`,
    );
  }
  return root;
})();

export function repoPath(...parts: string[]): string {
  return join(REPO_ROOT, ...parts);
}

/** Reads a repo file; a missing file fails the build with the path and what produces it. */
export function readRepoText(path: string, producedBy?: string): string {
  const abs = repoPath(path);
  if (!existsSync(abs)) {
    throw new Error(`docs: ${path} is missing${producedBy ? `; ${producedBy}` : ''}.`);
  }
  return readFileSync(abs, 'utf8');
}

/** Reads a repo JSON file and checks its shape with `guard` (scripts/json.ts). */
export function readRepoJson<T>(
  path: string,
  guard: (value: unknown) => value is T,
  producedBy?: string,
): T {
  return parseJson(readRepoText(path, producedBy), guard, path);
}

export function repoFileExists(path: string): boolean {
  return existsSync(repoPath(path));
}

export const REPO_URL = 'https://github.com/theneev/nizivo';

/** A repo-relative path → its page on GitHub (main branch). */
export function repoFileUrl(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}
