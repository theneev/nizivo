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

## Calls (9 calls)

| #   | Script                        | Constants                                              | Save as                |
| --- | ----------------------------- | ------------------------------------------------------ | ---------------------- |
| 1   | `snapshot-inventory.figma.js` | none                                                   | `01-inventory.json`    |
| 2   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Primitives'`, `SLICE = [0, 27]`  | `02-primitives-a.json` |
| 3   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Primitives'`, `SLICE = [27, 54]` | `03-primitives-b.json` |
| 4   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Color'`, `SLICE = [0, 29]`       | `04-color-a.json`      |
| 5   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Color'`, `SLICE = [29, 58]`      | `05-color-b.json`      |
| 6   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Space'`, `SLICE = [0, 33]`       | `06-space.json`        |
| 7   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Motion'`, `SLICE = [0, 20]`      | `07-motion.json`       |
| 8   | `snapshot-variables.figma.js` | `COLLECTION = 'Nizivo Responsive'`, `SLICE = [0, 10]`  | `08-responsive.json`   |
| 9   | `snapshot-styles.figma.js`    | none                                                   | `09-styles.json`       |

The design file's collections and styles were renamed Grove → Nizivo on 2026-10-14
(`figma/codesyntax-rewrite.plan.md`), so the `Grove …` names match nothing in it now. The
2026-10-14 pull ran before the rename, with the same slices under the `Grove …` names; the
committed `figma/snapshot.json` and `figma/raw/**` still carry those names until the next pull,
whose `raw.ts` run clears `figma/raw/` and so drops the `Grove …` files.

The slices still fit: the rename kept every collection's variables and their order, each
variable's payload is 3 characters shorter (`var(--nz-…)` instead of `var(--grove-…)`), and the 28
style names in call 9 (about 11.6 KB) are one character longer each. Pick slices
from the inventory's `payloadBytes` so each return stays under about 18 KB (returns are capped
near 20 KB). Calls 2 to 9 can run in parallel.

## What the scripts check

- Each payload return carries `hash`, an FNV-1a hash computed inside Figma over its data;
  `merge-snapshot.ts` recomputes it, so a value mistyped while saving fails the merge. No expected
  hash is committed: each run checks its own returns, so the renamed names and code syntax change
  the hashes without failing anything.
- The merge also enforces the `Grove *` / `Nizivo *` collection and `Grove/*` / `Nizivo/*` style
  allowlist, the variable order of each collection, and that every alias points inside the snapshot.
- `raw.ts` clears `figma/raw/` and runs the TokensBrücke CLI with `figma/tb.config.json`.
