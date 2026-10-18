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

## Calls (10 calls)

| #   | Script                        | Constants                                              | Save as                |
| --- | ----------------------------- | ------------------------------------------------------ | ---------------------- |
| 1   | `snapshot-inventory.figma.js` | none                                                   | `01-inventory.json`    |
| 2   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Primitives'`, `SLICE = [0, 29]`  | `02-primitives-a.json` |
| 3   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Primitives'`, `SLICE = [29, 58]` | `03-primitives-b.json` |
| 4   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Color'`, `SLICE = [0, 25]`       | `04-color-a.json`      |
| 5   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Color'`, `SLICE = [25, 50]`      | `05-color-b.json`      |
| 6   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Color'`, `SLICE = [50, 75]`      | `06-color-c.json`      |
| 7   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Space'`, `SLICE = [0, 32]`       | `07-space.json`        |
| 8   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Motion'`, `SLICE = [0, 24]`      | `08-motion.json`       |
| 9   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Responsive'`, `SLICE = [0, 10]`  | `09-responsive.json`   |
| 10  | `snapshot-styles.figma.js`    | none                                                   | `10-styles.json`       |

Slices as of the 2026-10-18 pull: Primitives 58 variables, Color 75, Space 32, Motion 24,
Responsive 10; 20 text styles and 11 effect styles. Each return's `length` was 8.6 to 10.9 KB for
the variable slices and 15.9 KB for the styles. When the inventory's counts change, pick new slices
from its `payloadBytes` so each return stays under about 18 KB (returns are capped near 20 KB), and
update this table. Calls 2 to 10 can run in parallel.

The design file's collections and styles were renamed Grove → Nizivo on 2026-10-14
(`figma/codesyntax-rewrite.plan.md`). The 2026-10-18 pull was the first under the Nizivo names, so
`figma/snapshot.json` and `figma/raw/**` carry them since then; the normalizer still accepts the
`Grove …` names (plan §20.3).

## What the scripts check

- Each payload return carries `hash`, an FNV-1a hash computed inside Figma over its data;
  `merge-snapshot.ts` recomputes it, so a value mistyped while saving fails the merge. No expected
  hash is committed: each run checks its own returns, so the renamed names and code syntax change
  the hashes without failing anything.
- The merge also enforces the `Grove *` / `Nizivo *` collection and `Grove/*` / `Nizivo/*` style
  allowlist, the variable order of each collection, and that every alias points inside the snapshot.
- `raw.ts` clears `figma/raw/` and runs the TokensBrücke CLI with `figma/tb.config.json`.
