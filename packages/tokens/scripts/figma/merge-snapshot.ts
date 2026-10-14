// Merges the saved use_figma returns (one JSON file per call, see PULL-AGENT.md) into
// figma/snapshot.json, the TokensBrücke `--input` snapshot. Every check fails loudly: chunk
// hashes (catches transcription slips), the Grove|Nizivo allowlist, variable order against
// each collection's variableIds, and alias closure (a dangling alias exports as "#missing#").
//
// Usage: node scripts/figma/merge-snapshot.ts <chunk-dir>
import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  COLLECTION_ALLOW,
  FILE_KEY,
  FIGMA_DIR,
  SNAPSHOT_PATH,
  STYLE_ALLOW,
  fnv1a,
  isAlias,
  isRecord,
  printJson,
  readJson,
  type Snapshot,
  type Style,
  type Variable,
  type VariableCollection,
} from './snapshot.ts';

interface InventoryChunk {
  collections: VariableCollection[];
  dropped: Record<string, string[]>;
}

interface VariableChunk {
  part: string;
  hash: string;
  variables: Variable[];
}

interface StyleChunk {
  textHash: string;
  effectHash: string;
  textStyles: Style[];
  effectStyles: Style[];
}

// Light shape checks: the content itself is verified by the Figma-side hashes below.
function isInventory(value: unknown): value is InventoryChunk {
  return isRecord(value) && Array.isArray(value.collections) && isRecord(value.dropped);
}

function isVariableChunk(value: unknown): value is VariableChunk {
  return isRecord(value) && typeof value.hash === 'string' && Array.isArray(value.variables);
}

function isStyleChunk(value: unknown): value is StyleChunk {
  return (
    isRecord(value) &&
    typeof value.textHash === 'string' &&
    typeof value.effectHash === 'string' &&
    Array.isArray(value.textStyles) &&
    Array.isArray(value.effectStyles)
  );
}

function fail(message: string): never {
  throw new Error(`merge-snapshot: ${message}`);
}

function checkHash(label: string, data: unknown, expected: string): void {
  const actual = fnv1a(JSON.stringify(data));
  if (actual !== expected)
    fail(`${label}: hash ${actual} does not match the Figma-side ${expected}`);
}

export function mergeChunks(chunkDir: string): Snapshot {
  let inventory: InventoryChunk | undefined;
  let styles: StyleChunk | undefined;
  const byId = new Map<string, Variable>();

  for (const file of readdirSync(chunkDir)
    .filter((name) => name.endsWith('.json'))
    .toSorted()) {
    const chunk = readJson(join(chunkDir, file));
    if (isInventory(chunk)) {
      inventory = chunk;
    } else if (isVariableChunk(chunk)) {
      checkHash(`${file} (${chunk.part})`, chunk.variables, chunk.hash);
      for (const variable of chunk.variables) byId.set(variable.id, variable);
    } else if (isStyleChunk(chunk)) {
      styles = chunk;
      checkHash(`${file} text styles`, styles.textStyles, styles.textHash);
      checkHash(`${file} effect styles`, styles.effectStyles, styles.effectHash);
    } else {
      fail(`${file} is not an inventory, variables or styles chunk`);
    }
  }
  if (!inventory) fail('no inventory chunk (snapshot-inventory.figma.js return)');
  if (!styles) fail('no styles chunk (snapshot-styles.figma.js return)');

  const variables: Variable[] = [];
  for (const collection of inventory.collections) {
    if (!COLLECTION_ALLOW.test(collection.name))
      fail(`collection outside the allowlist: ${collection.name}`);
    for (const id of collection.variableIds) {
      const variable =
        byId.get(id) ?? fail(`${collection.name}: variable ${id} missing from the chunks`);
      if (variable.variableCollectionId !== collection.id)
        fail(`${variable.name} is not in ${collection.name}`);
      variables.push(variable);
    }
  }
  if (variables.length !== byId.size)
    fail(`chunks hold ${byId.size - variables.length} unlisted variables`);

  const known = new Set(variables.map((variable) => variable.id));
  for (const variable of variables) {
    for (const value of Object.values(variable.valuesByMode)) {
      if (isAlias(value) && !known.has(value.id))
        fail(`${variable.name} aliases ${value.id}, which is not in the snapshot`);
    }
  }
  for (const style of [...styles.textStyles, ...styles.effectStyles]) {
    if (!STYLE_ALLOW.test(style.name)) fail(`style outside the allowlist: ${style.name}`);
  }

  return {
    $schema: '../node_modules/tokens-bruecke/schemas/tokens-snapshot.schema.json',
    source: {
      fileKey: FILE_KEY,
      extractedWith: 'use_figma, scripts/figma/snapshot-*.figma.js (read-only)',
      dropped: inventory.dropped,
    },
    variableCollections: inventory.collections,
    variables,
    textStyles: styles.textStyles,
    effectStyles: styles.effectStyles,
  };
}

export function writeSnapshot(snapshot: Snapshot): void {
  writeFileSync(SNAPSHOT_PATH, printJson(snapshot));
  const counts = snapshot.variableCollections
    .map((c) => `${c.name} ${c.variableIds.length}`)
    .join(', ');
  console.log(
    `Wrote ${relative(FIGMA_DIR, SNAPSHOT_PATH)}: ${snapshot.variables.length} variables (${counts}), ` +
      `${snapshot.textStyles.length} text styles, ${snapshot.effectStyles.length} effect styles`,
  );
}

if (import.meta.main) {
  const chunkDir = process.argv[2];
  if (chunkDir === undefined) {
    console.error('Usage: node scripts/figma/merge-snapshot.ts <chunk-dir>');
    process.exitCode = 1;
  } else {
    writeSnapshot(mergeChunks(chunkDir));
  }
}
