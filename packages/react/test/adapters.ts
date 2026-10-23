// Second adapters (ARCHITECTURE.md §9.4, §9.6 "Vitest aliases src/<name>/engine.ts to each
// adapter", D-cc). `NZ_ADAPTER=hooks` points every component whose component.json names
// `"adapter": "hooks"` at `src/_engines/<engine>/<name>.hooks.client.tsx` instead of the adapter its
// generated engine.ts re-exports, so the same specs run against the second implementation. The node
// and overlay vitest configs add `adapterSwap()` to their plugins; without NZ_ADAPTER it swaps nothing.
import { readdirSync, readFileSync } from 'node:fs';

declare const process: { env: Record<string, string | undefined> };

/** The adapter `NZ_ADAPTER` names, if any. */
export const adapter: string | undefined = process.env['NZ_ADAPTER'] || undefined;

const SRC = new URL('../src/', import.meta.url);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Component name → its `<name>.<adapter>.client.tsx`, for every manifest naming `adapter`. */
export function swaps(name: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const file of readdirSync(SRC, { recursive: true })) {
    if (!file.endsWith('component.json')) continue;
    const json: unknown = JSON.parse(readFileSync(new URL(file, SRC), 'utf8'));
    if (!isRecord(json) || json['adapter'] !== name) continue;
    const component = String(json['name']);
    const engine = String(json['engine']);
    out.set(component, new URL(`_engines/${engine}/${component}.${name}.client.tsx`, SRC).pathname);
  }
  return out;
}

interface SwapPlugin {
  name: string;
  enforce: 'pre';
  config(): { define: Record<string, string> };
  resolveId(source: string, importer: string | undefined): string | null;
}

/**
 * Resolves a component's `engine.ts` to the named adapter, and defines `NZ_ADAPTER_NAME` (the
 * adapter, or "default") for the specs that check which one the lane runs.
 */
export function adapterSwap(): SwapPlugin[] {
  const table = adapter === undefined ? new Map<string, string>() : swaps(adapter);
  if (adapter !== undefined && table.size === 0) {
    throw new Error(`NZ_ADAPTER=${adapter}: no component.json names it`);
  }
  return [
    {
      name: 'nz-adapter-swap',
      enforce: 'pre',
      config: () => ({ define: { NZ_ADAPTER_NAME: JSON.stringify(adapter ?? 'default') } }),
      resolveId(source, importer) {
        if (importer === undefined || !/(^|\/)engine(\.ts)?$/.test(source)) return null;
        const target = new URL(source.replace(/(\.ts)?$/, '.ts'), `file://${importer}`).pathname;
        const component = /\/src\/([^/]+)\/engine\.ts$/.exec(target)?.[1];
        return component === undefined ? null : (table.get(component) ?? null);
      },
    },
  ];
}
