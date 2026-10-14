// The example manifest written by scripts/examples.ts: one entry per exported example, with its
// title, description, snippet and whether the page renders it live.
import type { ExampleEntry, ExampleManifest } from '../scripts/examples';
import { isRecord } from '../scripts/json';
import { readRepoJson } from './repo';

function isManifest(value: unknown): value is ExampleManifest {
  return (
    isRecord(value) && Object.values(value).every((f) => isRecord(f) && Array.isArray(f.examples))
  );
}

let manifestCache: ExampleManifest | undefined;

export function exampleManifest(): ExampleManifest {
  manifestCache ??= readRepoJson(
    'apps/docs/.generated/examples/manifest.json',
    isManifest,
    'run `node scripts/generate.ts` in apps/docs (the docs build runs it first)',
  );
  return manifestCache;
}

export function examplesFor(name: string): ExampleEntry[] {
  return exampleManifest()[name]?.examples ?? [];
}

export function exampleId(e: ExampleEntry): string {
  return `example-${e.title.toLowerCase().replaceAll(' ', '-')}`;
}

export type { ExampleEntry };
