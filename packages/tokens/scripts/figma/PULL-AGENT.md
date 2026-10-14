# Agent token pull (engineer fallback)

The fallback sync from plan §20.1 and r7 §8.2: an engineer's Claude Code session reads the design
file through the Figma MCP `use_figma` tool and feeds the TokensBrücke CLI the same data the plugin
would export. Human-triggered only, never in CI (the remote MCP server is OAuth-only).

All scripts here are **read-only**: no setters, no `create*`, no `setValueForMode`, no renames.

## Prompt

> Load the `figma-use` skill. In file `BIzJFf1wm8KP0YG2AVI1tP`, run the `use_figma` calls listed in
> `packages/tokens/scripts/figma/PULL-AGENT.md` in order, each with the exact script text (set the
> constants at the top as listed). Save each return verbatim as JSON in a new scratch folder outside
> the repo, named as listed. Then run `pnpm --filter @nizivo/tokens run tokens:pull:agent <folder>` and
> report its output. Do not run `codesyntax-apply.figma.js`.

## Calls (2026-10-14 run: 9 calls)

| #   | Script                        | Constants                                             | Save as                |
| --- | ----------------------------- | ----------------------------------------------------- | ---------------------- |
| 1   | `snapshot-inventory.figma.js` | none                                                  | `01-inventory.json`    |
| 2   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Primitives'`, `SLICE = [0, 27]`  | `02-primitives-a.json` |
| 3   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Primitives'`, `SLICE = [27, 54]` | `03-primitives-b.json` |
| 4   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Color'`, `SLICE = [0, 29]`       | `04-color-a.json`      |
| 5   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Color'`, `SLICE = [29, 58]`      | `05-color-b.json`      |
| 6   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Space'`, `SLICE = [0, 33]`       | `06-space.json`        |
| 7   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Motion'`, `SLICE = [0, 20]`      | `07-motion.json`       |
| 8   | `snapshot-variables.figma.js` | `COLLECTION = 'Grove Responsive'`, `SLICE = [0, 10]`  | `08-responsive.json`   |
| 9   | `snapshot-styles.figma.js`    | none                                                  | `09-styles.json`       |

After the Grove → Nizivo rename, use the `Nizivo …` collection names. Pick slices from the
inventory's `payloadBytes` so each return stays under about 18 KB (returns are capped near 20 KB).
Calls 2 to 9 can run in parallel.

## What the scripts check

- Each payload return carries `hash`, an FNV-1a hash computed inside Figma over its data;
  `merge-snapshot.ts` recomputes it, so a value mistyped while saving fails the merge.
- The merge also enforces the `Grove *` / `Nizivo *` collection and `Grove/*` / `Nizivo/*` style
  allowlist, the variable order of each collection, and that every alias points inside the snapshot.
- `raw.ts` clears `figma/raw/` and runs the TokensBrücke CLI with `figma/tb.config.json`.
