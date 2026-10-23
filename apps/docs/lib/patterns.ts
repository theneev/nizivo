// The patterns (repo-root patterns/, MIT): the snippet manifest and the routes list written by
// scripts/generate.ts, and each pattern's stylesheet, read at build time.
import type { ExampleEntry, ExampleManifest } from '../scripts/examples';
import { isRecord } from '../scripts/json';
import { readRepoJson, readRepoText, repoFileExists } from './repo';

function isManifest(value: unknown): value is ExampleManifest {
  return (
    isRecord(value) && Object.values(value).every((f) => isRecord(f) && Array.isArray(f.examples))
  );
}

let manifestCache: ExampleManifest | undefined;

/** One snippet of a pattern, from .generated/patterns/manifest.json (scripts/examples.ts). */
export function patternExample(name: string, example: string): ExampleEntry {
  manifestCache ??= readRepoJson(
    'apps/docs/.generated/patterns/manifest.json',
    isManifest,
    'run `node scripts/generate.ts` in apps/docs (the docs build runs it first)',
  );
  const found = manifestCache[name]?.examples.find((e) => e.export === example);
  if (found === undefined) {
    throw new Error(`docs: patterns/src/${name}/${name}.example.tsx exports no ${example}.`);
  }
  return found;
}

/** The pattern's stylesheet, or undefined when the pattern has none. */
export function patternCss(name: string): string | undefined {
  const path = `patterns/src/${name}/${name}.css`;
  return repoFileExists(path) ? readRepoText(path) : undefined;
}

/** Whether a patterns page has its own generated route (app/docs/(generated)/patterns/<name>). */
export function hasPatternRoute(slugs: readonly string[]): boolean {
  if (slugs.length !== 2 || slugs[0] !== 'patterns') return false;
  const path = 'apps/docs/.generated/patterns/routes.json';
  if (!repoFileExists(path)) return false;
  const routes = readRepoJson(
    path,
    (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string'),
  );
  return routes.includes(slugs[1] ?? '');
}
