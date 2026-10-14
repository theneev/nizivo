// `pnpm tokens:pull:agent <chunk-dir>`: the engineer fallback sync (plan §20.1, r7 §8.2).
// Run the use_figma calls listed in PULL-AGENT.md, save each return as a JSON file in
// <chunk-dir> (outside the repo), then this merges them into figma/snapshot.json and exports
// figma/raw/ with the TokensBrücke CLI.
import { mergeChunks, writeSnapshot } from './merge-snapshot.ts';
import { exportRaw } from './raw.ts';

const chunkDir = process.argv[2];
if (chunkDir === undefined) {
  console.error(
    'Usage: pnpm tokens:pull:agent <chunk-dir>\nThe use_figma calls that fill <chunk-dir> are listed in scripts/figma/PULL-AGENT.md.',
  );
  process.exitCode = 1;
} else {
  writeSnapshot(mergeChunks(chunkDir));
  process.exitCode = exportRaw();
}
