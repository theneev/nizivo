# Figma handoff: Grove UI Library → Nizivo UI

Status: Draft v0.1 · 2026-10-14

Scope: a prioritised design backlog for the Figma file "Grove UI Library" (`BIzJFf1wm8KP0YG2AVI1tP`), so engineering can build Nizivo UI from it.

---

## How to read this

- **Audience.** Neev designers who own the Figma file, and the engineers who build from it.
- **This is a to-do list, not a review.** The file is in good shape. Most items are small, and many are only "pick one of two options".
- **Priorities.**
  - **P0:** engineering needs it for the v0.1 release (foundations, forms, core overlays).
  - **P1:** needed for v0.2 (charts, dashboard widgets, app shell, Toast, Drawer, Table).
  - **P2:** needed for v0.3 or later (registry patterns, date picker, command menu, storefront, lab).
- **Sizes.** **S** is under an hour. **M** is about half a day. **L** is a day or more.
- **Node IDs.** Linked IDs open the node in Figma. IDs in plain code font (for example `744:263`) are "ghost" masters: they sit on no page, so a link cannot land on them (§2.4). To find one, select an instance that uses it and choose *Go to main component*.
- **Evidence.** Links point to the page reports in [`figma/`](figma/) and the research in [`research/`](research/). The contrast numbers come from the accessibility gap report's scripts, re-run for this document (WCAG 2.2 relative luminance).
- **UNVERIFIED** marks anything nobody has confirmed yet, in the file or in the docs.
- **No Figma tools were called** to write the first version. It comes from the extraction reports dated 2026-10-14. The week 1 additions (§1.4 and the notes marked "week 1") come from the read-only snapshot in `packages/tokens/figma/snapshot.json`, the token dry run, the spring generator's golden test (`packages/tooling/spring`) and the browser floor lane (`fixtures/floor-lane/RESULTS.md`). The week 2 additions (§1.5 and the notes marked "week 2") come from the contrast matrix (`packages/tokens/CONTRAST.md`), two read-only Figma calls (`docs/figma/11-w2-server-safe-components.md`) and the 2026-10-14 writes to the file (the rename and the `Elevation/0 Flat` fix), made after the maintainer's go-ahead (§1.4 #1, #2).

**Package name, as the plan stands today.** The earlier message said the import would be `import { Button } from "@nizivo/ui"`. The current plan changes this to **`import { Button } from "@nizivo/react"`**. Tokens ship in `@nizivo/tokens` and icons in `@nizivo/icons`. The maintainer confirmed `@nizivo/react` on 2026-10-14 (ARCHITECTURE §1, decision 2). Nothing in this handoff depends on it.

---

## 1. Summary

### 1.1 What is great about the file

These are specific strengths. Engineering will lean on them.

| Strength | Where | Why it matters to engineering |
|---|---|---|
| **Colour is variables-only, and nearly 100% bound.** There are 0 paint styles. Fills and strokes on 01 are fully bound; 04 has 390 colour bindings and zero raw paints; 05 has 1,096. | [01](figma/01-foundations.md) §0, [04](figma/04-dashboard-widgets.md), [05](figma/05-commerce.md) | The token export is clean, and dark mode works by swapping one mode. |
| **Text uses the library's text styles throughout** (`Nizivo/*`, `Grove/*` before 2026-10-14). The only exceptions found are scaled renders. | page reports 01–08 | Typography maps 1:1 to 18 code text variants. |
| **`codeSyntax` is already set on every variable** (`var(--grove-bg-surface)`). | [00](figma/00-tokens-and-styles.md) | We only swap the prefix. Done on 2026-10-14 (§1.4 #1): Dev Mode and AI tools now show our real CSS names (§7.2). |
| **A clean three-tier palette.** 54 primitives, then 58 semantic colours with Light/Dark modes. | [00](figma/00-tokens-and-styles.md) | It maps directly onto our token tiers. |
| **The categorical chart palette is validated.** "CVD ΔE≥14, light+dark. Fixed order, never cycled; 4th+ series fold into chart/neutral 'Other'." | `chart/cat-1..3` description | Rare in design files. Code enforces the same rule. |
| **A designed Reduced motion mode.** Travel goes to 0, fades stay ≤160 ms, easing becomes linear. | Nizivo Motion collection, [`7275:12720`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12720) | It maps straight to tokens, with one addition: a fade duration that survives Reduced, because `duration/fast` is 0 there (Q34). |
| **Short, quotable usage rules on every Doc frame.** For example, "One primary per view. Secondary for everything else" and "Errors say what to do, not what went wrong". | Doc/* frames on 02–07 | They become the docs site's guidance text verbatim. |
| **Motion is specified in words.** Tooltip delay 400 ms, chart draw 700 ms, count-up 900 ms, press scale 0.98, "the backdrop only fades". | descriptions on 01, 02, 03 | Engineering does not have to guess timings. |
| **A real breakpoint rule.** "Below 640px the sidebar becomes a five-tab bar and the top bar shrinks." | [`7275:18744`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18744) | It is the only designer-backed threshold, and code uses it as-is. |
| **Full-page compositions at 1440, 1024 and 390**, including content swaps (table to list, chart to compact bars). | [08](figma/08-overview-dashboard.md) §6.3 | They show intent that a token table cannot. |
| **The 2 px `border/focus` stroke already passes** contrast everywhere (4.07–8.17:1). | 01 Borders [`7275:12561`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12561) | The focus indicator needs no colour change, only drawing rules (§4.7). |
| **A coherent visual language:** warm neutrals, forest green used sparingly, lime for AI, large soft radii, Geist with tight tracking. | all pages | Easy to keep consistent in code. |

### 1.2 What blocks engineering, and what does not

**Blocks, or will block soon:**

| # | Blocker | Blocks | Evidence |
|---|---|---|---|
| B1 | ~~**Nobody knows which Figma team owns the file.**~~ **Resolved 2026-10-14:** "Vampire D Studio", Professional plan; the file stays there. | — | Architecture plan §1, decision 3 |
| B2 | **Open design decisions that code has to encode:** the Reduced-mode fade duration, the rail-to-expanded breakpoint, the sidebar widths, mobile navigation below 640 px, resting elevation, hover timing, toast timing, the text-colour ladder, the KPI tint. | v0.1 tokens; v0.2 app shell | §6 questions 2–10, 12, 34 and 35 (the `spring()` order, Q1, was accepted on 2026-10-14) |
| B3 | **Missing states on the v0.1 component sets:** Focus, Disabled, Invalid, Pending, plus the select listbox popup. | v0.1 component CSS | §5 |
| B4 | **Accessibility failures in the colour tokens** (for example `text/tertiary` at 4.31:1, input borders at 1.27:1). | A stable release. v0.1 ships with temporary code overrides (§4). | §4.1 |
| B5 | **Dark mode has never been rendered.** Every dark-mode verdict is computed from hex values. | Dark mode leaving "preview" in v0.2 | [critique](research/00-critique.md) G4 |

**Does not block v0.1** (engineering has a workaround, but please still fix these):

- **Ghost and duplicate masters (§2.4).** Engineering records *both* the on-canvas ID and the ghost ID for every component, so the map works either way. Relinking is needed before the map is frozen and before any Code Connect.
- **Leftover collections (§2.3).** The token importer only accepts collections named `Grove *` or `Nizivo *`, so Clario, Pipkin and the rest are ignored. They must go before the Community publish.
- **Accessibility tokens (§4).** Code ships a time-boxed override file. Every entry has an expiry date and is listed publicly on a "Deviations from Figma" page. Once Figma catches up, CI forces the override to be deleted.
- **Unbound spacing and radius (§3.3).** Code maps the raw values to the nearest token for now.

### 1.3 Top 10 asks

In priority order.

| # | Ask | Why | Unblocks | Size |
|---|---|---|---|---|
| 1 | ~~Confirm which Figma team owns the file, and move it to a Neev-owned paid (Pro) team.~~ **Resolved 2026-10-14:** the file belongs to "Vampire D Studio", a Professional team, and stays there (no budget for a move). Please keep a Neev person with edit or admin access to that team. | Starter cannot create modes and has tiny API budgets. A personal team is a continuity risk (B1). | Token sync (v0.1 week 1), Community file | S |
| 2 | Hold one 45-minute decision meeting to answer questions 2–10, 12, 34 and 35 in §6, and the open asks in §1.4 and §1.5. (Q1 was answered on 2026-10-14; Q36 is set aside until a design nests an inverse surface.) | Each answer becomes a token value or a CSS rule. Guessing them now means rework later (B2). | v0.1 tokens, v0.2 shell | S |
| 3 | Approve or adjust the accessibility token remap (Option A text ladder, `border/control`, dark `red/400` and `blue/400`, `bg/critical` on `red/600`, `icon/warning` on `amber/600`), and add it to Nizivo Color and Nizivo Primitives. | Code cannot ship WCAG 2.2 AA with today's values (B4). Each fix that lands in Figma deletes a code override. | Stable release; removes overrides | M |
| 4 | Add the missing semantic variables: `bg/scrim`, `text/accent`, `text/on-critical`, `bg/critical-hover`, `bg/accent-hover`, `icon/info`, `border/control`, `border/control-hover`, `chart/warning` and `chart/critical`. | Components already need them. Today they are raw values or misused tokens, such as the Toast action painted with `bg/accent` and Progress Bar fills painted with `text/*`. Code ships them as time-boxed proposals until they exist. | v0.1 Button, Dialog, Alert, Progress Bar, form controls | S |
| 5 | Draw Focus, Disabled, Invalid and Pending states for the v0.1 sets: Button, Icon Button, Input, Select, Checkbox, Radio, Switch, Menu Item, Tab and Segment. | Most sets stop at Default/Hover. Engineers would otherwise invent these states (B3). | v0.1 components | L |
| 6 | Promote Tooltip (`746:262`) and Dropdown Menu (`746:204`) to real component sets on page 02, and add the Tab list and Segmented Control track containers. | All four ship in v0.1, but today they are ghosts or loose example frames. | v0.1 Tooltip, Menu, Tabs, SegmentedControl | M |
| 7 | Resolve the ghost and duplicate masters, v0.1 sets first: choose one surviving master per component, relink its instances and delete the dead copy. | Edits to the visible sets do not reach the 707 instances on page 08 or the 373 on page 10. | Component map freeze; Code Connect later | L |
| 8 | Restore the 74 icon masters (`738:*`) and Brand/Logo (`739:64`) onto an Icons page, and rename Grove to Nizivo (codeSyntax `var(--nz-…)`, collection and style names, logo, copy). The codeSyntax, collection and style renames were done on 2026-10-14 (§1.4 #1); the file title, logo, section labels and copy remain (§2.1). | Icons cannot be published or found in library search. "Grove" is a name we cannot use. | `@nizivo/icons`; Community file | M |
| 9 | Move the 10 leftover collections (`Clario Tokens` … `Ardenfield Tokens`, plus `Pipkin Soft`) and their 138 text styles to an archive file, and unsubscribe from unused Community libraries. | They pollute the variable pickers and every export, and would ship other brands in a Community copy. | Community file; cleaner sync | S |
| 10 | Render dark mode for pages 02, 04, 06 and 07 with the proposed dark tokens, and review it before dark mode leaves preview in v0.2. | Every dark-mode number so far is computed, not seen (B5). | Stable dark mode (v0.2) | M |

### 1.4 Asks from week 1 (2026-10-14)

Week 1 took the real file through the token pipeline (`packages/tokens/figma/DRY-RUN.md`). These asks came out of it. #1 was for the maintainer; the rest are for design. #1, #2, #5 and #6 were resolved on 2026-10-14 (marked below); #3, #4 and #7 are open.

| # | Ask | Why | Unblocks | Size |
|---|---|---|---|---|
| 1 | ~~**Maintainer:** review [`packages/tokens/figma/codesyntax-rewrite.plan.md`](../packages/tokens/figma/codesyntax-rewrite.plan.md) with design, then approve **one** run of `packages/tokens/scripts/figma/codesyntax-apply.figma.js` with `DRY_RUN = false`. It rewrites 175 `codeSyntax.WEB` values to `var(--nz-…)` and makes 33 Grove → Nizivo renames (5 collections, 18 text styles, 10 effect styles).~~ **Done 2026-10-14.** The maintainer said "yes figma rename works" and "You are free to run the rename script whenever you want". The builder applied it through `use_figma` only after the live change list matched the committed plan's FNV fingerprints `1b78ef83` and `d0cb2e42`, then verified the result by reading the file back. All 175 WEB code syntaxes now read `var(--nz-…)` (none still `var(--grove-…)`; `layout/viewport` reads `var(--nz-layout-viewport)`, a name code does not emit, because it holds frame widths). The 5 collections, 18 text styles and 10 effect styles carry the `Nizivo` prefix. The file's version history holds the pre-rename state. **Still open, for the maintainer:** rename the file to "Nizivo UI Library" by hand (the Plugin API cannot; §2.1). | The rename in §2.1, and Dev Mode showing the real CSS names. | §2.1; the first post-rename sync | S |
| 2 | ~~Delete the empty effect style `Grove/Elevation/0 Flat` (§3.4).~~ **Resolved differently, 2026-10-14.** The maintainer: "for the elevation fix, I think that looks fine". The style, used once (frame [`7275:12584`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12584) on 01 Foundations), was kept, renamed with the others and given one invisible drop shadow (alpha 0, offset 0, radius 0, spread 0). | It had no effects, and TokensBrücke 3.18.0 crashed on it (`reading 'type'`). Now the export no longer crashes, and the next export carries an elevation 0 token (`--nz-elevation-0`). Nothing in code defined elevation 0, so nothing collides. | #3 | S |
| 3 | Run the TokensBrücke plugin once with the `Nizivo` profile described in [`packages/tokens/figma/tokensbruecke.settings.md`](../packages/tokens/figma/tokensbruecke.settings.md), and upload the export as a pull request (§7.4). | It proves the designer path (v0.1 exit criterion 8) and checks what engineering could not: the plugin's style group names, the zip layout, and output equal to the CLI's apart from `createdAt` and the leftover brands' collections and text styles, which the importer drops (§2.3). It will be the first export with `Nizivo` names; engineering expects no change in `src/figma-owned` apart from the new elevation 0 token. The `Grove …` files from the last export are still in the upload folder: say so in the pull request, and engineering deletes them on that branch, or the importer stops (one collection under both prefixes is an error). Engineering also decides there whether elevation 0 takes the 1 px dark-mode ring every other elevation level has (ARCHITECTURE §7.1). | v0.1 exit criterion 8 | S |
| 4 | Glass: `Surface/Glass` loses its drop shadow in the export, and `Surface/Liquid Glass` is not exported at all (§3.4). Tell us whether Glass should keep its shadow and whether Liquid Glass stays. | TokensBrücke keeps only a style's first effect (here the 24 px background blur) and skips Figma's GLASS effect. Week 2 did not add the planned code-owned backdrop token, so your answer now decides it (§1.5 #5). | Week 2 tokens; `Surface material="glass"` (v0.3) | S |
| 5 | ~~Confirm that `spring(1, 260, 24, 0)` means (mass, stiffness, damping, velocity) (§6 Q1).~~ **Accepted 2026-10-14.** The maintainer: "string numbers look fine". The order (mass, stiffness, damping, velocity) stands for `spring(1, 260, 24, 0)` and `spring(1, 170, 26, 0)`. | Week 1 code assumed this order, and a golden test pins it. A different order would be a token-value patch. | The week 2 spring curves (shipped) | S |
| 6 | ~~Inverse inside inverse (§6 Q36).~~ **Not needed now, 2026-10-14.** The maintainer: "if current design does not use it let's not worry about it right now". The builder checked 6 pages of the file and found no inverse surface inside another; the only nesting is Card Inverse's slot, which uses `bg/inverse-elevated`. | Code keeps a nested inverse surface inverse (§4.6). Q36 comes back if a design nests one. | — | S |
| 7 | Replace `&quot;` with plain quotes in the `chart/cat-1..3` descriptions. | Descriptions are copied as they are into the token JSON. (Week 2's `tokens.css` no longer prints description comments.) | — | S |

### 1.5 Asks from week 2 (2026-10-14)

Week 2 built the server-safe components and measured every colour pair they paint (`packages/tokens/CONTRAST.md`). These asks came out of it. Where an earlier ask already covers the token, the row links to it instead of repeating it.

| # | Ask | Why | Unblocks | Size |
|---|---|---|---|---|
| 1 | **Progress fill for the Neutral tone.** `chart/neutral` is 1.36:1 (light) and 1.41:1 (dark) on `chart/track`, under the 3:1 a progress fill needs (WCAG 1.4.11). Code paints Neutral progress with `icon/secondary` (3.75:1 light, 5.32:1 dark on the track). Confirm that, or supply a darker neutral chart colour that reaches 3:1 on `chart/track` in both modes. | ProgressBar, Meter and ProgressRing have a Neutral tone, and their example shows no value text, so the fill is the only cue. Figma has no Neutral fill on Progress Bar (§5.2). §4.9 lists `chart/neutral` against white; this is the same colour on the track. | The Neutral tone; the docs "Deviations" page entry | S |
| 2 | **Progress fill for the Success tone.** Code paints it with `icon/success` (4.06:1 light, 5.87:1 dark on the track), because Figma has no `chart/success`. Confirm it, or add `chart/success` next to the `chart/warning` and `chart/critical` asked in §3.1 ("Chart status fills"). | Progress Bar draws Brand, Warning and Critical only (§5.2 asks for Success and Neutral). | The Success tone | S |
| 3 | **`bg/accent-pressed`.** Already asked in §3.1 ("Critical and Accent interaction fills"). Week 2 ships `bg/accent-hover` as a proposal but no pressed value, because none exists in the plan or the accessibility report. Please also confirm the dark `bg/accent-hover` (`lime/300`, UNVERIFIED). | Accent has no Pressed state (§5.2 Button). | Button Accent Pressed | S |
| 4 | **Card rest elevation.** Already asked in §3.2 ("Resting elevation") and §6 Q5. Code ships Card flat at rest (`elevation` 0, with 1 as an opt-in), as the compositions on 08 draw it. | Card is the v0.1 surface for every widget. | Card `elevation` default | S |
| 5 | **A backdrop or blur token for Glass.** Week 2 did not add the code-owned backdrop token planned in §1.4 #4. It needs your answer there and the Glass tokens in §3.1 ("Glass"). `bg/scrim` for modal backdrops is already asked in §3.1 ("Scrim / overlay"); code ships it as a proposal meanwhile. | `Surface material="glass"` (v0.3) | v0.3 Surface | S |
| 6 | **Review the values code snapped or chose.** Week 2 snapped off-scale values to the 4 px grid and chose values where the file has none. Snapped: Badge padding 3/10 → 2/8 (the badge is 24 px tall, not 26); Delta padding 8 and 10 → 8; Alert block padding 14 → 12; Skeleton and Kbd radius 6 → 4; Kbd block padding a literal 1 px, to keep the 24 px box. Chosen: Meter track 6 px, as the compositions draw it (ProgressBar's is 8). Chosen with no Figma spec: the indeterminate ProgressBar sweep; ProgressRing sizes 48 and 96 px around Figma's 72; the vertical and decorative Separator; Delta shows a sign (+12.4%) by default; the InlineError icon gap. Correct any you disagree with; the docs "Deviations" page lists them. | §3.3 asks you to bind these values; until then code picks the nearest token. Details per component: [`docs/figma/11-w2-server-safe-components.md`](figma/11-w2-server-safe-components.md). | The Deviations page (W5) | M |

---

## 2. Rename and hygiene

### 2.1 Grove → Nizivo

"Grove" was the design team's working name, and it is taken. The product ships as **Nizivo UI**. Code already rejects any `grove` string in shipped files, so the file should match.

| Thing | Today | Proposed | Why | Pri | Size |
|---|---|---|---|---|---|
| File name | Grove UI Library | **Nizivo UI Library** | Matches the product and the docs site (nizivo.neevtechnologies.in). Rename it by hand in the File menu: the Plugin API cannot, so the script in §1.4 #1 did not. **Open: the maintainer does this.** | P0 | S |
| Variable collections | Grove Primitives, Grove Color, Grove Space, Grove Motion, Grove Responsive | **Nizivo Primitives, Nizivo Color, Nizivo Space, Nizivo Motion, Nizivo Responsive** | The token importer selects collections by name. It accepts both `Grove *` and `Nizivo *`, and it tracks variables by their Figma id, so nothing is lost in the switch. **Done 2026-10-14** (§1.4 #1). The `Grove` prefix is dropped after the first sync that follows. | P0 | S |
| `codeSyntax` (WEB) on all 175 variables | `var(--grove-bg-surface)`, `var(--grove-p-green-500)` | **`var(--nz-bg-surface)`, `var(--nz-p-green-500)`** | Dev Mode and AI tools then show the real CSS variable names. Rules in §7.2. **Done 2026-10-14** (§1.4 #1): all 175 now read `var(--nz-…)`, with the 33 collection and style renames, written after the change list matched the plan's fingerprints and verified by reading the file back. | P0 | S |
| Text styles | `Grove/Heading/H1` … (18) | **`Nizivo/Heading/H1` …** | Same reason. Names after the prefix stay identical, because code maps them 1:1. **Done 2026-10-14.** | P0 | S |
| Effect styles | `Grove/Elevation/1 Card` … (10) | **`Nizivo/Elevation/1 Card` …** | Same. **Done 2026-10-14**, all 10 including `Elevation/0 Flat`, which was kept with an invisible shadow instead of being deleted (§1.4 #2). | P0 | S |
| Section labels | "Grove · 01 Foundations" … "Grove · 11 3D, Shader & Motion Lab" … "Grove · 12 Instagram Storefront" | "Nizivo · 01 Foundations" …, with the numbers fixed (§2.2) | Consistency | P1 | S |
| Cover meta | "Grove Commerce System" / "Tokens, components and patterns for the Grove merchant platform." / "v1.1 · October 2026 · 62 components · 74 icons" | "Nizivo UI", a neutral tagline, the version, and a recounted total (§2.5) | The count is stale: there are about 47 sets plus about 21 standalone components. | P1 | S |
| Component descriptions | "Grove Button. Variants: …" | "Button. Variants: …" | No brand inside reusable components | P1 | S |
| Rule text | "Accent is reserved for Grove AI." | New wording needed (§6 Q15) | The rule stays; the brand name goes. | P1 | S |
| Brand/Logo `739:64` | Sprout mark + "Grove" wordmark; instances [`7275:11961`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11961), [`7275:11963`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11963), [`7275:11231`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11231) | A Nizivo lockup if one exists, otherwise a neutral "Your logo" placeholder (§6 Q14) | The logo is brand content. Code ships a `logo` slot, not a logo. | P1 | M |
| Demo copy | "Powered by Grove", `grove.shop/…` (page 10) | "Powered by Nizivo" or neutral demo copy | Trademark risk in a public Community file | P2 | S |

### 2.2 Page and section numbering

| Item | Node | Fix | Why | Pri | Size |
|---|---|---|---|---|---|
| Page 09's section is labelled "11" | [`7275:19609`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19609) on page [`7275:19608`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19608) | Rename it to "· 09 3D, Shader & Motion Lab" | Page and section numbers should match. | P2 | S |
| Page 10's section is labelled "12" | [`7275:19791`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19791) on page [`7275:19790`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19790) | Rename it to "· 10 Instagram Storefront" | Same | P2 | S |
| Childless duplicate of the Rays hero | [`7279:81`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7279-81) | Delete | Dead frame | P2 | S |
| Top-level Hero with a shader fill and no children | [`7279:1476`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7279-1476) (page 10) | Move it into the section, or into page 09 | Loose frame | P2 | S |
| Separator pages | `----` [`356:1000`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=356-1000), `----` [`356:1001`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=356-1001), `---` [`7275:23025`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-23025) | Keep or delete. They hold no components. Nobody has reported on their content (critique G5). | So the extraction can skip them | P2 | S |
| Cover page | [`7275:11229`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11229) | Nobody has reported on it yet (G5). It holds the scaled logo [`7275:11231`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11231) (684×224, no size variants, text style detached). | Replace the scaled instance with a proper size, or a logo size variant. | P2 | S |

### 2.3 Leftover collections, styles and libraries

| Item | What is there | Ask | Why | Pri | Size |
|---|---|---|---|---|---|
| Foreign variable collections | 10 collections: **Clario Tokens, Pipkin Tokens, Merit Tokens, Ashgrove Tokens, Noema Tokens, Praxa Tokens, Pogo Tokens, Halden Tokens, Ardenfield Tokens**, plus **Pipkin Soft** (names from the week 1 snapshot) | Copy them to an archive file (in case another project needs them, Q26), then delete them from this file. | No page report found a reference to them on pages 01–10 (page 08's check covered composition-level nodes only). They clutter every variable picker and every export. A Community copy would redistribute other brands. | P1 | S |
| Their text styles | 138 styles with those prefixes (Clario/…, Pipkin/…, Merit/… and so on) | Same as above. Until they go, the plugin's `Typography-styles` export carries them too, and the importer drops them. | Same | P1 | S |
| Subscribed Community libraries | Material 3, Simple Design System, iOS/iPadOS 26/27, watchOS 26, visionOS 26, macOS 26/27 | Check *Libraries → this file*. Unsubscribe from any that show no usage. (Whether they are used is UNVERIFIED, Q27.) | Smaller asset panel, fewer accidental instances of foreign components | P1 | S |
| Liquid glass and inner highlight styles | `Surface/Liquid Glass`, `Surface/Inner Highlight`: 0 consumers in the whole file | Keep them, labelled "lab", or delete them | Unused styles look like part of the system. TokensBrücke 3.18.0 does not export `Surface/Liquid Glass` at all (§1.4 #4). | P2 | S |

### 2.4 Ghost and duplicate masters

**What is happening.** Most components exist twice. The set you see on the page (`7275:*`) is a copy. The master that the instances actually use (`744:*`, `745:*`, `755:*`, `772:*` and so on) sits on **no page**: the Plugin API reports `parent: null, removed: false`. Some components exist **only** as such a ghost.

```
 What designers edit                  What instances actually use
 ───────────────────                  ───────────────────────────
 Button set 7275:11244  (on page 02)  Button set 744:263  (on no page)
   0 instances on page 08               30 instances on page 08 (19 top-level, 11 nested)
         │                                       │
         └─ edits here do NOT reach ────────────►┘
```

**Consequences.**
- Edits to the visible sets change nothing in the compositions.
- Ghosts cannot be published or found in library search.
- Every audit has to check two IDs.
- Prototype hovers sometimes jump between the two copies: the page-copy Sidebar's Nav Items use the live `755:658` set, but their hover reactions target page-copy variants [`7275:14706`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14706) and [`7275:14718`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14718).

**Recommended fix, per component.**

1. **Diff the pair.** Compare property definitions, variant names, sizes, padding, radius and bindings. Eleven pairs are confirmed identical today (table A): four from the page reports, and seven diffed in week 2 (Badge, Delta, Progress Bar, Progress Ring, Alert, Empty State and Skeleton; [`docs/figma/11-w2-server-safe-components.md`](figma/11-w2-server-safe-components.md) §2). The week 2 diff compared property definitions, variant names and every descendant's size, auto-layout, radius, bound fills and strokes, effect and text styles; the only differences were text widths of 1 px or less.
2. **Pick the survivor.** Default: **keep the master the instances already use.** Bring it back onto the page with *Restore main component* on any instance, move it into the Doc frame, then port any newer edits from the page copy and delete the copy. *Why:* nothing is relinked, so no instance loses its overrides. It is also by far the cheapest path for the 707 instances on page 08 and the 373 on page 10.
   - **UNVERIFIED:** whether *Restore main component* is offered for these nodes. The "deleted master" state is inferred from `parent: null` through the Plugin API and has not been seen in the Figma UI.
   - **Fallback:** if it is not offered, an engineer can run a one-off scripted pass that swaps each instance onto the page copy, matching variants by name. That costs a few Figma API calls within the Pro daily budget. It is not done yet.
3. **Fix prototype reactions** that point at the deleted copy (for example [`7275:14706`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14706) and [`7275:14718`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14718) above).
4. **Publish**, then tell engineering the surviving node ID and component key. Engineering records them (§7.5).

**A. Sets with an on-canvas copy** (on-canvas set ↔ the master the instances use)

"Variant seen" means a report cited a variant ID inside the ghost set rather than the set itself.

| Component | On-canvas set | Ghost (live) master | Instances on the ghost (top/nested, page 08 unless noted) | Diffed? | Needed in |
|---|---|---|---|---|---|
| Button | [`7275:11244`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11244) | `744:263` | 19 / 11; also all of 04, 05, 07, 10 | not diffed | v0.1 |
| Badge | [`7275:11374`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11374) | `744:315` (variants `744:293`, `744:296`, `744:299`, `744:302`, `744:305`, `744:308`) | 1 / 61 | **identical** (week 2) | v0.1 |
| Input | [`7275:11397`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11397) | `745:187` | 5 / 0 | not diffed | v0.1 |
| Select | [`7275:11438`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11438) | `745:222` (04 cites variant `745:188`) | 0 / 2 | not diffed | v0.1 |
| Checkbox | [`7275:11456`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11456) | `745:284` | 1 / 0 | not diffed | v0.1 |
| Switch | [`7275:11494`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11494) | `745:286` | 6 / 0 | not diffed | v0.1 |
| Radio, Menu Item | [`7275:11479`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11479), [`7275:11516`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11516) | unknown (not found in compositions) | — | — | v0.1 |
| Progress Bar | [`7275:13526`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13526) | `751:367` | 3 / 0 | **identical** (week 2) | v0.1 |
| Progress Ring | [`7275:13545`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13545) | `751:388` | 4 / 0 | **identical** (week 2; one label 1 px wider) | v0.1 |
| Delta | [`7275:13743`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13743) | `752:269` (variants `752:255`, `752:260`, `752:265`) | 1 / 27 | **identical** (week 2) | v0.1 |
| Card | [`7275:13757`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13757) | none: **the Card set is never used.** About 20 panels on page 08 are raw frames. | 0 | — | v0.1 |
| Tab | [`7275:14781`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14781) | `755:961` | 17 / 0 (22 direct in total) | **identical** | v0.1 |
| Segment | [`7275:14797`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14797) | `755:982` | 17 / 0 (27 direct in total) | **identical** | v0.1 |
| Alert | [`7275:15091`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15091) | `756:868` | 2 / 0 | **identical** (week 2; two text widths ±1 px) | v0.1 |
| Empty State | [`7275:15168`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15168) | `756:1149` | 1 / 0 | **identical** (week 2) | v0.1 |
| Modal | [`7275:15139`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15139) | unknown | — | — | v0.1 |
| Skeleton | [`7275:15181`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15181) | `756:1169`, a set (Line `756:1154`, KPI `756:1158`, Row `756:1162`); the 09 pulse specimen `7275:19743` is an instance of `756:1158` | — | **identical** (week 2) | v0.1 |
| Chart Legend Item | [`7275:13291`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13291) | `747:286` | 0 / 4 | not diffed | v0.2 |
| Chart Tooltip | [`7275:13303`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13303) | `747:287`. **The on-canvas set has 0 instances**; Area and Bar hover use the ghost. | — | not diffed | v0.2 |
| Sparkline | [`7275:13323`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13323) | `747:288` (variants seen `747:273`, `747:277`) | 0 / 25 | not diffed | v0.2 |
| Area Chart | [`7275:13336`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13336) | `747:351` (04 cites `747:289` and hover variant `747:310`) | 0 / 2 | not diffed | v0.2 |
| Bar Chart / Donut Chart | [`7275:13387`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13387) / [`7275:13455`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13455) | `747:424` / `751:314` | 1 / 0 each | not diffed | v0.2 |
| KPI Tile | [`7275:13780`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13780) | `752:380` | 25 / 0 | not diffed | v0.2 |
| Insight Card | [`7275:13829`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13829) | `752:531` | 3 / 0 | not diffed | v0.2 |
| Nav Item | [`7275:14700`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14700) | `755:658` | 7 / 90 | **identical** | v0.2 |
| Sidebar | [`7275:14732`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14732) | `755:869` | 10 / 0 | not fingerprinted | v0.2 |
| Search Field | [`7275:14764`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14764) | `755:888` | 3 / 10 | **identical** | v0.2 |
| Toast | [`7275:15071`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15071) | unknown set (09 shows variant `756:820`) | — | not diffed | v0.2 |
| Banner | [`7275:15120`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15120) | `756:913` | 1 / 0 | not diffed | v0.2 |
| Mobile Tab Bar | [`7275:18747`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18747) | `764:3482`. Even this page's own set has 0 instances. | 2 / 0 | not diffed | v0.2 |
| Variant Option | [`7275:14018`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14018) | `753:405` | 7 / 0 | not diffed | v0.2 |
| Product Row / Order Row | [`7275:14040`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14040) / [`7275:14091`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14091) | `753:476` / `753:644` | 8 / 0 and 13 / 0 | not diffed | v0.2 |
| Discount Card / Payment Method / Plan Card | [`7275:14130`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14130) / [`7275:14174`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14174) / [`7275:14284`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14284) | `754:615` / `754:644` / `754:892` | 6 / 0, 2 / 0, 4 / 0 | not diffed | v0.3 |
| Collection Circle / Shoppable Post / Product Tag / Tagged Product / Storefront Bar | [`7275:19802`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19802) / [`7275:19815`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19815) / [`7275:19846`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19846) / [`7275:19862`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19862) / [`7275:19889`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19889) | `772:4320` / `772:4373` / `772:4390` / `772:4414` / `772:4457` | 0 of 373 instances on page 10 use the on-canvas sets | keys and variant counts match; children not diffed | v0.3 |

**B. Ghost-only masters** (no master on any page). Each needs to become a real component, ideally a set with properties, on the right page.

| Component | Ghost ID | Used on | Target page | Needed in | Note |
|---|---|---|---|---|---|
| Tooltip | `746:262` | 02 (Icon Button requires it) | 02 | **v0.1** | Ask #6 |
| Dropdown Menu | `746:204` | 02 | 02 | **v0.1** | Ask #6 |
| Icon/* (74 Lucide) | `738:69`–`738:426` | every page | new "Icons" page | **v0.1** | Ask #8 |
| Brand/Logo | `739:64` | 01, Cover, 10 | 01 | v0.1 | Replace with the Nizivo logo (§2.1) |
| Social/Instagram | `772:4302` | 06, 08, 10 | Icons page | v0.1 | Simple Icons glyph. Props never read (G2). |
| Top Bar | `755:1031` | 08 (10 instances), 10, 01, 06 | 06 | v0.2 | |
| Mobile Top Bar | `764:3397` | 08 | 08 | v0.2 | |
| Drawer | `756:1001` | 07, 08 Pattern 3 | 07 | v0.2 | Make it a set with side, size and modal axes |
| Store Switcher | `755:663` | 06, Sidebar | 06 | v0.2 | |
| Breadcrumb / Pagination | `755:998` / `755:1007` | 06, 08 | 06 | v0.2 | |
| Table Header + Order Table Header | `753:410` + `753:599` | 05, 08 | 05 | v0.2 | Near-duplicates. Merge into one Table Header. Props never read (G2). |
| Revenue Card / Ranked List | `752:385` / `752:444` | 04, 08 | 04 | v0.2 | No properties today |
| Order List Item | `764:3483` | 08 | 08 | v0.3 | |
| Command Menu | `755:889` | 06 | 06 | v0.3 | No properties today |
| Date Range Picker | `746:267` | 02 | 02 | v0.3 | Needs a Day cell component |
| Funnel Chart / Heatmap | `751:319` / `751:393` | 03, 08 | 03 | v0.3 | |
| Customer Card / Order Summary | `754:530` / `754:897` | 05, 07 Drawer | 05 | v0.3 | Order Summary props never read (G2) |
| Post Badge | `772:4419` | 10 | 10 | v0.3 | Really a Badge with a leading icon |

**What engineering has not read inside yet** (critique G2, G3). When you promote or relink these, please fill in their properties and descriptions. Engineering then reads them once, instead of guessing:
- props never read: Order Summary `754:897`, Table Header `753:410`, Order Table Header `753:599`, Brand/Logo `739:64`, Social/Instagram `772:4302`, Customer Card `754:530` (partly read);
- the live Sidebar `755:869` was never fingerprinted against its copy;
- internals never traversed: the ghost Button, Icon and Table Header masters (week 2 diffed the Badge ghost, §2.4 table A); the Area Chart hover variant `747:310`; the Accent CTA label colour in Insight Card; the checkout, order-placed and merchant-dashboard screens on page 10.

### 2.5 Other hygiene items

| Item | Node | Fix | Why | Pri | Size |
|---|---|---|---|---|---|
| Motion duration chips are clipped, so the ms values are invisible | [`7275:12653`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12653) (40 px frames with *Clip content* on) | Turn clipping off, or make the chips taller | The values exist but nobody can read them. | P1 | S |
| Collapsed Sidebar rail items are all labelled "Orders" | Sidebar Expanded=False in [`7275:14732`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14732) / `755:869` | Set each item's Label | Every rail item would get the same accessible name in code. | P1 | S |
| Input has a dead text property | `Value#745:7` on [`7275:11397`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11397) | Connect it to the value layer, or delete it | Overrides of the property do nothing. | P0 | S |
| Kbd is drawn as 8+ detached frames | [`7275:14768`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14768), [`7275:14773`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14773) and inside ghosts (`755:895`, `755:927`, `755:936`, `755:940`, `755:944`) | Make a Kbd component | It ships in v0.1. | P0 | S |
| "Store mark" in the collapsed rail is a detached frame | inside Sidebar Expanded=False | Add a collapsed variant to Store Switcher | Duplication drifts. | P1 | S |
| "Live Render" rasters fake 3D media slots | [`7275:15439`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15439), [`7275:18886`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18886), [`7275:16203`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16203), [`7275:16592`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16592), [`7275:16604`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16604) | Put the image inside the component's media slot | Banner, Insight Card and Empty State need a real media slot. | P2 | S |
| Instagram glyph used as decoration, against its own rule ("never as Grove decoration") | Sidebar nav icon; Post Badge `772:4419` | Use a Lucide icon, or change the rule | Trademark guidelines | P2 | S |
| Raw `#6b7069` vector in the Cover product shot | `I7275:11965;755:766;755:620;772:4301` | Bind it to `icon/secondary` | The only raw colour on 01 | P2 | S |
| Descriptions and documentation links are empty on most sets (all of 05, 06, 07 and 4 of 5 sets on 10) | — | Fill them in (template in §7.3) | Without Code Connect (needs an Organization plan), descriptions and links are how Dev Mode points to code. | P1 | M |
| The component count on the cover is stale | Cover | Recount. Today: 47 sets, about 21 non-icon standalone components, Social/Instagram, 74 icons, so roughly 68–69 components, not 62 (critique G6). | Trust in the inventory | P2 | S |
| Image licences unknown: 6 3D renders, 8 product photos, 4 portraits, Live Render stills, storefront photography | Asset library [`7275:12726`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12726) and others | Tell engineering who made each image and under what licence (§6 Q28) | Nothing raster ships, and no Community copy is published, until each image has a provenance record. A Community file is CC BY 4.0 redistribution. | P1 | S |

---

## 3. Tokens

How the names map: the Figma variable `bg/surface` becomes the CSS variable `--nz-bg-surface`, and the primitive `green/500` becomes `--nz-p-green-500`. Full rules are in §7.2.

### 3.1 Gaps: tokens that do not exist yet

"Code-owned" means engineering defines the token in the repo, because Figma cannot express it or it is derived. You only need to know it exists.

| Gap | Proposal | Owner | Why | Pri | Size |
|---|---|---|---|---|---|
| **Breakpoints** | `sm` = **640 px** (40rem), from your text on [`7275:18744`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18744). `lg` (sidebar rail → expanded) = **1280 px, provisional**. No `md` unless you want one (§6 Q3, Q13). | code | The Nizivo Responsive Desktop/Tablet/Mobile values switch at these thresholds. 1440, 1024 and 390 are frame sizes, not breakpoints. Earlier proposals of 768 are dropped because they contradict your 640 (critique C11). | P0 (`sm`), P1 (`lg`, needed by v0.2 week 8) | S |
| **z-index** | `--nz-z-raised` 1, `--nz-z-sticky` 100, `--nz-z-chrome` 200, `--nz-z-overlay` 1000, `--nz-z-toast` 1100. All overlays share one level and stack in the order they opened. | code | FYI only, no Figma work. This retires the two conflicting scales in [01](figma/01-foundations.md) §10.1 and [07](figma/07-feedback-overlays.md). A fixed "popover below modal" order breaks every Select inside a Dialog. | — | — |
| **Scrim / overlay** | New **`bg/scrim`** in Nizivo Color: Light `neutral/900` at 32% (the value already used in Pattern 3, [`7275:16092`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16092)), Dark `#000` at 60%. Rebind [`7275:16092`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16092), the Shoppable Post hover scrim (`#0f120f` at 38%) and the Post Viewer scrim. | Figma | No scrim token exists. [`7275:16092`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16092) uses `bg/inverse` at 0.32, which turns into a **white veil** in dark mode (the page brightens to `#5c5f5d`). | P0 (Dialog, v0.1) | S |
| **Opacity** | **No `opacity/disabled`.** Disabled states use `bg/disabled`, `text/disabled` and `border/subtle`, never layer opacity. Chart opacities (area wash 0.1, dim 0.35/0.45) become code-owned chart tokens once you pick one dim value (§6 Q22). | Figma (states), code (charts) | Discount Card Expired ([`7275:14157`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14157)) uses root opacity 0.70. That drops `text/secondary` to 3.25:1, `text/tertiary` to 2.57:1 and badge text to 3.15:1. | P1 | S |
| **Info and success solids** | None in v1, unless you want solid status fills such as a solid Badge or a count dot (§6 Q21). If you do, add `bg/success`, `bg/warning` and `bg/info` with matching `text/on-*` pairs at ≥ 4.5:1. | Figma | Today only Badge Brand is solid. Tokens nobody uses become debt. | P2 | S |
| **`icon/info`** | Light `blue/600` (worst case 5.83:1); Dark the new `blue/400` (4.65:1) | Figma | Alert Info uses `icon/brand` (a green icon on a blue tint), and the Badge Info dot uses `text/info`. | P0 (Alert, v0.1) | S |
| **`border/info`** | None, unless you design an outline Alert variant or another info border. The value is yours to propose; nobody has computed it (UNVERIFIED). | Figma | It only needs ≥ 3:1 if it is the only boundary of a control. | P2 | S |
| **Dark elevation** | Two tonal levels, a hairline ring and stronger shadows (§4.5) | Figma (fills), code (ring, dark shadow alphas) | Effect styles are light-only, and dark surfaces sit only 1.00–1.08:1 apart. | P1 (dark stable in v0.2) | M |
| **Caption size** | **12 px is allowed (decided 2026-10-14).** Please add two text styles: `Body/S` (Regular 12 / 150% / 0) and `Label/S` (Medium 12 / 140% / 0), or adjust the values. Until they exist, code ships them as proposals that delete themselves once your styles appear. Use them for dense places such as helper text, error text, small labels and meta text. Any colour used at 12 px still needs 4.5:1 contrast (no discount for small text); engineering's contrast matrix checks every pair. | Figma | Product needs smaller text in dense places (helper fields, errors, meta). | P2 | S |
| **Critical and Accent interaction fills** | `bg/critical-hover` = `red/700` (white text 8.26:1). `bg/critical-pressed`: today identical to hover. `bg/accent-hover` and `bg/accent-pressed`: values are yours to propose (UNVERIFIED); code ships a provisional `bg/accent-hover` meanwhile, and no `bg/accent-pressed` (week 2; §1.5 #3). | Figma | Critical Hover/Pressed bind the primitive `red/700` directly. Accent hover binds `lime/400`, which is also the dark-mode resting colour, so dark mode shows no hover. Accent has no Pressed state. | P0 (Button, v0.1) | S |
| **`text/on-critical`; `bg/critical` on `red/600` in both modes** | White on `red/600` = 5.69:1 | Figma | In dark, `bg/critical` is `red/500`, and nothing passes on it: white 4.33, `n900` 4.01, `n950` 4.32. | P0 | S |
| **`text/accent`** | Light `green/700` (worst case 7.91:1), Dark `lime/300` (10.68:1) | Figma | For accent-coloured text such as the Toast action. Today it uses the fill token `bg/accent`, which is 1.75:1 in dark mode. See §4.6. | P0 | S |
| **`border/control`, `border/control-hover`** | §4.2 | Figma | Input, checkbox, radio and select borders are 1.27–1.57:1 today. | P0 | S |
| **Chart status fills** | `chart/warning`, `chart/critical` | Figma | Progress Bar's Warning and Critical fills use `text/warning` (which renders brown, `#7c560a`) and `text/critical`. Until you add them, code ships interim aliases: `chart/warning` → `icon/warning` (amber/600 after §4.2), `chart/critical` → `chart/negative`. Week 2 measured them on `chart/track`, where the fills sit: 3.22:1 and 3.77:1 in light, 5.49:1 and 3.10:1 in dark. The Neutral and Success fills are §1.5 #1 and #2. | P0 (Progress Bar, v0.1) | S |
| **Sequential chart steps** | `chart/seq-1` … `chart/seq-5`, solid, per mode | Figma | The Heatmap uses an opacity ramp of `chart/primary`. It breaks in dark mode, and the 8% and 25% steps are 1.30:1 apart. | P2 (v0.3) | S |
| **On-media family** (page 10) | `bg/on-media`, `text/on-media`, `icon/on-media`, `border/on-media`, with the **same value in light and dark** | Figma | Badges, hint chips, scrims and pagers on photos use raw `#141714` at 62% (57 nodes), `#0f120f` and white at 80%, combined with text tokens that flip in dark mode. That gives 1.08–3.43:1 in dark. | P2 (v0.3) | S |
| **Inverse surface extras** | `border/inverse` and a muted text tone on inverse | Figma | Card Inverse's slot stroke uses the light `border/default` on `bg/inverse`. The placeholder text there is 3.65:1. | P1 | S |
| **Motion extras** | `duration/fade` 140 ms (Reduced 120 ms; Q34); `duration/toast` 5000 ms; `duration/pulse` and `easing/ambient` (Skeleton pulse, Float loops); `scale/enter` 0.96 (from the Dropdown Menu description "scale 0.96→1") | Figma (fade, toast, pulse); code (`scale/enter` and the spring durations, which are derived) | Values used in descriptions and prototypes that have no token. Until you add them, code ships `--nz-duration-fade` (140 ms, 120 ms in Reduced) and `--nz-duration-pulse` (2000 ms per cycle, 0 ms in Reduced). | P0 (fade, v0.1 overlays), P1 (others) | S |
| **Component sizes** | Avatar sizes (28/32/40/52/94 are drawn), dialog width (480), drawer width (440), toast max width, top bar height (71, off-scale), tab bar height | Figma | Code needs a scale, not one-off numbers. | P1 | S |
| **Paper colour** | `bg/paper` `#f6f5ef`, or snap the hero and shaders to `neutral/50` `#f6f7f4` | Figma | Used by the hero, the paper fade and both shaders on 09 | P2 | S |
| **Glass** | `surface/glass-fill`, `surface/glass-border`, `blur/glass`, with dark values | Figma | The glass card's fill (`#fff` at 42%) and stroke (`#fff` at 70%) are raw, and there are no dark values. | P2 | S |

### 3.2 Inconsistencies: please pick one

| Topic | What the file says | What the file does | Recommendation | Why | Pri |
|---|---|---|---|---|---|
| **Border widths** | "Borders are 1px and quiet" (01, [`7275:12561`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12561)) | `border-width/strong` = 1.5 exists. Input focus, Select open, Upload drag-over and Payment Method selected use 1.5 px. Variant Option selected uses 2 px. | Keep every border at **1 px in every state**. Focus is a 2 px outline (`border-width/focus`, §4.7). Selection is a colour change, or a 1 px inner ring. Then delete `border-width/strong` (§6 Q9). | Changing the stroke width resizes the component. Variant Option jumps from 90×40 to 92×42 and Payment Method from 73 to 74 px tall. | P0 |
| **Hover timing** | Button description: "hover 140ms standard" | Prototype hovers run at **160 ms** everywhere (Button, Nav Item, charts, Order Row, Shoppable Post). 240 and 280 ms appear on 10. | Retime to `duration/fast` (140). Snap 240/280 to `duration/base` (220) (§6 Q6). | 160 is not a token. Your own description says 140. | P0 |
| **Toast timing** | "Bottom-centre confirmation. One line, one optional action, gone in 5s." ([`7275:15070`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15070)) | The Lab specimen ([`7275:19709`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19709)) holds the toast for **2.68 s** and enters with 16 px of travel (`distance/reveal` is 12). | **5 s** for toasts without an action. **Toasts with an action, and Critical toasts, stay until dismissed.** Timers pause on hover and focus. Fix the specimen to 5 s and 12 px (§6 Q7). | WCAG 2.2.1 (Timing Adjustable): an Undo action that disappears in 5 s, let alone 2.68 s, fails people who need more time. | P1 |
| **Resting elevation** | "Depth is earned: flat by default" (01, [`7275:12578`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12578)) | Level 1 is labelled "Card · Resting cards". The Card set and Revenue Card use Elevation/1. KPI Tile, Ranked List and every panel on 08 have no shadow. | Resting cards are **flat with a 1 px `border/subtle`**. Interactive cards lift to Elevation/2 on hover. Elevation/1 is kept for small raised controls such as the Segment thumb (§6 Q5). Code ships "flat at rest" until you confirm. | The compositions on 08 are the strongest evidence of intent, and they match the header text (critique C35). | P0 |
| **Sidebar widths** | Tokens `layout/sidebar` 264 / 72 / 0 | Frames are 248 expanded and 76 rail. | Pick one and update the other (§6 Q4). | Code reads the token, so frames and code disagree today. | P1 |
| **Vertical rhythm** | `section/gap` 32 / 24 / 20 | Never used. Pages use `grid/gutter` values vertically. KPI rows use a 16 px gap, not the 24/20 gutter. | Decide which token carries vertical rhythm, then bind it. | One token per job | P1 |
| **Responsive type** | `type/h1` 32 / 28 / 24; `type/kpi` 32 / 28 / 28 | Tablet H1 is 32 (token 28). Mobile uses the H2 *style* for the page title. Mobile KPI is 32. Text styles are not bound to the `type/*` variables. | Bind Display, H1 and KPI sizes to the `type/*` variables. Keep one `h1` style that changes size. | One heading level per page, and a size that responds | P1 |
| **Content width** | `layout/content-max` 1280 / 976 / 358 | 1280 ≠ 1440 − 264 − 64. Tablet 976 ignores the 76 px rail (observed width 900). | Say whether content-max is measured inside the sidebar layout. | Code needs one formula. | P1 |
| **Skeleton pulse** | "Skeleton · pulse — duration/slower · loop" | The keyframes use a 1000 ms half-cycle (`duration/slower` is 480). | Add `duration/pulse`, or retime. Loops **stop** in Reduced mode instead of speeding up. Until you add it, code ships `--nz-duration-pulse`: 2000 ms per cycle (your 1000 ms half-cycle), 0 ms in Reduced. | Mapping it to Reduced `duration/slower` (160 ms) would flicker at about 3 Hz. | P1 |
| **Float loops** | `distance/float` 8 | −10 px and a 14 px range in the hero | Use the token, or change it. | Specimens should match tokens. | P2 |
| **Switch motion** | "Knob travels with easing/spring" | The prototype uses 220 ms cubic. Disabled Switch and Checkbox variants still toggle on click. | Use the spring in the prototype, and remove the reactions from disabled variants. | The prototype is what reviewers see. | P1 |
| **"Selected" look** | — | Three styles: brand tint (Nav Item), white plus shadow (Segment), inverse black (Pagination, filter chips). | Pick one rule per kind of selection (§6 Q23). | Users learn one signal. | P1 |
| **Doc text vs design** | "Active is the only filled state" (Nav Item); "search centre" (Top Bar); "Four steps" (Shipment Tracker) | Hover is filled; search is right-aligned; the Step axis has 3 options. | Fix the text or the design. | Docs quote your text verbatim. | P2 |

### 3.3 Hard-coded values to bind

The rule: every padding and gap binds to `space/*`, radius to `radius/*` (999 → `radius/full`), stroke width to `border-width/*`, control height to `size/control-*`, and icon size to `size/icon-*`. Snap icon sizes 14, 18 and 22 to 16, 20 or 24.

| Page | Bound today | Raw or off-scale values to fix | Pri |
|---|---|---|---|
| 01 | Fills and strokes 100% | Doc radii 4/8/12/16/20 and the Cover's 28; stroke weights; doc padding 56 and gap 40; logo radius 10 and gap 10 | P2 |
| 02 | Spacing on Button only | All other spacing; strokes; control heights; off-scale 3, 10, 28; radii 10, 22 and 3 (should be `radius/full`) | P0 |
| 03 | Colours | All geometry: spacing 14 and 10, radius 6 and 2, stroke 2, dashes 5,4 and 4,3 | P1 |
| 04 | Colours; 115 Space bindings | Gaps, Delta padding 10, pill and track radii | P1 |
| 05 | Colours | Most gaps and paddings, strokes, pill radius 999; off-scale 3, 5, 6, 10, 14 | P2 |
| 06 | Colours; radius partly | Spacing 0% bound; off-scale 9, 10, 14, 3, 6, 36, 42 and 18 px icons | P1 |
| 07 | Colours, radii, styles | Every padding and gap; Alert padding 14; Skeleton radius 6; 18 px icons | P0 |
| 08 | Colours, styles | Spacing and radius 0% bound; off-scale 3, 10, 14, 32 | P2 |
| 09 | — | Radii 32, 18, 14; padding 10; all keyframe values | P2 |
| 10 | Colours | Zero float bindings: radii 6 and 10, padding 3 and 5, gaps 10 and 14, icons 18 and 22, cover 72, bottom inset 28 | P2 |

**Off-scale 10 and 14.** They appear on almost every page. Your rule is "A 4px base grid", so the recommendation is to **snap them** (10 → 8 or 12, 14 → 12 or 16). The alternative is to add `space/2-5` (10) and `space/3-5` (14) on purpose (§6 Q10). Values below 4 (3, 5, 6, 7, 9 in pills) snap to `space/0-5` (2), `space/1` (4), `space/1-5` (6) or `space/2` (8).

**Primitive (mode-blind) bindings.** These skip the semantic layer, so they cannot change in dark mode:

| Where | Bound to today | Bind to |
|---|---|---|
| Button Critical Hover and Pressed | `red/700` | `bg/critical-hover` (and `bg/critical-pressed`) |
| Button Accent Hover | `lime/400` | `bg/accent-hover` |
| Switch off track | `neutral/300` | `border/control`, or a dedicated alias with the same value (§6 Q29) |
| Switch knob | `neutral/0` | A semantic variable (white in both modes today) |
| Switch on + disabled | `green/200` | A semantic disabled-on token |

**Semantic misuse.** These look right in light mode and break elsewhere:
- `text/on-brand` on the Radio dot and the check glyph;
- `text/info` on the Badge Info dot (use `icon/info`);
- `chart/*` on Upload progress and on Variant Option swatches (a swatch colour is product data);
- `bg/accent` used as text on the Toast action (use `text/accent`);
- `bg/brand` as the Tab indicator stroke (use a border token);
- `text/warning` and `text/critical` as Progress fills (use `chart/warning` and `chart/critical`);
- `text/*` on Button icons, where the icon descriptions say `icon/*`.

### 3.4 Effect styles with hard-coded colours

| Style | Today | Problem | Ask | Pri |
|---|---|---|---|---|
| `Elevation/1`–`4` | `#101311` at 3–14% alpha | Not bound, no dark variants | Either bind the colours to variables (this needs one variable per shadow layer, with Light/Dark modes), or treat elevation as code-owned and keep these styles as the light-mode reference (§6 Q16). Code already defines the dark shadows (§4.5). | P1 |
| `Focus/Ring` | `0 0 0 4 #2e825847` (green/500 at about 28%) | A one-digit drift (`#2e8258` vs `#2e8358`). Stays green/500 in dark, while `border/focus` becomes green/300. | Bind the colour to a new `focus/halo` variable: Light green/500 at 28%, Dark green/300 at 28%. Code already computes it that way as `--nz-focus-halo`. | P0 |
| `Focus/Ring Critical` | `#d64a2e40` (red/500 at 25%) | Drift (`#d64a2e` vs `#d6492f`) | Bind to a new `focus/halo-critical` variable (red/500 at 25%) | P0 |
| Primary Button highlight and shadow | Raw on the layer: inner `0 1 0 0 #fff` 16% plus drop `0 1 2 0 #0a211a` 18% | Not a style. Only Primary has it. The Focus variant drops it, because a variant can hold only one effect style. | Make it an `Elevation/Button` style. Draw focus as a separate ring layer (§4.7), so the button keeps its effect. | P0 |
| Switch knob shadow | Raw `0 1 2 #000` 18% | Pure black, unbound | Use an elevation style. | P1 |
| `Elevation/0 Flat` | No effects at all | Empty, and TokensBrücke 3.18.0 crashes on an effect style with no effects (week 1) | ~~Delete it (§1.4 #2).~~ **Resolved 2026-10-14:** kept, with one invisible drop shadow (alpha 0, offset 0, radius 0, spread 0); the export no longer crashes and carries `--nz-elevation-0` (what engineering does with it on the first sync: §1.4 #3). | P0 |
| `Surface/Glass` | Blur 24 plus shadow `#1013111a`; card fill and stroke raw | No dark values. TokensBrücke keeps only the first effect, so the export has the blur and **loses the shadow** (week 1) | Glass tokens (§3.1); decide the shadow (§1.4 #4) | P2 |
| `Surface/Liquid Glass`, `Surface/Inner Highlight` | 0 consumers | Unused. Liquid Glass is a Figma GLASS effect, which TokensBrücke **does not export** (week 1) | §2.3; §1.4 #4 | P2 |

### 3.5 Variable scopes

Scopes decide which variables each Figma property picker offers. TokensBrücke exports them too. Today all **20 Motion variables have empty scopes**, so they are hidden from every picker ([09](figma/09-lab.md)). **Color, Space and Responsive are already scoped**, and Primitives are already empty (checked in the week 1 snapshot, 2026-10-14). What is set matches the table below, with small differences that are fine: `chart/*` also allows Stroke (line charts need it; `chart/grid` is Stroke only), and `grid/columns` is empty, which suits a count. So only Motion needs work.

| Variables | Scope | Why |
|---|---|---|
| The Primitives collection (all) | **Empty** (hidden from pickers) | Designers bind semantic tokens. Primitives only feed aliases. |
| `bg/*`, `chart/*` fills | Frame fill, Shape fill | |
| `text/*` | Text fill | Stops a text colour from being used as a fill (the Radio dot problem) |
| `border/*` | Stroke | |
| `icon/*` | Shape fill, Stroke | Lucide icons are strokes. |
| `space/*`, `grid/gutter`, `grid/margin`, `section/gap` | Gap (auto-layout gap and padding) | |
| `radius/*` | Corner radius | |
| `border-width/*` | Stroke width | |
| `size/*`, `layout/*` | Width and height | |
| `type/*` | Font size | |
| Motion (all 20) | Add a description with the unit to each (ms, px, deg, or unitless for scale). Set scopes only if Figma lets you bind keyframe values (UNVERIFIED). | The token build needs units. Today motion values are unitless floats. |

### 3.6 `spring()` easing

Nizivo Motion (Grove Motion before the 2026-10-14 rename) stores springs as strings: `easing/spring` = `spring(1, 260, 24, 0)` and `easing/spring-soft` = `spring(1, 170, 26, 0)`. `spring()` is not valid CSS. The token build turns each one into a CSS `linear()` curve plus a matching duration, both computed from the physics.

| Figma variable | Reading (accepted 2026-10-14, §6 Q1) | Settles (within 0.1%) | Overshoot | Code tokens |
|---|---|---|---|---|
| `easing/spring` | mass 1, stiffness 260, damping 24, velocity 0 | **493 ms** | 3.0% | `--nz-easing-spring` (19-point `linear()`), `--nz-duration-spring` 493 ms |
| `easing/spring-soft` | mass 1, stiffness 170, damping 26, velocity 0 | **702 ms** | none (critically damped) | `--nz-easing-spring-soft`, `--nz-duration-spring-soft` 702 ms |
| Reduced mode | `linear` | 120 ms | — | Same names, Reduced values |

**What this means for design:**
- **A spring brings its own duration.** Pairing `easing/spring` with `duration/base` (220 ms) squeezes the curve and changes the feel. Where the file says "enter on spring" (Dropdown Menu, Select, modals, drawers), code uses the spring's own duration. Exits and opacity-only fades use a code-owned `--nz-duration-fade` (140 ms Default, 120 ms Reduced) with `easing/exit`, because `duration/fast` is 0 in Reduced and would remove them (Q34). Your principle "Reduced mode keeps fades" is what this protects.
- **If ~0.5 s feels slow** (§6 Q2), raise the stiffness rather than shortening the duration.
- Earlier reports gave four different sets of numbers for these springs (440/573, 492/701, 500/710 and 600/750 ms), because they used different settle thresholds. The build now uses one generator with one threshold ([critique](research/00-critique.md) C10). All 12 generated curves pass `CSS.supports` in Chromium and WebKit, and the `easing/spring` curve also passes in Firefox 129 (week 1).
- Code reads `spring()` in the order above. The maintainer accepted it on 2026-10-14 ("string numbers look fine"). If design ever reports another order, only the token values change.

---

## 4. Accessibility

Target: WCAG 2.2 AA. Text needs 4.5:1. Icons, control boundaries and focus indicators need 3:1. Disabled controls are exempt.

**All dark-mode numbers are computed from hex values, not from rendered screens** (critique G4). That is why ask #10 exists.

### 4.1 What fails today (computed)

| Pair | Mode | Ratio | Needs | Where it shows |
|---|---|---|---|---|
| `text/tertiary` (`n500`) on surface / subtle / canvas = hover / muted | Light | 4.31 / 4.16 / 4.01 / **3.76** | 4.5 | Placeholders, help text, shortcuts, axis labels, meta text, on every page |
| `text/tertiary` on canvas / surface / surface-raised / hover = muted | Dark | 4.34 / 4.03 / 3.65 / **3.12** | 4.5 | Same |
| `text/critical` (`red/500`) on surface / critical-subtle / hover | Dark | **4.01** / 3.63 / 3.11 | 4.5 | Error messages, Delta Down, Badge Critical |
| `text/info` (`blue/500`) on surface / info-subtle | Dark | **3.63** / 3.29 | 4.5 | Badge Info, Alert Info |
| White / `n900` / `n950` on `bg/critical` (`red/500`) | Dark | 4.33 / 4.01 / 4.32 | 4.5 | Critical button label: nothing passes. |
| `border/default` (`n200`) / `border/strong` (`n300`) vs white | Light | **1.27** / **1.57** | 3 | The only visible edge of inputs, checkboxes, radios, selects and the Switch off track |
| `border/default` (`n800`) / `border/strong` (`n700`) vs `n900` | Dark | 1.29 / 1.82 | 3 | Same |
| `icon/warning` (`amber/500`) vs white / `amber/50` | Light | **2.45** / 2.27 | 3 | Warning Alert and Banner icons |
| Focus halo (green/500 at 28%) vs white / canvas | Light | **1.45** / 1.43 | 3 | It is the *only* focus sign on Primary, Tertiary and Critical buttons and on Icon Button. |
| Toast action (`lime/400` on white) | Dark | **1.75** | 4.5 | Toast "Undo" / "View" |
| Toast success icon (`green/300` on white) | Dark | 2.29 | 3 | Toast |

What already passes: the 2 px `border/focus` stroke (light 4.07–4.66, dark 5.87–8.17) and `text/warning` in dark (5.50–7.10).

### 4.2 Proposed mapping

Every row was recomputed against every background the token can sit on (light: `n0`, `n25`, `n50`, `n100`; dark: `n950`, `n925`, `n900`, `n850`, `n800`).

| Token | Mode | Today | Proposed | Worst-case ratio (needs) | Figma action |
|---|---|---|---|---|---|
| `text/secondary` | Light | `n600` (5.65) | **`n700`** | 8.31 (4.5) | Change the alias (part of Option A, §4.4) |
| `text/secondary` | Dark | `n400` (5.32) | **`n300`** | 8.58 (4.5) | Change the alias |
| `text/tertiary` | Light | `n500` (3.76) | **`n600`** | 5.65 (4.5) | Change the alias |
| `text/tertiary` | Dark | `n500` (3.12) | **`n400`** | 5.32 (4.5) | Change the alias |
| `text/critical` | Dark | `red/500` (3.11) | **`red/400`** (new) | 4.62 (4.5) | Add the primitive, change the alias |
| `text/info` | Dark | `blue/500` (2.81) | **`blue/400`** (new) | 4.65 (4.5) | Add the primitive, change the alias |
| `text/accent` (new) | Light / Dark | — | `green/700` / `lime/300` | 7.91 / 10.68 (4.5) | Add the variable |
| `bg/critical` + `text/on-critical` (new) | Both | Dark `red/500`, nothing passes | `bg/critical` = **`red/600` in both modes**; `text/on-critical` = white | 5.69 (4.5) | Change the dark alias, add the variable |
| `bg/critical-hover` (new) | Both | Raw `red/700` binding | `red/700` with white text | 8.26 (4.5) | Add the variable |
| `icon/warning` | Light | `amber/500` (2.13) | **`amber/600`** | 3.22 (3) | Change the alias |
| `icon/info` (new) | Light / Dark | — (Alert used `icon/brand`) | `blue/600` / `blue/400` | 5.83 / 4.65 (3) | Add the variable |
| `icon/critical` | Dark | `red/500` (3.11) | **`red/400`** | 4.62 (3) | Change the alias |
| `border/control` (new) | Light | `n200` / `n300` | **`neutral/450`** (new) | 3.10 (3) | Add the primitive and the variable |
| `border/control` (new) | Dark | `n800` / `n700` | **`n500`** | 3.12 (3) | Add the variable |
| `border/control-hover` (new) | Light / Dark | `n300` (1.37) / `n700` (1.41) | `n500` / `n400` | 3.76 / 5.32 (3) | Add the variable |
| `border/warning` | Light | `amber/500` (2.13) | **`amber/600`** | 3.22 (3) | Change the alias |
| `border/critical` | Both | `red/500` | unchanged | 3.77 / 3.63 (3) | — |
| `border/focus` | Both | `green/500` / `green/300` | unchanged | 4.07 / 5.87 (3) | — |

**Component remapping that goes with it:**
- Input, Select trigger, Search Field, Checkbox and Radio use `border/control` at rest and `border/control-hover` on hover. Today they use `border/default` and `border/strong`.
- The Switch off-track fill takes the `border/control` value (`n500`). The track is then 4.31:1 against the surface in light and 4.03:1 in dark, and the white knob on it is 4.31:1.
- `border/default` and `border/subtle` become **decorative only** (cards, dividers). They need no minimum, and their light values stay as you designed them.
- The Toast action becomes a real tertiary Button in `text/accent`. Toast and Tooltip use the opposite colour scheme (§4.6).

**The cost to accept.** `border/control` at 3.1–3.6:1 is visibly stronger than today's 1.27:1 input border. That is the main change to the look. A lighter value (`#878e86`) passes everywhere except on `bg/muted`, which would need a "no controls on muted" rule. The accessibility gap report rejects that as fragile.

### 4.3 New primitives

These are **computed, not designed**: each is interpolated in OKLCH between existing ramp neighbours, so hue and chroma follow the ramp. Please look at them on real screens and adjust if needed, as long as the §4.2 ratios still pass.

| Primitive | Hex | OKLCH (L, C, h) | Derived from | Used by |
|---|---|---|---|---|
| `neutral/450` | `#828a81` | 0.624, 0.016, 142.2 | between `n400` and `n500`: the lightest step that reaches ≥ 3.10 on every light background, including muted | Light `border/control` |
| `neutral/925` | `#151816` | 0.205, 0.006, 156.7 | between `n900` and `n950`, matching light's surface → subtle step | Dark `bg/subtle` |
| `red/400` | `#e47962` | 0.692, 0.138, 33.3 | between `red/500` and `red/100`; ≥ 4.6 on every dark background | Dark `text/critical`, `icon/critical` |
| `blue/400` | `#7098e0` | 0.681, 0.116, 261.6 | between `blue/500` and `blue/100`; ≥ 4.6 on every dark background | Dark `text/info`, `icon/info` |

### 4.4 The text ladder: three options (§6 Q8)

| Option | Light primary / secondary / tertiary | Dark primary / secondary / tertiary | New primitives | Gap between secondary and tertiary (light; dark) |
|---|---|---|---|---|
| Today (fails) | `n900` / `n600` / `n500` | `n50` / `n400` / `n500` | — | 1.50:1; 1.71:1 |
| **A: re-space (recommended)** | `n900` / **`n700`** / **`n600`** | `n50` / **`n300`** / **`n400`** | none | **1.47:1; 1.61:1**: your spacing is kept |
| B: new in-between steps | `n900` / `n600` / new `#666d65` | `n50` / `n400` / new `#929a90` | 2 | 1.22:1; 1.15:1: tertiary almost merges with secondary |
| C: tertiary = secondary | `n900` / `n600` / `n600` | `n50` / `n400` / `n400` | none | none: three tokens, two values |

**Why A.** It uses only existing primitives. It keeps the step between secondary and tertiary that you chose. In dark mode, AA on `n800` caps how light tertiary can be, and A spends that range evenly.

**The cost of A.** Light secondary text gets one step darker (`n600` → `n700`) on about 20 components, and dark secondary gets brighter. The render review (ask #10) should therefore include **light** pages 02, 04, 05 and 08, not only dark. If you reject A, C is the fallback. B adds two primitives for a difference users can barely see.

### 4.5 Dark mode: surfaces and elevation

In dark mode today, shadows (tinted `neutral/950` at 3–14%) are invisible on `n900`, `bg/subtle` equals `bg/surface` (both `n900`), and menu separators (`border/subtle` `n850` on `n850`) vanish. The proposal follows the "base and elevated" model used by Apple and Material: lighter fills for raised surfaces, plus a hairline ring.

| Level (your name) | Used by | Dark fill | Dark ring | Dark shadow | Light |
|---|---|---|---|---|---|
| 0 Flat | Inline sections | `bg/surface` `n900` or `bg/subtle` | `border/default` | none | unchanged |
| 1 Card | Small raised controls (Segment thumb); resting cards if you keep Elevation/1 | `bg/surface` `n900` | white at 8% (1.34:1 against the canvas, about the same as light's 1.27) | black 24% / 18% | unchanged |
| 2 Raised | Hover lift, sticky elements | **`bg/surface-raised` `n850`** | ring | black 24% / 30% | unchanged |
| 3 Popover | Menus, select, popover | **`bg/surface-raised` `n850`** | ring | black 30% / 48% | unchanged |
| 4 Modal | Dialog, drawer, sheet, command menu | **`bg/surface-raised` `n850`** over the scrim | ring | black 36% / 60% | unchanged |

Supporting dark-only changes. Light mode is untouched.

| Token | Dark today | Dark proposed | Why |
|---|---|---|---|
| `bg/subtle` | `n900` | **`neutral/925`** (new) | Empty State containers, modal footers and the Segment track reappear (`n900` → `n925` is 1.03:1, about light's 1.04). |
| `border/subtle` | `n850` | **`n800`** | Separators on overlays: 1.00 → 1.17:1 (light is 1.15) |
| `border/default` | `n800` | **`n700`** | Card borders on `n850`: 1.17 → 1.65:1. Dark needs more edge than light, because shadows do not carry. |
| `border/strong` | `n700` | **`n600`** | Keeps the order subtle < default < strong < control |

**Why fills stop at `n850`.** Dark `bg/hover`, `bg/muted` and `bg/disabled` are all `n800`. An `n800` modal would make the hover rows inside it disappear. A modal still separates from a popover, because the scrim takes the page down to near black.

**Shadow rule.** Same geometry as your light styles, with black at 6× the light alpha, capped at 60%. The ring alpha (8%) and the ×6 multiplier are starting points to tune on real screens (§6 Q18). An inner highlight stays off by default, and can be switched on later without code changes.

**Dark collisions not solved here** (please propose values):
- `bg/brand-subtle`, `bg/accent-subtle` and `bg/success-subtle` are all `green/950` in dark. Insight Card Brand and Accent look identical, both KPI tints look identical, and the Delta pill disappears on a tinted tile.
- Plan Card's featured `bg/inverse` card becomes white in dark: "the only dark card" turns into the only light card.

### 4.6 Toast and Tooltip: inverse surfaces

Toast and Tooltip paint `bg/inverse` with `text/inverse`, then reuse normal tokens inside. That causes the dark-mode failures in §4.1. The inverse of light mode *is* dark mode: dark `bg/surface` (`n900`) equals light `bg/inverse` (`n900`). So code renders these two components in the **opposite colour scheme**, and every token inside resolves correctly with no extra "on-inverse" tokens.

| Inside the Toast | In light mode (dark toast) | In dark mode (white toast) |
|---|---|---|
| Text | 16.14:1 | 17.36:1 |
| Tertiary text | `n400`, 6.87:1 | `n600`, 6.48:1 |
| Success icon | `green/300`, 7.58:1 | `green/500`, 4.66:1 |
| Action (`text/accent`) | `lime/300`, 11.80:1 | **`green/700`**, 8.51:1 |

**To confirm** (§6 Q17): in dark mode the white toast's action is forest green, not lime. No lime passes on white: `lime/600` reaches only 3.98:1.

**Inverse inside inverse** (§6 Q36). If an inverse surface sits inside another one, for example a `tone="inverse"` Card inside another inverse Card, code keeps the inner one inverse: it does not flip back to the page's scheme. That is what the CSS does in every browser tested in week 1. Tooltips and toasts render outside the surface that opened them, so a Tooltip from an inverse Card is not nested. **Not needed now (2026-10-14):** a check of 6 pages found no nested inverse surface (the only nesting is Card Inverse's slot, on `bg/inverse-elevated`), and the maintainer said "if current design does not use it let's not worry about it right now". Tell engineering if a design nests one.

### 4.7 Focus indicator: how to draw it

1. **The indicator is a 2 px outline in `border/focus`, 2 px outside the component.** In Figma, draw it as a separate "Focus ring" layer: a 2 px inside stroke on a frame 4 px larger than the control on every side, with corner radius = control radius + 4. *Why:* code uses `outline: 2px solid var(--nz-border-focus); outline-offset: 2px`. That survives Windows high-contrast mode, and it already passes (4.07–8.17:1).
2. **The 4 px halo (`Focus/Ring`) is optional decoration** on top. It is never the only sign, because it is 1.45:1. Today it is the only sign on Primary, Tertiary and Critical buttons and on Icon Button.
3. **Use the same ring on every focusable thing:** buttons, inputs, checkboxes, radios, switches, tabs, segments, nav items, menu items (a highlighted row), cards with a link, chart points and pagination.
4. **Invalid + focused:** keep the green outline and switch the halo to `Focus/Ring Critical`. Red on red adds no information.
5. **Inside clipped containers** (table cells, a dialog's scrolling body), the ring is drawn 2 px *inside* the edge, so it is not cut off.
6. **Do not change the stroke width on focus** (Input uses 1.5 today). The outline sits outside, so nothing moves.

### 4.8 Target sizes

- **The minimum everywhere is 24×24 px** (WCAG 2.5.8). Your 32/40/48 controls already pass.
- **On touch screens, code expands every hit area to 44 px invisibly** on both axes. This implements your "44px via padding on touch" without changing layouts. You do not need to draw this.
- **What design needs to change.** Bare icons that act as buttons become Icon Buttons (at least `sm` 32, or an `xs` 24 inside a chip only):

| Bare icon or tiny target | Node or component | Size today |
|---|---|---|
| Toast close | [`7275:15071`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15071) | 16 |
| Alert close | [`7275:15091`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15091) | 16 |
| Banner close | [`7275:15120`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15120) | 18 |
| Modal close; Drawer close | [`7275:15139`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15139); `756:1001` | 20 |
| Card action ("…") | [`7275:13757`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13757) | 20 |
| Product Row "More"; table row "…" | [`7275:14040`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14040); 08 tables | 20 |
| Date picker month arrows | `746:267` | 20 |
| Mobile Top Bar search and bell | `764:3397` | 20 |
| Storefront Bar mobile search; post-view back | [`7275:19889`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19889); 10 screens | 20; 22 |
| Product Tag dot | [`7275:19846`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19846) | 24 |
| Ranked List "View all" (a plain text node, about 20 px tall) | `752:444` | ~20 |
| Toast action (a plain text node) | [`7275:15071`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15071) | ~33×20 |

- **Spacing between adjacent icon buttons** must be at least 44 minus the button size: `space/1` for 40 px buttons, `space/3` for 32 px. Otherwise the invisible touch areas overlap.
- **Checkbox and Radio rows** are 20–21 px tall today. The label is part of the target, and the row needs a minimum height of 24 px.

### 4.9 Other accessibility items for design

| Item | Where | Fix | Criterion | Pri |
|---|---|---|---|---|
| Errors are colour-only: the help text just turns red | Input [`7275:11397`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11397) | Add an error icon, and keep the message text | 1.4.1 | P0 |
| The Radio selected + disabled dot is invisible (1.15:1) | [`7275:11479`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11479) | Use `text/disabled`, as Checkbox does | 1.4.11 (good practice) | P0 |
| Nav hover is invisible in light mode: `bg/hover` = `bg/canvas` (1.00:1) inside the sidebar | Nav Item [`7275:14700`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14700) | Pick a hover fill that differs from the sidebar background | usability | P1 |
| Segment thumb vs track: 1.04:1 light, 1.00:1 dark | [`7275:14797`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14797) | Light: keep the weight change plus a ring. Dark: the §4.5 thumb on `n850` plus a ring. | 1.4.11 | P0 |
| Command Menu highlighted row is 1.08:1 | `755:889` | A stronger highlight, for example the Menu Item selected tint | 1.4.11 | P2 |
| The "seen" ring is the only new/seen signal (1.18:1 light, 1.39:1 dark) | Collection Circle [`7275:19802`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19802) | Add a second cue (label weight or a dot) | 1.4.1, 1.4.11 | P2 |
| The Shop CTA appears on hover only, and hover hides the count | Shoppable Post [`7275:19815`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19815) | Show the CTA on focus too; always show the count | 2.1.1 | P2 |
| The upcoming step node is invisible (`bg/subtle` on white, 1.04:1) | Shipment Tracker [`7275:14195`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14195) | Use a border, or a stronger fill | 1.4.11 | P2 |
| Chart marks below 3:1: `chart/neutral` 1.57, `chart/secondary` 1.65 (1.59 dark), `chart/cat-2` 2.17 on white; neighbouring cat-1/cat-2 2.02 light, 1.74 dark | page 03 | Lines that carry meaning need ≥ 3:1 or a direct label. Separate donut segments with a surface-coloured gap. Dim with opacity, not with `chart/secondary`. | 1.4.11 | P1 |
| Hero text over the rays shader is 1.78:1; glass card text over the mesh is 2.47:1 | [`7275:19610`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19610), [`7275:19634`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19634) | Keep the paper fade at ≥ 0.9 behind the copy; give the glass a stronger fill over dark backdrops | 1.4.3 | P2 |
| A 5 s toast that has Undo or Retry | [`7275:15071`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15071) | §3.2 toast timing | 2.2.1 | P1 |
| Tab bar labels sit in 75 px columns | Mobile Tab Bar [`7275:18747`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18747) | Rule: truncate with an ellipsis; the full label goes in the accessible name | 1.4.4, i18n | P1 |
| Disabled through opacity | Discount Card Expired [`7275:14157`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14157) | Use the disabled tokens (§3.1) | 1.4.3 | P2 |

---

## 5. Components

### 5.1 How to name variants so they map to code

Today one `State` axis often mixes interaction, selection, validation and availability. For example, Input's `State` is Default / Hover / Focus / Filled / Error / Disabled, and Menu Item's is Default / Hover / Selected / Critical. In code these are separate things, so please split them using the names below. Code lowercases the values: `Primary` → `primary`, `Md` → `md`.

| Meaning | Name it in Figma | In code | Notes |
|---|---|---|---|
| Interaction | `State` = Default / Hover / Pressed / Focus | CSS `:hover`, `:active`, `:focus-visible` | Never a prop. Keep these on their own axis. |
| Not available | `State` = Disabled, or a boolean `Disabled` | `:disabled`, `data-disabled` | Draw with the disabled tokens, never with opacity. |
| Read-only | boolean `Read-only` | `data-readonly` | Inputs |
| Validation message shown | boolean **`Invalid`** | `invalid` prop, `data-invalid` | Do not call this "Error"; that word is kept for a failed data load. Draw Invalid both at rest and with focus. |
| Action in flight | **`Pending`** | `pending` prop, `data-pending` | Button, Switch, submit. Not "Loading". |
| Data still loading | status **`Loading`** | `data-loading` | KPI tile, chart, table, card; usually a Skeleton |
| Data failed to load | status **`Error`** | `data-error` | KPI tile, chart, table, card |
| No data | status **`Empty`** | `data-empty` | Lists, charts, tables |
| Popup open | boolean `Open` | `data-open` | Select, Menu, Popover, Drawer |
| Keyboard or pointer highlight in a list | `Highlighted` | `data-highlighted` | Menu items, select options, command rows |
| Chosen item in a group | boolean `Selected` | `data-selected` | Tabs, segments, table rows, options. Replaces "Active" on Tab and Segment. |
| You are here | boolean `Current` | `aria-current` | Nav Item, Breadcrumb, Pagination, Mobile Tab Bar. Replaces "Active". |
| Checked | `Checked` = False / True / Indeterminate | `:checked`, `data-checked`, `data-indeterminate` | Checkbox, Radio, Switch, menu check items |
| No value chosen | boolean `Placeholder` | `data-placeholder` | Select |
| Look | `Variant`, `Size`, `Tone` | `variant`, `size`, `tone` props | **One axis name per concept.** Today the file uses Style (Card), Tone (Badge, Alert, KPI Tile, Insight Card, Banner, Toast), Type (Modal, Shoppable Post, Variant Option), Context (Empty State) and Shape (Skeleton). Order sizes Sm, Md, Lg. |
| Content | TEXT, BOOLEAN and INSTANCE_SWAP properties | children and props | **Content is not a variant.** Examples: Empty State `Context=Orders\|Search`, Plan Card `Tier`, Variant Option `Type=Colour\|Size`. Icons should be INSTANCE_SWAP properties with preferred values. Today most icons are swapped by hand inside the instance. |

Use the same words as code: `critical`, not "danger"; `tertiary`, not "ghost". British spelling in labels is fine ("Colour"); the code API uses US spelling (`color`).

### 5.2 What engineering needs first (v0.1)

v0.1 ("Foundations + forms + core overlays") is planned for 6–8 weeks after kickoff. Dark mode ships as **preview** in v0.1. One v0.1 exit criterion is **your sign-off on light renders of Button, Input, Select and Dialog**.

| v0.1 component | Figma source | What design needs to provide | Size |
|---|---|---|---|
| Text, Heading | 18 text styles, [`7275:12385`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12385) | Turn on tabular figures (OpenType `tnum`) in the Numeric/* styles; today it is only in the description. Bind Display, H1 and KPI to `type/*`. | S |
| Stack, Grid, Container, Separator | Grid doc [`7275:12608`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12608) | Breakpoints (Q3, Q13); the content-max formula (§3.2); a divider style (dividers are 1 px rectangles today) | S |
| Image | Asset library [`7275:12726`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-12726) | Aspect-ratio presets and a radius rule (renders r0, photos r16); image licences (Q28) | S |
| Button | [`7275:11244`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11244) | Pending state; the focus ring (§4.7) on every variant; the full Sm/Lg matrix (27 of 75 combinations exist); Accent Pressed and Focus; `bg/critical-hover` and `bg/accent-hover`; `text/on-critical`; the default variant (Q11) | M |
| IconButton | [`7275:11357`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11357) | Sizes Sm 32, Md 40, Lg 48; Pressed, Focus, Disabled and Selected (toggle) states; a Critical variant; the icon as an INSTANCE_SWAP property | M |
| Badge | [`7275:11374`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11374) | Padding on the scale (3/10 today); Info dot on `icon/info`; decide whether "solid" is an emphasis axis (Brand is the only solid tone) | S |
| Kbd | detached frames (§2.5) | A real component, with both Mac (⌘K) and non-Mac (Ctrl K) labels | S |
| Card | [`7275:13757`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13757) | Rename Style → Tone; turn the action boolean into a slot (an Icon Button with Menu, a Select or a Link); resting elevation (Q5); `border/inverse` | M |
| Delta | [`7275:13743`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13743) | A plain appearance for tinted backgrounds (the pill is invisible on brand-subtle, 1.00:1); digits in a Numeric style | S |
| ProgressBar, ProgressRing | [`7275:13526`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13526), [`7275:13545`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13545) | Fills on `chart/warning` and `chart/critical`; Success and Neutral tones (code's choices in §1.5 #1, #2); indeterminate; sizes; a Tone axis on the Ring | S |
| Skeleton | [`7275:15181`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15181) | Animation spec, pulse or shimmer (Q31); radius on the scale (6 today); shapes reduced to line, block and circle | S |
| EmptyState | [`7275:15168`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15168) | Sizes; a no-results variant; Context becomes content | S |
| Alert | [`7275:15091`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15091) | Info icon on `icon/info`; text that wraps instead of clipping; close as an Icon Button; an action slot; a non-dismissible version | S |
| Field, Fieldset | Input anatomy [`7275:11397`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11397) | Label, description and error anatomy for every control, not only Input; a required/optional marker (Q30); an error icon; a group legend | M |
| Input, Textarea | [`7275:11397`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11397) | Split `State` (§5.1); Invalid at rest, without focus; Read-only; sizes; prefix, suffix and trailing slots; Textarea; fix `Value#745:7` | M |
| Checkbox, RadioGroup, Switch | [`7275:11456`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11456), [`7275:11479`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11479), [`7275:11494`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11494) | Hover, Focus and Invalid; a description line; group anatomy; Switch Pending; borders on `border/control` | M |
| SegmentedControl | [`7275:14797`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14797) and track frame [`7275:14802`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14802) | A track component; Hover, Focus and Disabled; sizes; the dark thumb (§4.5) | S |
| Select | [`7275:11438`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11438) | Hover, Focus (separate from Open), Invalid and Placeholder states; **the listbox popup**, with option states (highlighted, selected, disabled); the same disabled border as Input | M |
| Tooltip | `746:262` | Promote it to a set on 02; placements top/right/bottom/left; a shortcut boolean; a max-width wrap rule | S |
| Dialog | Modal [`7275:15139`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15139) | Scrim; close as an Icon Button; sizes sm/md/lg/full (code: md = your 480 px Modal; sm 400 and lg 640 are provisional until the "Component sizes" ask in §3.1); a scrolling body; a mobile layout; a pending confirm button; nested dialogs (at most two levels, and only the bottom one draws a scrim so the page is not darkened twice, Q19) | M |
| Menu | Menu Item [`7275:11516`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11516) and `746:204` | Promote Dropdown Menu; split item `State` (highlighted × selected × tone critical × disabled); checkbox and radio items; submenu; group label; shortcut and icon as booleans | M |
| Tabs, TabNav | [`7275:14781`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14781) and container frame [`7275:14791`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14791) | A TabList component; Focus and Disabled; icon and count slots; no width jump when the label turns bold | S |
| Icons | `738:*` | Restore the masters (§2.4); confirm the stroke scales with size (1.28 px at 16, 1.6 at 20, 1.92 at 24, as Button icons already do) | S |

### 5.3 Backlog per page

Pages 01–04 and 06–07 feed core components. Page 05 and most of 08–10 become documentation examples and copy-in registry patterns, so they are lower priority.

**02 Actions & Forms** ([`7275:11238`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11238)). The v0.1 items are in §5.2. Additionally:

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| Upload [`7275:11548`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-11548) | Invalid (rejected file), Complete, Disabled, Focus; a file list with thumbnails, cancel, retry and remove | Use the Progress Bar component (it is hand-drawn today); remove the 18 px layout jump in Uploading; expose copy as TEXT properties | P1 | v0.2 |
| Date Range Picker `746:267` | A Day cell component with default, hover, focus, today, selected, range start, range end, in range, outside month, unavailable and disabled states; 1 or 2 months | Month arrows as Icon Buttons | P2 | v0.3 |

**03 Data Visualization** ([`7275:13284`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13284)). No set has focus, loading, empty, error or disabled states. Draw one shared chart status frame (loading, empty, error) rather than one per chart. By default, charts do not mirror in right-to-left languages, because time still runs left to right (Q33).

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| Chart Legend Item [`7275:13291`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13291) | Square and Area marks; an interactive (toggle) variant at least 24 px tall | Colour as an override, not a variant; unify dashes (4,3 vs 5,4); the donut legend should reuse it | P1 | v0.2 |
| Chart Tooltip [`7275:13303`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13303) | Negative delta; 3 series; flipped placement | Relink Area and Bar hover from ghost `747:287` to this set | P1 | v0.2 |
| Sparkline [`7275:13323`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13323) | Flat state | Document "Down uses `chart/neutral`" as a rule | P1 | v0.2 |
| Area Chart [`7275:13336`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13336) | Keyboard focus on a point | A token for the 120 ms area delay | P1 | v0.2 |
| Bar Chart [`7275:13387`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13387) | Focus | A nice y-domain (the top bar exceeds the 300 tick); dim with opacity; the tooltip must not cover the hovered bar | P1 | v0.2 |
| Donut Chart [`7275:13455`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13455) | Focus | One dim opacity (0.35 vs 0.45, Q22); surface-coloured gaps between segments | P1 | v0.2 |
| Funnel `751:319`, Heatmap `751:393` | Hover; minimum bar width | Promote to sets; solid `chart/seq-*` steps | P2 | v0.3 |

**04 Dashboard Widgets** ([`7275:13737`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13737)). Card and Delta are in §5.2.

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| KPI Tile [`7275:13780`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13780) | Flat trend; Loading, Error, Empty; hover and focus when clickable | Decouple the tint from the trend (Q12); a comparison-text property; build it from Card; the sparkline halo should follow the tile background | P1 | v0.2 |
| Revenue Card `752:385`, Ranked List `752:444` | Loading, Empty, Error; a narrow layout | Promote to sets with properties; "View all" becomes a Text Link; fix the leader bar (332 px inside a 330 px track); reuse Progress Bar | P1 | v0.2 |
| Metric (no set) | — | Extract the shared label, value, delta and comparison block (it appears in KPI Tile and Revenue Card with different gaps) | P1 | v0.2 |
| Insight Card [`7275:13829`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13829) | Description, dismiss, media aspect | Resolve the dark Brand = Accent collision (§4.5) | P2 | v0.2 |
| Count-up (Numeric/* styles) | — | Specify easing, trigger (in view or on change) and Reduced behaviour | P1 | v0.2 |

**05 Commerce** ([`7275:13983`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13983)). These become documentation examples and registry patterns, built from core parts.

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| Product Card [`7275:13989`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-13989) | Low stock; hover and focus; image missing; skeleton; compare-at price | Split Status into publication (Active/Draft) and availability (Sold out/Low stock); truncate long names | P2 | v0.3 |
| Variant Option [`7275:14018`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14018) | Hover, Focus; out of stock that keeps its colour, with a strike-through | Selection must not change size (90×40 → 92×42); the swatch colour is data, not `chart/*` | P1 | v0.2 |
| Product Row [`7275:14040`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14040) | Focus, Disabled; an indeterminate header checkbox; a bulk-action bar | Use the real Checkbox and an Icon Button for "More"; add a Status property | P2 | v0.2 |
| Order Row [`7275:14091`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14091) | Selected, Focus | Avatar component; the date comes from code, not a fixed string | P2 | v0.3 |
| Discount Card [`7275:14130`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14130) | Disabled/draft, unlimited uses, copy feedback, start and end dates | Expired uses disabled tokens, not 0.70 opacity; use Progress Bar | P2 | v0.3 |
| Payment Method [`7275:14174`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14174) | Hover, Focus, Disabled, Invalid (expired or declined); an "Add payment method" row | Use the real Radio; selection must not change size (73 → 74 px) | P2 | v0.3 |
| Shipment Tracker [`7275:14195`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14195) | Ordered as the current step; exception states; vertical layout for mobile | A visible upcoming node | P2 | v0.3 |
| Plan Card [`7275:14284`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14284) | Current plan, interval toggle, excluded features | Featured card on Elevation/2, not 3 (it is static); dark behaviour of the featured card | P2 | v0.3 |
| Customer Card `754:530`, Order Summary `754:897` | Contact actions; discount, tax-inclusive, empty and cart-edit states | Promote them, or keep them as documented recipes | P2 | v0.3 |

**06 Navigation** ([`7275:14694`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14694)). Tabs and Segment are in §5.2.

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| Nav Item [`7275:14700`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14700) | Focus, Pressed, Disabled; a count in the rail | Fixed height of 40 (rows are 38 or 40 today); a visible light hover; preferred values for the icon swap; `Current` replaces Active | P1 | v0.2 |
| Sidebar [`7275:14732`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14732) | Collapse toggle; group labels. Below 640 px the Mobile Tab Bar replaces the sidebar (your rule), so there is no mobile off-canvas state to draw; Q35 asks about the "More" sheet and tablet portrait | Widths (Q4); rail labels (§2.5); a Store Switcher collapsed variant | P1 | v0.2 |
| Search Field [`7275:14764`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14764) | Hover, Filled, Disabled, Loading, Clear, Invalid | Height 40 (42 today); placeholder, value and shortcut as properties; decide input vs command trigger (Q24) | P1 | v0.2 |
| Top Bar `755:1031` | A mobile layout with a menu button | Breadcrumb-left option; centred search (as the doc says); real Avatar and Icon Button | P1 | v0.2 |
| Breadcrumb `755:998`, Pagination `755:1007` | Hover, focus and disabled (Prev is enabled on page 1); compact mobile variant | Any depth with overflow collapse; one selected style (Q23); page buttons 36 → 32 or 40 | P1 | v0.2 |
| Store Switcher `755:663` | Open state, hover, focus | Logo image option; domain as a property | P1 | v0.2 |
| Command Menu `755:889` | Group headings, empty, loading, error, match highlighting; mobile full-screen | Add properties; scrim | P2 | v0.3 |

**07 Feedback & Overlays** ([`7275:15065`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15065)). Alert, Modal, Empty State and Skeleton are in §5.2.

| Component | Missing states and variants | Naming and structure fixes | Pri | Release |
|---|---|---|---|---|
| Toast [`7275:15071`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15071) | Info and Warning tones; enter and exit; stacking; a loading (promise) toast | Action becomes a Button; close becomes an Icon Button; a max width with wrapping | P1 | v0.2 |
| Banner [`7275:15120`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15120) | A mobile or stacked layout | Tone naming (Q25); close as an Icon Button; wrapping text | P1 | v0.2 |
| Drawer `756:1001` | A set with side (start/end/top/bottom), size and modal axes; open and close motion; scrim | Order content becomes an example, not part of the component. "Without losing the list" implies a non-modal drawer. A non-modal panel must not cover focusable content (WCAG 2.4.11), so on wide screens it should push the list aside (Q32). | P1 | v0.2 |

**08 Overview Dashboard** ([`7275:15335`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15335)).

| Item | Ask | Pri | Release |
|---|---|---|---|
| Mobile Tab Bar [`7275:18747`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-18747) | All 5 Active (`Current`) values; badge; pressed and focus; a "More" sheet; a long-label rule; safe-area padding as a token | P1 | v0.2 |
| Mobile Top Bar `764:3397`, Order List Item `764:3483` | Promote to sets; back-button and account variants | P1 | v0.2 |
| Compositions | Rebuild the ~20 panels from Card; bind spacing; replace Live Render rasters; make the Range options consistent (3 on tablet, 5 on mobile) | P2 | v0.2 |
| Missing states | Dashboard loading and error; table empty and no-results; bulk-action bar; row menu; account menu; notifications popover; toast after Save | P1 | v0.2 |
| Mobile versions | Patterns 1–8 (detail form, settings sub-nav, analytics, drawer as a sheet) | P2 | v0.3 |

**09 3D, Shader & Motion Lab** ([`7275:19608`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19608)). The lab is deferred until after 1.0. The 3D items are raster images, and the shader source cannot be read. Only small fixes are asked now:
- the specimen values: Toast enter 16 → 12 px and the 2.68 s hold → 5 s; Skeleton pulse vs `duration/slower`; Float −10/14 px vs 8;
- specimens for tilt, magnetic, stagger, count-up, spring, press and reveal, if you want them to ship;
- dark values for the shaders and glass;
- the off-palette orange `#f5a63f` in the Rays shader;
- the section label and the duplicate frame (§2.2).

All P2.

**10 Instagram Storefront** ([`7275:19790`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19790)). These become registry patterns in v0.3:
- relink the screens to the on-canvas sets (0 of 373 instances use them today);
- the on-media tokens (§3.1);
- the Collection Circle size jump (82 vs 80 px when the ring changes);
- a focus and touch equivalent for the hover-only Shop CTA;
- targets of at least 44 px (§4.8);
- counts and copy as properties, with plural forms;
- no decorative Instagram glyph;
- "Grove" strings out.

All P2.

### 5.4 Used in compositions but not defined as components

Ghost-only masters are listed in §2.4 B. These are hand-built frames, or components the UI implies but nobody has drawn.

| Element | Seen in | Closest existing | Ask | Release |
|---|---|---|---|---|
| Field (label, description, error) | 02 | Input anatomy | Component, §5.2 | v0.1 |
| Select listbox and option | 02 (implied) | Menu Item | Component | v0.1 |
| Tab list container (underline baseline) | 06, 08, 10 | example frame [`7275:14791`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14791) | Component | v0.1 |
| Segmented Control track | 06, 08 | example frame [`7275:14802`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-14802) | Component | v0.1 |
| Kbd | 06 | detached frames | Component | v0.1 |
| Text Link ("View all") | 04, 08 | plain text | Component with hover, focus and visited | v0.1 |
| Separator | 05, 07 | 1 px rectangles | Style or component | v0.1 |
| Textarea, character count | 02 (implied) | Input | Variant | v0.1 |
| Avatar (image, initials, square store mark; 28/32/40/52/94) | 05, 06, 08, 10 | raw image ellipses | Component with an initials fallback and sizes | v0.2 |
| Indicator dot or count on an icon (bell, bag) | 06, 10 | Badge | Variant; the dot is colour-only today | v0.2 |
| PageHeader (title, meta, actions) | 08, every pattern | — | Component | v0.2 |
| Section panel | 08 (about 20 raw frames) | Card | Use Card | v0.2 |
| Filter chip / chip group | 08 mobile [`7275:19004`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-19004) | Variant Option, Segment | Component; a 36 vs 38 px height jump today | v0.2 |
| Table container, header, toolbar, footer range summary | 05, 08 | Product Row, Order Row | Components; merge the two header ghosts | v0.2 |
| Bulk-action bar; row actions menu | 08 (implied) | — | Components | v0.2 |
| Account menu; notifications popover; store list | 06, 08 (implied) | Menu | Compositions of Menu or Popover | v0.2 |
| Settings sub-nav (NavList) and list groups | 08 Pattern 7 [`7275:16412`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16412) | Nav Item | Component | v0.2 |
| Bottom sheet; "More" sheet | 08, 10 | Drawer | Drawer with side = bottom | v0.2 |
| Sticky action bar (safe area) | 10 (×4) | — | Component | v0.2 |
| Password toggle; prefix and suffix input | 02 (implied) | Input | Variants | v0.2 |
| Compact 7-day bar card; Goals list; Progress Ring grid | 08 | Bar Chart, Progress | Chart variant or pattern | v0.2 |
| Calendar Day cell | 02 | — | Component | v0.3 |
| Combobox / search suggestions; Command Menu | 06, 08 | Command Menu ghost | Component | v0.3 |
| Quantity stepper | 10 (product page) | — | Component | v0.3 |
| Rating stars; copy button; stat tile | 05, 10 | KPI Tile | Components | v0.3 |
| Page indicator; carousel; hotspot stage | 10 | Product Tag | Components | v0.3 |
| Setup guide checklist | 08 Pattern 8 [`7275:16478`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-16478), 10 | — | Pattern | v0.3 |
| Media gallery with upload tile | 08 Pattern 2 [`7275:15860`](https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library?node-id=7275-15860) | Upload | Pattern | v0.3 |
| Chart axis, grid, data-table view | 03 | — | Chart parts | v0.2 |

**Bypassed components** (a set exists, but the composition redraws it). Please swap in the real component:
- the hand-drawn checkbox in Product Row;
- the fake radio in Payment Method;
- the raw usage meter in Discount Card;
- the hand-drawn upload progress;
- the custom Follow and Share buttons and the merchant tab bars on 10;
- bare action icons instead of Icon Button (§4.8).

---

## 6. Questions for designers

Questions 2–10, 12, 34 and 35 are for the decision meeting (ask #2). Most need a single word. Q1 was answered on 2026-10-14, and Q20 earlier that day. Q36 is set aside until a design nests an inverse surface.

1. ~~`spring()` order: is `spring(1, 260, 24, 0)` mass, stiffness, damping, initial velocity?~~ **Answered 2026-10-14: yes.** The maintainer: "string numbers look fine" (§1.4 #5).
2. Spring timing: is it OK that overlays entering on `easing/spring` take about 493 ms to settle fully (702 ms for spring-soft), instead of `duration/base` (220 ms)?
3. Rail-to-expanded sidebar breakpoint: is 1280 px right? If not, what value?
4. Sidebar widths: are the frames (248 expanded, 76 rail) or the tokens (264, 72) correct?
5. Resting cards: flat with a 1 px `border/subtle` (as on page 08), or Elevation/1?
6. Hover timing: retime the 160 ms hovers to `duration/fast` (140 ms, as the Button description says), or add a 160 ms token?
7. Toasts: OK that toasts with an action, and Critical toasts, stay until dismissed, while plain toasts leave after 5 s?
8. Text colours: accept Option A (secondary `n700`/`n300`, tertiary `n600`/`n400`)? A, B or C?
9. Border widths: delete `border-width/strong` (1.5) and keep every border at 1 px, with focus as a 2 px outline and selection as a colour change?
10. Off-scale spacing 10 and 14: snap to the 4 px grid, or add `space/2-5` (10) and `space/3-5` (14)?
11. Button default: should code default to Secondary, following your guidance "Secondary for everything else"? Figma's default is Primary.
12. KPI Tile tint: should the author choose Brand or Accent, instead of the trend choosing it?
13. Breakpoints: do you need a third threshold between 640 and 1280, or are two enough?
14. Logo: is there a Nizivo mark and wordmark yet? If not, use a neutral "Your logo" placeholder?
15. Accent rule: what should replace "Accent is reserved for Grove AI"? (For example, "reserved for AI features".)
16. Elevation styles: bind the shadow colours to variables with Light/Dark modes, or keep elevation code-owned, with the Figma styles as the light reference?
17. Dark toast: OK that the action text is lime in light mode and forest green in dark mode (on the white toast)?
18. Dark elevation: are a white 8% ring and shadows at 6× the light alpha acceptable starting points to tune?
19. Nested modals: only the bottom-most modal shows a scrim?
20. ~~Captions: keep the 14 px floor for v1? Is there anywhere you need a 12 px style?~~ **Answered 2026-10-14: 12 px is allowed.** Please add `Body/S` and `Label/S` at 12 px (§3 "Caption size"), and tell us which components should use them; until then components keep the sizes you drew.
21. Status fills: do you want solid Success, Warning and Info fills (a solid Badge, count dots), or only subtle tints?
22. Chart dimming: one opacity for dimmed series. 0.35 or 0.45?
23. Selected look: one style for Pagination, filter chips and Segment. Brand tint, white with shadow, or inverse black?
24. Top-bar search: a real input, or a button that opens the Command Menu?
25. Banner "Promo": rename the tone to "Brand" (as on Badge and Card), or keep "Promo"?
26. Leftover collections: does another Neev file use Clario, Pipkin or the others (archive them), or can they be deleted?
27. Subscribed libraries: is Material 3, Simple Design System or any Apple kit used anywhere in this file?
28. Images: who made the 3D renders, product photos and portraits, and under what licence?
29. Switch off track: bind its fill to `border/control`, or create a separate alias with the same value?
30. Field: does the help text stay visible when an error shows, and is "required" an asterisk or "(optional)" text on the other fields?
31. Skeleton: pulse or shimmer, and how long is one cycle?
32. Drawer: on wide screens, should a non-modal drawer push the content aside instead of overlapping it?
33. Right-to-left: OK that charts do not mirror in RTL languages (time still runs left to right)?
34. Reduced-motion fades: Reduced mode sets `duration/fast` to 0, but your principle says "Reduced mode keeps fades … ≤160ms". May we add `duration/fade` (140 ms Default, 120 ms Reduced) to the Motion collection for exits and opacity-only fades? Code ships it as `--nz-duration-fade` until then.
35. Mobile navigation: below 640 px the tab bar holds 5 destinations. Do the remaining sidebar items live in the "More" sheet? And do you want an off-canvas sidebar on tablet portrait (640–1279 px) instead of the rail? (Page 08 notes "Sidebar off-canvas mode for tablet portrait" as an open need; code ships the rail until you answer.)
36. ~~Inverse inside inverse: when an inverse surface sits inside another inverse surface, should the inner one stay inverse (what code does today) or flip back to the page's scheme?~~ **Set aside, 2026-10-14:** the maintainer said "if current design does not use it let's not worry about it right now", and the design has no nested inverse surface. Code keeps the inner one inverse; the question reopens if a design nests one (§1.4 #6, §4.6).

---

## 7. Working agreement going forward

### 7.1 Who owns what

| Thing | Source of truth | Who changes it | Who reviews |
|---|---|---|---|
| Token values: colour, space, motion, responsive, text and effect styles | **Figma** | Design-system designer | The designer plus one engineer (CODEOWNERS on the token files) |
| Code-owned tokens: breakpoints, z-index, derived spring durations, the fade and pulse durations (`--nz-duration-fade`, `--nz-duration-pulse`, until you add `duration/fade` and `duration/pulse`), the spinner duration, elevation ring, dark shadow alphas, focus halo | Repo | Engineering | Engineering; design informed |
| Accessibility overrides and token proposals (temporary) | Repo | The accessibility owner (an engineer) proposes them | Design-system lead **and** accessibility owner |
| Component anatomy, states and guidance text | **Figma** | Designers | Engineering |
| Component API and CSS | Repo | Engineering | A designer signs off renders |

**How an accessibility override lives and dies** (critique G19):
1. Each override records the Figma variable (by its id, so renaming the collection cannot orphan it), its Figma value at the time, its kind (`contrast`, `ladder` or `pairing`), the WCAG criterion, an issue link (or none yet: all 14 week 2 overrides have none), the approvers (only the maintainer until a second owner exists) and an **expiry date** (2027-01-31 for all of them today).
2. Every live override is listed on the public "Deviations from Figma" docs page. This is your to-do list.
3. When the fix lands in Figma (or Figma gains a variable that code proposed, such as `text/on-critical`), the next sync fails CI with "override redundant". The engineer deletes the override or proposal in that same PR.
4. If Figma changes the token in some other way, CI fails with "Figma changed this token; re-evaluate".
5. CI warns 14 days before expiry and fails after it (the check runs outside the build cache, so the date always counts). Extending needs both owners again.
6. No stable release ships a failing AA pair.

### 7.2 How to author variables

1. **Collections:** Nizivo Primitives, Nizivo Color, Nizivo Space, Nizivo Motion, Nizivo Responsive (renamed from `Grove` on 2026-10-14). Before adding a new collection, tell engineering, because the importer selects collections by name (it accepts the `Grove` and `Nizivo` prefixes until the first sync after the rename merges).
2. **Mode names exactly:** `Light` / `Dark`; `Default` / `Reduced`; `Desktop` / `Tablet` / `Mobile`; `Value` for single-mode collections.
3. **Names:** lowercase, `group/name`, kebab-case. Decimal steps use a hyphen (`space/1-5`). Never put spaces in names.
4. **Semantic variables alias a primitive.** No raw hex in semantic variables, except colours that need alpha (`bg/scrim`, `focus/halo`).
5. **Never bind a primitive directly on a component** (§3.3).
6. **codeSyntax (WEB)** is `var(--nz-` + the name with `/` replaced by `-` + `)`. Primitives add `p-`. The token build produces exactly these names, and the sync PR warns when they differ.

   | Figma variable | Collection | codeSyntax WEB |
   |---|---|---|
   | `green/500` | Nizivo Primitives | `var(--nz-p-green-500)` |
   | `viz/teal-500` | Nizivo Primitives | `var(--nz-p-viz-teal-500)` |
   | `bg/surface` | Nizivo Color | `var(--nz-bg-surface)` |
   | `text/on-critical` | Nizivo Color | `var(--nz-text-on-critical)` |
   | `space/1-5` | Nizivo Space | `var(--nz-space-1-5)` |
   | `radius/md` | Nizivo Space | `var(--nz-radius-md)` |
   | `border-width/focus` | Nizivo Space | `var(--nz-border-width-focus)` |
   | `size/control-md` | Nizivo Space | `var(--nz-size-control-md)` |
   | `duration/fast` | Nizivo Motion | `var(--nz-duration-fast)` |
   | `easing/spring` | Nizivo Motion | `var(--nz-easing-spring)` |
   | `grid/gutter` | Nizivo Responsive | `var(--nz-grid-gutter)` |

7. **Units:** sizes in px; durations in ms; easings as `cubic-bezier(a, b, c, d)` or `spring(mass, stiffness, damping, velocity)`.
8. **Descriptions:** one line on purpose and use, plus the unit for numbers.
9. **Scopes** as in §3.5.
10. **Renaming or deleting a published variable is a breaking change** for everyone who uses the library. Tell engineering first. Prefer adding the new variable, and aliasing the old one to it for one release.
11. **Text styles** are named `Nizivo/<Group>/<Name>`. Numeric/* styles have tabular figures turned on.
12. **Effect style colours** are bound to variables (§3.4).

### 7.3 How to signal "ready for dev"

**Status ladder:** Draft → In review → **Ready for dev** → In code (vX.Y) → Changed after code (needs a sync).

**How to signal it.** This works on any plan:
1. Make the first line of the main component's description `Status: Ready for dev · 2026-10-20` (with the real date).
2. Put the same status tag in the Doc frame header.
3. Also use Dev Mode's *Mark as ready for dev* where the team's plan offers it (availability on Pro is UNVERIFIED).
4. Open a GitHub issue titled "Design ready: \<Component\>" with the node link. That is engineering's intake.

**Definition of ready:**
- [ ] Every applicable state from §5.1 is drawn (at least Default, Hover, Pressed, Focus and Disabled, plus Invalid, Pending, Open, Selected, Loading, Error or Empty where relevant).
- [ ] Every value is bound: no raw colour, spacing, radius, stroke or size.
- [ ] Property and variant names follow §5.1; content is TEXT, BOOLEAN or INSTANCE_SWAP.
- [ ] It is the surviving master, not a ghost (§2.4).
- [ ] Previewed in both Light and Dark modes.
- [ ] It has a description and a documentation link (`https://nizivo.neevtechnologies.in/components/<name>`).
- [ ] Accessibility notes: label, focus order, target size.
- [ ] A changelog line on the page.

### 7.4 How changes flow to code

```
 DESIGNER                         GITHUB                                    RELEASE
 ────────                         ──────                                    ───────
 1 edit variables or styles
 2 publish the library,
   noting what changed
 3 run TokensBrücke ──────────►  PR on branch tokens-bruecke/update-tokens
   (or upload its export)        4 CI: normalise → build tokens
                                    → contrast check (every theme)
                                    → override check
                                    → token-diff comment (old → new per mode)
                                    → visual diff
                                 5 review: designer + one engineer
                                 6 merge → changeset ───────────────────►  @nizivo/tokens release
                                                                           docs "Deviations" page refreshes
```

- **TokensBrücke settings** (plugin version 3.18.0):
  ```
  format:          DTCG 2025.10 (on)
  split modes:     on   ({Collection}/{Mode}.tokens.json; a one-mode collection is {Collection}.tokens.json;
                        styles in Typography-styles.tokens.json and Effect-styles.tokens.json)
  include:         text styles, effect styles, scopes, Figma metadata
  colour format:   sRGB DTCG
  target:          packages/tokens/figma/raw   (set by engineering)
  push:            GitHub PR, through a dedicated bot account limited to tokens-bruecke/* branches
  ```
  The full settings and the upload steps are checked in at `packages/tokens/figma/tokensbruecke.settings.md` (§1.4 #3). In v0.1 you can download the export and attach it to a PR instead. The plugin push comes once the bot account exists. The plugin documents a classic token with `repo` scope; whether a fine-grained token works is UNVERIFIED.
- **Component changes** (not tokens): open a GitHub issue "Design change: \<Component\>" with the node link, what changed, and whether it breaks anything. Engineering updates the component.
- **Breaking changes:** removing or renaming a public token or variant needs a major version. Please flag it.
- **Drift:** every release PR shows the date of the last sync (TokensBrücke exports no Figma version id, only the export date). From v0.2, a daily check compares the file's latest version date with the last export's date and opens a "sync needed" issue; releases wait while it is open. It runs locally while GitHub Actions is off (ARCHITECTURE §7.7). There is no library-publish webhook: it would need a hosted relay, which the zero-spend rule does not allow.
- **Cadence:** sync whenever a token changes, and at least once per release. A weekly 30-minute design-engineering check-in. After the cleanup in §2, the Community copy of the file is updated with every minor release.

### 7.5 Component map IDs

Each component records its Figma identity in the repo. A generated `component-map.json` collects them all. Until the ghosts are resolved (§2.4), both IDs are kept, so nothing breaks while you clean up (critique C25).

```json
{
  "name": "Button",
  "figma": {
    "canonical": "7275:11244",
    "ghosts": ["744:263"],
    "key": "<component set key>",
    "page": "02 Actions & Forms"
  }
}
```

**Rules for designers:**
- **Edit components in place.** Do not duplicate a published set to make a "v2". If you must replace one, send engineering the new node ID and key.
- **Do not detach instances** in compositions. Page 08's 20 hand-drawn panels are why the Card set has 0 uses.
- **Put the docs link** in each main component's documentation-link field. On Pro, that is the substitute for Code Connect.
- **Code Connect** needs an Organization or Enterprise plan. When Neev upgrades (not planned as far as known, UNVERIFIED), this map converts to Code Connect files mechanically.

---

## Sources

- Critique of the planning inputs: [research/00-critique.md](research/00-critique.md): C11, C25, C35, G1–G9, G16, G19, missing components M-A to M-C.
- Token pipeline, Figma plan limits, TokensBrücke, drift detection: [research/r7-token-pipeline.md](research/r7-token-pipeline.md) §2, §3.3, §6, §8, §9, §11.
- Figma Community publishing: [research/r5-quality-docs.md](research/r5-quality-docs.md) §12.
- Styling contract and theming background: [research/r2-styling.md](research/r2-styling.md).
- Page reports: [00 tokens and styles](figma/00-tokens-and-styles.md), [01 Foundations](figma/01-foundations.md), [02 Actions & Forms](figma/02-actions-forms.md), [03 Data Visualization](figma/03-data-viz.md), [04 Dashboard Widgets](figma/04-dashboard-widgets.md), [05 Commerce](figma/05-commerce.md), [06 Navigation](figma/06-navigation.md), [07 Feedback & Overlays](figma/07-feedback-overlays.md), [08 Overview Dashboard](figma/08-overview-dashboard.md), [09 Lab](figma/09-lab.md), [10 Instagram Storefront](figma/10-instagram-storefront.md).
- Contrast numbers, dark elevation, the overlay model and target sizes: [gap report C](research/phase2/gaps/gap-c-overlays-dark-a11y.md), with its scripts in [research/phase2/scripts/contrast/](research/phase2/scripts/contrast/). The scripts were re-run for this handoff, and every ratio quoted here reproduced.
