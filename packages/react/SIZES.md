# Bundle sizes and seam cost

Week 5 (ARCHITECTURE.md §17, §21.1 W5 and exit criterion 9). Every public entry of `@nizivo/react`, `@nizivo/tokens` and `@nizivo/icons` has a `size-limit` budget at measured + 10%, never above its §17.1 plan limit. The seam cost (what the engine adapter layer costs over using React Aria directly) is measured for Select, Dialog, Tooltip, Menu and Tabs. The tables below are generated; the text around them is not.

| Command (after `pnpm build`)                             | What it does                                                                                                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @nizivo/react size`                       | The gate: 118 checks against `packages/tooling/size/budgets.json`; prints only failures; exit 1 over budget. Under a second |
| `node packages/tooling/size/measure.ts`                  | Prints measured, recorded and limit for every entry                                                                         |
| `node packages/tooling/size/measure.ts --write`          | Records `measured` for every entry and a limit for new entries; rewrites the tables below. Never raises an existing limit   |
| `node packages/tooling/size/measure.ts --write --rebase` | Also resets every limit to measured + 10%, capped at the §17.1 limits. Budgets only go up through a labelled PR (§17.3)     |
| `node packages/tooling/size/seam/seam.ts --write`        | The seam harness: rewrites `packages/tooling/size/seam/results.json` and the seam tables below                              |

The config is `packages/react/.size-limit.ts`, which calls `packages/tooling/size/checks.ts`. It lives in this package because size-limit loads its plugins from the package it runs in, and only `@nizivo/react` depends on them. The checks are derived from the three packages' `exports` and from `src/**/*.client.tsx`, so a new subpath or client module without a budget fails the gate (and `packages/tooling/size/size.test.ts`) until `measure.ts --write` records it.

## Method

- **Tooling:** `size-limit` 14.2.0 with `@size-limit/esbuild` and `@size-limit/file` 14.2.0; esbuild 0.28.2. Not the `preset-small-lib`, which bundles with rolldown in 14.x.
- **Bundle:** bundle, minify (identifiers, syntax, whitespace), tree-shaking, `format: 'esm'`, `conditions: ['production']`, browser platform (esbuild then defines `process.env.NODE_ENV` as `"production"`). This is r3's method (§17). The shared options are in `packages/tooling/size/method.ts`.
- **External:** `react`, `react-dom` (and `react/jsx-runtime`) through the peer dependencies; a saved Select bundle imports all three and inlines no React. React Aria is bundled with **all its locales** (no locale plugin), the worst case a consumer can hit.
- **Compression:** gzip level 9, the budget unit (§17). Brotli quality 11 is a report-only column.
- **Units:** KiB = 1,024 B, as the plan's §17 tables and the W\*-RESULTS files count. Limits are written as `"<n> KiB"`, which size-limit parses as 1,024; its terminal report prints kB (1,000).
- **Limit rule:** measured × 1.1, rounded up to 0.1 KiB below 10 KiB and to 1 KiB from 10 KiB (`limitKiB()`, integer arithmetic), and never above the entry's §17.1 limit (`PLAN_LIMITS_KIB` in `method.ts`: Tooltip 16, Dialog 32, Tabs 35, Menu 57, Select 66, the dashboard set 76 KiB; Dialog and the dashboard set raised by 1 KiB each by M17). An empty module (`./augment` ships only types) has a 0 limit.
- **size-limit's constant:** for every bundled check, size-limit subtracts the 32 B an empty esbuild bundle gzips to. Its figures are therefore 32 B below `esbuild … | gzip -9` of the same entry, which is how W3-RESULTS.md and W4-RESULTS.md measured. The seam harness reports raw output, so its subpath figures are 32 B above the budget tables (Select: 62,436 raw, 62,404 here).
- **Families:**
  - _Public JS entries:_ the subpath file bundled with everything it imports, as a consumer's bundler sees it.
  - _Composite bundles:_ the §17.1 dashboard set (Dialog, Menu, Select, Tabs, Tooltip; v0.1 has no Popover or Sheet) in one bundle; one part through the root barrel, which must cost what its subpath costs; one and ten icons through the icons barrel (the W4 bundle test's set).
  - _Own code:_ each `*.client` module minified alone, every import external (a small esbuild plugin): §17.2's own-code caps and the method W3 and W4 measured leaves with. These are the fine-grained guard. A large entry's headroom is several KB (Select has 5,180 B under its 66 KiB plan limit), so a regression in Nizivo's own code inside an engine entry is caught here first.
  - _Seam helpers:_ seam ledger K6 (`stateAttrs`, `details`, `EngineLocale` with the config context, `engineDom` and `defined` with the attribute allowlist) with React Aria external, and K7 (`renderElement`, `toRenderFn`, `mergeProps`).
  - _CSS and JSON:_ the published file gzipped; no bundler.
- **Wildcard exports:** `@nizivo/icons/*` is represented by `calendar` (the W4 test's icon) and `hop` (the largest of the 1,879 icon modules); `@nizivo/icons/brands/*` by `instagram`, its only member.

## Against the plan (§17)

The §17.1 rows are r3's measurements of **React Aria components alone**; their limits are the hard limits. The budgets here measure Nizivo's subpaths, which add Nizivo's own layer, and every one of them is under its plan limit today, so the gate enforces the plan's limit wherever measured + 10% would sit above it: the headroom on Tooltip (57 B) and Dialog (299 B) is small, and growing either past the plan is a labelled PR that changes §17.1 first. The seam tables below account for Nizivo's layer. The engine code is at or under r3's figures: the React Aria floor of each subpath (column "React Aria floor" below) is Select 57.5 KiB (r3 59.5), Dialog 28.1 (28.1), Tooltip 13.7 (14.3), Menu 50.7 (51.3) and Tabs 31.1 (31.9).

| §17 row                                    | Plan: measured / limit | W5 measured         | W5 limit | Reading                                                                                                              |
| ------------------------------------------ | ---------------------- | ------------------- | -------: | -------------------------------------------------------------------------------------------------------------------- |
| Tooltip                                    | 14.3 / 16              | 16,327 B (15.9 KiB) |   16 KiB | At the plan's limit (57 B headroom): React Aria floor 14,019 B + Nizivo 1.6 KB over direct React Aria                |
| Dialog                                     | 28.1 / 31              | 31,445 B (30.7 KiB) |   31 KiB | At the plan's limit (299 B headroom); floor 28,757 B                                                                 |
| Tabs                                       | 31.9 / 35              | 33,577 B (32.8 KiB) |   35 KiB | Capped at the plan's limit (+ 10% would be 37)                                                                       |
| Menu                                       | 51.3 / 57              | 56,623 B (55.3 KiB) |   57 KiB | Capped at the plan's limit (+ 10% would be 61)                                                                       |
| Select                                     | 59.5 / 66              | 62,404 B (60.9 KiB) |   66 KiB | Capped at the plan's limit (+ 10% would be 68); floor 58,906 B                                                       |
| Dashboard set                              | 69.0 / 75              | 76,153 B (74.4 KiB) |   75 KiB | Gated at 75 KiB (647 B headroom); 76.2 kB would be over a decimal 75 (open); W4 measured 76,060 raw                  |
| IconButton (default tooltip path)          | 17.04 / 18.7           | 17,413 B (17.0 KiB) |   19 KiB | Matches W3's figure (no §17.1 row)                                                                                   |
| Shared helpers (`./contracts`)             | ≤ 1 KB (target)        | 1,021 B             |  1.1 KiB | At the target; the subpath also carries `details` and `STATE_ATTR_NAMES`                                             |
| Engine seam overhead (K6)                  | est. ≤ 0.5 KB          | 757 B               |  0.9 KiB | **Over the estimate** by ~0.25 KB (breakdown below)                                                                  |
| Composition (K7)                           | est. ~0.4 KB           | 678 B               |  0.8 KiB | Over the estimate; includes `cx`                                                                                     |
| Field + FieldScope (+ Form + SubmitButton) | ≤ 2.5 KB (target)      | `./field` 3,136 B   |  3.4 KiB | Over the target (bundled subpath: InlineError and the Field helpers included; Form and SubmitButton are not in v0.1) |
| Each own input leaf                        | ≤ 1 KB (target)        | own code 316–749 B  |        — | All under 1 KiB; SegmentedControl 1,169 B is the recorded D-ab exception; FieldScope 1,009 B                         |
| `tokens.css`                               | first build + 10%      | 3,879 B             |  4.2 KiB | W2 measured 3,958 B                                                                                                  |
| Each `css/<name>.css`                      | ≤ 2 KB per leaf        | 185–1,008 B         |        — | All under 1 KiB                                                                                                      |
| `@nizivo/icons`, 10 icons                  | ≤ 2,600 B              | 1,117 B             |  1.2 KiB | 72 B per added icon (W4, rolldown: 1,137 B and 71 B)                                                                 |

Nothing here changes the plan's numbers: the §17.1 limits and the K6 and K7 estimates are the plan owner's to update. The `component.json` `budget` fields (r3's figures, read by nothing) were removed in week 5.

**The root barrel.** `@nizivo/react` imported whole is 84,875 B; a bundler that tree-shakes pays per import: `{ Button }` from the barrel is 1,381 B (the `./button` subpath: 1,379 B) and `{ Select }` 62,321 B (the subpath, which exports more: 62,404 B). Both are budgeted, so a `sideEffects` regression fails the gate.

## Seam cost

Harness: `packages/tooling/size/seam/` (`seam.ts`, and `direct/*.tsx`, which typecheck with `tsc -p packages/tooling/size/seam/direct`; they were also server-rendered once in W5 as a sanity check, not a committed test). For each component, four bundles through the same esbuild with the same options:

- **React Aria floor:** a generated module re-exporting exactly the React Aria values the Nizivo subpath's dist graph imports. Any React Aria implementation of the same parts carries at least this.
- **RAC direct:** `direct/<name>.tsx`, the same parts written on React Aria directly, as a consumer styling React Aria with Nizivo's CSS would: the same RAC components, the same classes and `data-slot` hooks, the locale provider and (Select) native validation. Each file lists what it leaves out.
- **Nizivo adapter:** `dist/_engines/react-aria/<name>.client.js` alone.
- **Nizivo subpath:** `dist/<name>/index.js`.

How to read the first table. _Subpath − direct_ is what Nizivo costs over a hand-written React Aria layer with the same parts. _Adapter − floor_ is the engine adapter layer: the render-prop translation, the vocabulary `data-*`, `details`, `EngineLocale` and the behaviour the family adds (Tab out of a menu or listbox, focus return for a server-open popup, a dialog's initial focus and nested-portal container, Menu's kept checkbox state, the popup style variables). _Subpath − adapter_ is the public leaf: classes, `data-slot`, glyphs, `render` props and conveniences (Tooltip's `content` and `shortcut` with Kbd). The second table splits the subpath's own code by layer, in minified bytes.

<!-- seam:tables:start (generated by packages/tooling/size/seam/seam.ts --write) -->

esbuild 0.28.2; gzip -9 bytes of the raw output (32 B above size-limit's figure for the same entry). React external; React Aria bundled, all locales.

| Component         | React Aria floor | RAC direct | Nizivo adapter | Nizivo subpath | Subpath − direct | Adapter − floor | Subpath − adapter |
| ----------------- | ---------------: | ---------: | -------------: | -------------: | ---------------: | --------------: | ----------------: |
| Select            |           58,906 |     59,439 |         61,200 |         62,436 |           +2,997 |          +2,294 |            +1,236 |
| Dialog            |           28,757 |     29,023 |         30,437 |         31,477 |           +2,454 |          +1,680 |            +1,040 |
| Tooltip           |           14,019 |     14,699 |         15,304 |         16,359 |           +1,660 |          +1,285 |            +1,055 |
| Menu              |           51,904 |     52,192 |         54,667 |         56,655 |           +4,463 |          +2,763 |            +1,988 |
| Tabs              |           31,857 |     32,015 |         33,047 |         33,609 |           +1,594 |          +1,190 |              +562 |
| All five together |           68,258 |     69,712 |         72,595 |         76,224 |           +6,512 |          +4,337 |            +3,629 |

The subpath's own code by layer (minified bytes before gzip, from esbuild's metafile; gzip compresses the sum, so the columns do not add up to the gzip deltas):

| Component         | Leaf (parts, classes, glyphs) | Adapter | Family helpers (overlay, popup) | K6 helpers | K7 helpers | Own total |
| ----------------- | ----------------------------: | ------: | ------------------------------: | ---------: | ---------: | --------: |
| Select            |                         3,247 |   2,305 |                           2,137 |      1,681 |      1,306 |    10,676 |
| Dialog            |                         2,866 |   1,994 |                             738 |      1,681 |      1,303 |     8,582 |
| Tooltip           |                         2,488 |     784 |                             677 |      1,681 |      1,305 |     6,935 |
| Menu              |                         5,944 |   3,560 |                           2,137 |      1,681 |      1,306 |    14,628 |
| Tabs              |                         1,437 |   1,124 |                               0 |      1,681 |      1,306 |     5,548 |
| All five together |                        13,524 |   9,711 |                           2,311 |      1,680 |      1,302 |    28,528 |

K6 helpers alone (stateAttrs, details, EngineLocale with the config context, engineDom and defined with the attribute allowlist), React Aria external: **789 B** gzip raw (the size budget's figure is 32 B lower).

<!-- seam:tables:end -->

**Reading (W5).** Per component, Nizivo costs 1.6 KB (Tabs, Tooltip) to 4.5 KB (Menu) gzip over a hand-written React Aria layer with the same parts; all five together cost 6.5 KB over theirs (76.2 vs 69.7 KB), because the shared helpers count once. Of that, the shared seam proper (K6) is 757 B and composition (K7) 678 B; the rest is behaviour React Aria does not provide and the public leaf. K6 by file, minified: `stateAttrs` 820 B (the vocabulary tables), the attribute allowlist 275, `engineDom` and `defined` 234, the config context 158, `EngineLocale` 154, `details` 64.

## Budgets

<!-- size:tables:start (generated by packages/tooling/size/measure.ts --write) -->

#### `@nizivo/react`: Public JS entries (bundled with what they import, React Aria included)

| Entry              | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ------------------ | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`                |   85,746 |       83.7 |     72,488 |          93 |        9,486 |
| /alert             |    1,244 |        1.2 |      1,149 |         1.4 |          189 |
| /augment           |        0 |        0.0 |          0 |           0 |            — |
| /badge             |      796 |        0.8 |        727 |         0.9 |          125 |
| /button            |    1,232 |        1.2 |      1,131 |         1.4 |          201 |
| /card              |    1,086 |        1.1 |        971 |         1.2 |          142 |
| /checkbox          |    2,068 |        2.0 |      1,901 |         2.3 |          287 |
| /config            |      165 |        0.2 |        152 |         0.2 |           39 |
| /container         |      694 |        0.7 |        633 |         0.8 |          125 |
| /contracts         |    1,021 |        1.0 |        915 |         1.1 |          105 |
| /delta             |    1,012 |        1.0 |        932 |         1.1 |          114 |
| /dialog            |   32,121 |       31.4 |     28,551 |          32 |          647 |
| /empty-state       |      840 |        0.8 |        768 |           1 |          184 |
| /field             |    3,115 |        3.0 |      2,862 |         3.4 |          366 |
| /fieldset          |    1,715 |        1.7 |      1,560 |         1.9 |          230 |
| /grid              |      793 |        0.8 |        737 |         0.9 |          128 |
| /heading           |      767 |        0.7 |        697 |         0.9 |          154 |
| /icon-button       |   17,293 |       16.9 |     15,601 |          19 |        2,163 |
| /image             |      794 |        0.8 |        723 |         0.9 |          127 |
| /inline            |      703 |        0.7 |        639 |         0.8 |          116 |
| /inline-error      |    1,046 |        1.0 |        953 |         1.2 |          182 |
| /input             |    1,811 |        1.8 |      1,641 |           2 |          237 |
| /kbd               |    1,192 |        1.2 |      1,087 |         1.3 |          139 |
| /menu              |   56,711 |       55.4 |     48,954 |          57 |        1,657 |
| /meter             |    1,143 |        1.1 |      1,058 |         1.3 |          188 |
| /native-select     |    1,560 |        1.5 |      1,417 |         1.7 |          180 |
| /progress-bar      |    1,137 |        1.1 |      1,039 |         1.3 |          194 |
| /progress-ring     |    1,194 |        1.2 |      1,097 |         1.3 |          137 |
| /radio-group       |    2,200 |        2.1 |      2,025 |         2.4 |          257 |
| /segmented-control |    2,365 |        2.3 |      2,161 |         2.6 |          297 |
| /select            |   63,259 |       61.8 |     54,359 |          66 |        4,325 |
| /separator         |      772 |        0.8 |        700 |         0.9 |          149 |
| /skeleton          |      716 |        0.7 |        652 |         0.8 |          103 |
| /stack             |      703 |        0.7 |        640 |         0.8 |          116 |
| /switch            |    1,729 |        1.7 |      1,576 |         1.9 |          216 |
| /tab-nav           |    1,031 |        1.0 |        949 |         1.2 |          197 |
| /tabs              |   33,577 |       32.8 |     29,755 |          35 |        2,263 |
| /text              |      716 |        0.7 |        653 |         0.8 |          103 |
| /textarea          |    1,349 |        1.3 |      1,226 |         1.5 |          187 |
| /theme-script      |      363 |        0.4 |        289 |         0.4 |           46 |
| /tooltip           |   16,361 |       16.0 |     14,802 |          16 |           23 |

#### `@nizivo/react`: Composite bundles (one bundle; React Aria counted once)

| Entry                      | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| dashboard set              |   77,260 |       75.4 |     65,314 |          76 |          564 |
| { Button } from the barrel |    1,232 |        1.2 |      1,129 |         1.4 |          201 |
| { Select } from the barrel |   63,185 |       61.7 |     54,242 |          68 |        6,447 |

#### `@nizivo/react`: Own code (one module minified alone, imports not counted)

| Entry                                           | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------------------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| own: _engines/react-aria/dialog.client          |    1,138 |        1.1 |      1,002 |         1.3 |          193 |
| own: _engines/react-aria/locale.client          |      162 |        0.2 |        142 |         0.2 |           42 |
| own: _engines/react-aria/menu.client            |    1,777 |        1.7 |      1,575 |           2 |          271 |
| own: _engines/react-aria/overlay.client         |      511 |        0.5 |        444 |         0.6 |          103 |
| own: _engines/react-aria/popup.client           |    1,126 |        1.1 |        994 |         1.3 |          205 |
| own: _engines/react-aria/select.client          |    1,431 |        1.4 |      1,255 |         1.6 |          207 |
| own: _engines/react-aria/tabs.client            |      629 |        0.6 |        555 |         0.9 |          292 |
| own: _engines/react-aria/tooltip.client         |      719 |        0.7 |        680 |         0.8 |          100 |
| own: alert/alert-dismiss.client                 |      354 |        0.3 |        300 |         0.4 |           55 |
| own: checkbox/checkbox.client                   |      750 |        0.7 |        692 |         0.9 |          171 |
| own: config/config.client                       |      197 |        0.2 |        179 |         0.3 |          110 |
| own: dialog/dialog.client                       |    1,300 |        1.3 |      1,171 |         1.4 |          133 |
| own: field/field-scope.client                   |    1,123 |        1.1 |      1,009 |         1.3 |          208 |
| own: icon-button/icon-button.client             |      349 |        0.3 |        301 |         0.4 |           60 |
| own: input/input.client                         |      692 |        0.7 |        611 |         0.8 |          127 |
| own: menu/menu.client                           |    1,035 |        1.0 |        932 |         1.2 |          193 |
| own: radio-group/radio-group.client             |      614 |        0.6 |        541 |         0.7 |          102 |
| own: segmented-control/segmented-control.client |    1,169 |        1.1 |      1,052 |         1.3 |          162 |
| own: select/select.client                       |    1,146 |        1.1 |      1,054 |         1.3 |          185 |
| own: switch/switch.client                       |      552 |        0.5 |        475 |         0.6 |           62 |
| own: tabs/tabs.client                           |      486 |        0.5 |        439 |         0.6 |          128 |
| own: textarea/textarea.client                   |      316 |        0.3 |        276 |         0.4 |           93 |
| own: tooltip/tooltip.client                     |      507 |        0.5 |        448 |         0.6 |          107 |

#### `@nizivo/react`: Seam helpers (seam ledger K6 and K7; React Aria external)

| Entry                                                  | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ------------------------------------------------------ | -------: | ---------: | ---------: | ----------: | -----------: |
| seam K6 (stateAttrs, details, EngineLocale, engineDom) |      757 |        0.7 |        664 |         0.9 |          164 |
| seam K7 (renderElement, toRenderFn, mergeProps)        |      678 |        0.7 |        617 |         0.8 |          141 |

#### `@nizivo/react`: CSS and JSON entries (the published file, gzip)

| Entry                      | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /css/alert.css             |      734 |        0.7 |        606 |         0.8 |           85 |
| /css/badge.css             |      512 |        0.5 |        424 |         0.6 |          102 |
| /css/base.css              |      997 |        1.0 |        833 |         1.1 |          129 |
| /css/button.css            |    1,007 |        1.0 |        843 |         1.1 |          119 |
| /css/card.css              |      592 |        0.6 |        487 |         0.7 |          124 |
| /css/checkbox.css          |      834 |        0.8 |        687 |         0.9 |           87 |
| /css/container.css         |      185 |        0.2 |        155 |         0.2 |           19 |
| /css/delta.css             |      453 |        0.4 |        370 |         0.5 |           59 |
| /css/dialog.css            |      918 |        0.9 |        766 |           1 |          106 |
| /css/empty-state.css       |      476 |        0.5 |        373 |         0.6 |          138 |
| /css/field.css             |      330 |        0.3 |        264 |         0.4 |           79 |
| /css/fieldset.css          |      362 |        0.4 |        293 |         0.4 |           47 |
| /css/grid.css              |      531 |        0.5 |        423 |         0.6 |           83 |
| /css/heading.css           |      390 |        0.4 |        305 |         0.5 |          122 |
| /css/icon-button.css       |    1,004 |        1.0 |        852 |         1.1 |          122 |
| /css/image.css             |      243 |        0.2 |        191 |         0.3 |           64 |
| /css/inline-error.css      |      273 |        0.3 |        217 |         0.3 |           34 |
| /css/inline.css            |      274 |        0.3 |        219 |         0.3 |           33 |
| /css/input.css             |      820 |        0.8 |        688 |         0.9 |          101 |
| /css/kbd.css               |      377 |        0.4 |        303 |         0.5 |          135 |
| /css/menu.css              |    1,050 |        1.0 |        867 |         1.2 |          178 |
| /css/meter.css             |      663 |        0.6 |        546 |         0.8 |          156 |
| /css/native-select.css     |      908 |        0.9 |        759 |           1 |          116 |
| /css/progress-bar.css      |      807 |        0.8 |        671 |         0.9 |          114 |
| /css/progress-ring.css     |      519 |        0.5 |        438 |         0.6 |           95 |
| /css/radio-group.css       |      824 |        0.8 |        678 |         0.9 |           97 |
| /css/segmented-control.css |      986 |        1.0 |        808 |         1.1 |          140 |
| /css/select.css            |    1,219 |        1.2 |      1,022 |         1.4 |          214 |
| /css/separator.css         |      261 |        0.3 |        203 |         0.3 |           46 |
| /css/skeleton.css          |      365 |        0.4 |        325 |         0.4 |           44 |
| /css/stack.css             |      270 |        0.3 |        209 |         0.3 |           37 |
| /css/switch.css            |      884 |        0.9 |        738 |           1 |          140 |
| /css/tab-nav.css           |      842 |        0.8 |        690 |           1 |          182 |
| /css/tabs.css              |      972 |        0.9 |        792 |         1.1 |          154 |
| /css/text.css              |      574 |        0.6 |        487 |         0.7 |          142 |
| /css/textarea.css          |      703 |        0.7 |        577 |         0.8 |          116 |
| /css/tooltip.css           |      550 |        0.5 |        456 |         0.6 |           64 |
| /styles.css                |   14,878 |       14.5 |     12,631 |          16 |        1,506 |

#### `@nizivo/tokens`: Public JS entries (bundled with what they import, React Aria included)

| Entry | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----- | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`   |    2,309 |        2.3 |      2,001 |         2.5 |          251 |

#### `@nizivo/tokens`: CSS and JSON entries (the published file, gzip)

| Entry             | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /contract.json    |    3,247 |        3.2 |      2,647 |         3.5 |          337 |
| /custom-media.css |      166 |        0.2 |        126 |         0.2 |           38 |
| /tailwind.css     |      764 |        0.7 |        664 |         0.9 |          157 |
| /tokens.css       |    3,879 |        3.8 |      3,197 |         4.2 |          421 |
| /tokens.json      |    8,887 |        8.7 |      6,972 |         9.6 |          943 |

#### `@nizivo/icons`: Public JS entries (bundled with what they import, React Aria included)

| Entry             | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`               |  102,760 |      100.4 |     79,701 |         111 |       10,904 |
| /calendar         |      471 |        0.5 |        424 |         0.6 |          143 |
| /hop              |      822 |        0.8 |        722 |         0.9 |           99 |
| /brands/instagram |    1,193 |        1.2 |      1,022 |         1.3 |          138 |

#### `@nizivo/icons`: Composite bundles (one bundle; React Aria counted once)

| Entry                        | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ---------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| { Calendar } from the barrel |      473 |        0.5 |        424 |         0.6 |          141 |
| 10 icons from the barrel     |    1,117 |        1.1 |        988 |         1.2 |          111 |

<!-- size:tables:end -->

## Regression check (W5)

On the built tree, with a scratch copy of each file kept and restored byte for byte (`cmp`) afterwards:

- 2,068 B of random base64 appended to `dist/button/button.js` as a top-level statement (+1,770 B gzip; an unused `export` would be tree-shaken and measure nothing): `pnpm --filter @nizivo/react size` exits 1 and names `@nizivo/react/button` and `{ Button } from the barrel` (3.15 kB against 1.54 kB). Restored: exit 0.
- The same pad in `dist/_engines/react-aria/select.client.js`: the Select subpath, the dashboard set and `{ Select }` from the barrel all pass (+1.7 KB is inside their +10%), and the own-code check `own: _engines/react-aria/select.client` fails (3.02 kB against 1.43 kB). Restored: exit 0.

## Not measured

- Runtime performance (Vitest `bench`, §17.3): not part of W5.
- Tarball sizes: `pnpm check:release` packs the three packages; the W4 figures are in W4-RESULTS.md.
- A PR comment with the size diff (§17.3): Actions is off; `measure.ts` prints measured against recorded locally.
