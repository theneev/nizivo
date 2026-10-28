# Promotion snapshot (engineer session)

Plan §20: a part whose Figma set has stayed the same for **two sync cycles** is a candidate for
promotion from `unstable/*` to stable. `figma/promotion.json` is the ledger: one snapshot per sync,
with a hash of each unstable part's Figma set. A snapshot counts as a cycle for a part when it is at
least seven days after the last one that counted for that part; any change to the set starts its
count again (D-ds). Take a snapshot with each token pull (`packages/tokens/scripts/figma/PULL-AGENT.md`),
or on its own, at most once a day.

`parts.figma.js` is **read-only**: it reads each set's subtree and returns only hashes. Human-triggered
only, never in CI (the remote MCP server is OAuth-only).

## Prompt

> Load the `figma-use` skill. Run `node packages/react/scripts/figma/promotion.ts ids` and set its
> output as `IDS` at the top of `packages/react/scripts/figma/parts.figma.js`, then run that script
> with `use_figma` in file `BIzJFf1wm8KP0YG2AVI1tP`. Save the return verbatim as JSON in a new scratch
> folder outside the repo. Then run `node packages/react/scripts/figma/promotion.ts record <file>`
> and report its output. Do not commit the `IDS` you set.

## What the snapshot covers

- Each canonical node in the part's `component.json` (`figma.canonical`), with its whole subtree:
  layout, size, fills, strokes, effects, styles and bound variables, text and its styling, variant
  and component properties, descriptions and vector paths. Instances are read through, so a change
  to a component the set uses (Button, say) counts as a change to the set.
- Not covered: where the set sits on the canvas, and node ids.
- The return carries `check`, an FNV-1a hash over its `parts`; `record` recomputes it, so a value
  mistyped while saving fails. It also fails when an id is missing or not found in Figma.

## Reading the result

`node packages/react/scripts/figma/promotion.ts status` lists each part: the snapshot where its set
first appeared or last changed, the cycles since, and the earliest date the next snapshot counts.
A candidate is not promoted automatically: promotion is a reviewed change (the part's strings move
to `enUS`, its stylesheet joins `styles.css`, it gets a stable subpath and a changeset).

The first snapshot, on 2026-10-28, took one call for all 47 ids (the largest set, Response Block,
serialized to 194 KB inside Figma; the return was about 8 KB). Two reads of the same sets gave the
same hashes.
