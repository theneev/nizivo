// Runs the TokensBrücke CLI on figma/snapshot.json with figma/tb.config.json and writes the
// split-by-mode DTCG export to figma/raw/. The CLI owns every transform; raw files are never
// edited by hand. The folder is cleared first so collections renamed in Figma (Grove → Nizivo on
// 2026-10-14) leave no stale files behind.
//
// Usage: node scripts/figma/raw.ts
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import {
  RAW_DIR,
  SNAPSHOT_PATH,
  TB_CONFIG_PATH,
  readSnapshot,
  type Snapshot,
  type Style,
} from './snapshot.ts';

const KEEP = new Set(['.gitkeep']);

/**
 * TokensBrücke 3.18.0 reads `style.effects[0].type` without a guard, so an effect style with no
 * effects crashes the whole export with "Cannot read properties of undefined (reading 'type')".
 * Such a style carries no token, so it is left out of the CLI input; snapshot.json itself stays a
 * verbatim copy of the file. `Elevation/0 Flat` was the one such style. Since 2026-10-14 it holds
 * one invisible DROP_SHADOW (alpha 0, offset 0, radius 0, spread 0); the 2026-10-18 export left
 * nothing out and carries `elevation.0`. The filter stays as a guard: an empty effect style is
 * easy to make in Figma and would otherwise stop every sync.
 */
const hasNoEffects = (style: Style) => !Array.isArray(style.effects) || style.effects.length === 0;

export function cliInput(snapshot: Snapshot): { input: Snapshot; omitted: string[] } {
  return {
    input: {
      ...snapshot,
      effectStyles: snapshot.effectStyles.filter((style) => !hasNoEffects(style)),
    },
    omitted: snapshot.effectStyles.filter(hasNoEffects).map((style) => style.name),
  };
}

export function exportRaw(): number {
  const { input, omitted } = cliInput(readSnapshot());
  if (omitted.length > 0) {
    console.warn(
      `Left out of the CLI input (no effects, would crash TokensBrücke): ${omitted.join(', ')}`,
    );
  }

  mkdirSync(RAW_DIR, { recursive: true });
  for (const entry of readdirSync(RAW_DIR)) {
    if (!KEEP.has(entry)) rmSync(join(RAW_DIR, entry), { recursive: true, force: true });
  }

  const cli = createRequire(import.meta.url).resolve('tokens-bruecke/bin/cli.js');
  const args = ['--input=-', '--config', TB_CONFIG_PATH, '--output', RAW_DIR];
  const result = spawnSync(process.execPath, [cli, ...args], {
    input: JSON.stringify(input),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  return result.status ?? 1;
}

if (import.meta.main) {
  console.log(`Exporting ${SNAPSHOT_PATH}`);
  process.exitCode = exportRaw();
}
