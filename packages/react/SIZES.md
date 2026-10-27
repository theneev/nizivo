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
- **Limit rule:** measured × 1.1, rounded up to 0.1 KiB below 10 KiB and to 1 KiB from 10 KiB (`limitKiB()`, integer arithmetic), and never above the entry's §17.1 limit (`PLAN_LIMITS_KIB` in `method.ts`: Tooltip 18, Dialog 32, Popover 39, Sheet 35, Tabs 35, Menu 57, Select 66, the dashboard set 85 KiB; raised by M17 (Dialog, the dashboard set), M43 (Popover, Sheet, the dashboard set) and M46 (Tooltip)). An empty module (`./augment` ships only types) has a 0 limit.
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
| Select            |           58,906 |     59,439 |         61,634 |         63,291 |           +3,852 |          +2,728 |            +1,657 |
| Dialog            |           28,757 |     29,035 |         30,742 |         32,159 |           +3,124 |          +1,985 |            +1,417 |
| Tooltip           |           14,019 |     14,705 |         15,338 |         16,404 |           +1,699 |          +1,319 |            +1,066 |
| Menu              |           51,904 |     52,192 |         54,951 |         56,743 |           +4,551 |          +3,047 |            +1,792 |
| Tabs              |           31,867 |     32,015 |         33,155 |         33,715 |           +1,700 |          +1,288 |              +560 |
| All five together |           68,258 |     69,718 |         73,169 |         77,435 |           +7,717 |          +4,911 |            +4,266 |

The subpath's own code by layer (minified bytes before gzip, from esbuild's metafile; gzip compresses the sum, so the columns do not add up to the gzip deltas):

| Component         | Leaf (parts, classes, glyphs) | Adapter | Family helpers (overlay, popup) | K6 helpers | K7 helpers | Own total |
| ----------------- | ----------------------------: | ------: | ------------------------------: | ---------: | ---------: | --------: |
| Select            |                         4,802 |   2,679 |                           2,871 |      1,681 |      1,306 |    13,339 |
| Dialog            |                         3,859 |   2,017 |                           1,472 |      1,681 |      1,303 |    10,332 |
| Tooltip           |                         2,516 |     886 |                             677 |      1,681 |      1,305 |     7,065 |
| Menu              |                         5,542 |   3,560 |                           2,871 |      1,681 |      1,306 |    14,960 |
| Tabs              |                         1,437 |   1,423 |                               0 |      1,681 |      1,306 |     5,847 |
| All five together |                        15,755 |  10,509 |                           3,045 |      1,680 |      1,302 |    32,291 |

K6 helpers alone (stateAttrs, details, EngineLocale with the config context, engineDom and defined with the attribute allowlist), React Aria external: **789 B** gzip raw (the size budget's figure is 32 B lower).

<!-- seam:tables:end -->

**Reading (W5).** Per component, Nizivo costs 1.6 KB (Tabs, Tooltip) to 4.5 KB (Menu) gzip over a hand-written React Aria layer with the same parts; all five together cost 6.5 KB over theirs (76.2 vs 69.7 KB), because the shared helpers count once. Of that, the shared seam proper (K6) is 757 B and composition (K7) 678 B; the rest is behaviour React Aria does not provide and the public leaf. K6 by file, minified: `stateAttrs` 820 B (the vocabulary tables), the attribute allowlist 275, `engineDom` and `defined` 234, the config context 158, `EngineLocale` 154, `details` 64.

## Budgets

<!-- size:tables:start (generated by packages/tooling/size/measure.ts --write) -->

#### `@nizivo/react`: Public JS entries (bundled with what they import, React Aria included)

| Entry                        | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ---------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`                          |  134,577 |      131.4 |    110,340 |         143 |       11,855 |
| /accordion                   |    1,312 |        1.3 |      1,205 |         1.5 |          224 |
| /alert                       |    1,383 |        1.4 |      1,264 |         1.4 |           50 |
| /app-shell                   |      462 |        0.5 |        433 |         0.5 |           50 |
| /augment                     |        0 |        0.0 |          0 |           0 |            — |
| /avatar                      |    1,472 |        1.4 |      1,355 |         1.5 |           64 |
| /badge                       |      796 |        0.8 |        727 |         0.9 |          125 |
| /banner                      |    1,412 |        1.4 |      1,298 |         1.5 |          124 |
| /breadcrumb                  |    1,292 |        1.3 |      1,198 |         1.4 |          141 |
| /bulk-action-bar             |      941 |        0.9 |        858 |           1 |           83 |
| /button                      |    1,279 |        1.2 |      1,179 |         1.4 |          154 |
| /card                        |    1,086 |        1.1 |        971 |         1.2 |          142 |
| /checkbox                    |    2,068 |        2.0 |      1,899 |         2.3 |          287 |
| /chip-group                  |    2,589 |        2.5 |      2,367 |         2.7 |          175 |
| /choice-card                 |    2,289 |        2.2 |      2,104 |         2.5 |          271 |
| /combobox                    |   66,820 |       65.3 |     57,430 |          72 |        6,908 |
| /config                      |      175 |        0.2 |        177 |         0.2 |           29 |
| /container                   |      694 |        0.7 |        633 |         0.8 |          125 |
| /contracts                   |    1,021 |        1.0 |        915 |         1.1 |          105 |
| /data-view                   |      980 |        1.0 |        886 |         1.1 |          146 |
| /delta                       |    1,012 |        1.0 |        932 |         1.1 |          114 |
| /dialog                      |   32,660 |       31.9 |     29,019 |          32 |          108 |
| /drawer                      |   32,732 |       32.0 |     29,085 |          35 |        3,108 |
| /empty-state                 |      840 |        0.8 |        768 |           1 |          184 |
| /field                       |    3,629 |        3.5 |      3,302 |         3.9 |          364 |
| /fieldset                    |    1,714 |        1.7 |      1,558 |         1.9 |          231 |
| /file-upload                 |    5,690 |        5.6 |      5,194 |         6.1 |          556 |
| /form                        |    2,852 |        2.8 |      2,592 |           3 |          220 |
| /grid                        |      793 |        0.8 |        737 |         0.9 |          128 |
| /heading                     |      767 |        0.7 |        697 |         0.9 |          154 |
| /hotkeys                     |    1,572 |        1.5 |      1,422 |         1.7 |          168 |
| /i18n                        |      208 |        0.2 |        182 |         0.3 |           99 |
| /icon-button                 |   17,534 |       17.1 |     15,823 |          19 |        1,922 |
| /image                       |      794 |        0.8 |        723 |         0.9 |          127 |
| /inline                      |      703 |        0.7 |        639 |         0.8 |          116 |
| /inline-error                |    1,048 |        1.0 |        950 |         1.2 |          180 |
| /input                       |    1,837 |        1.8 |      1,662 |           2 |          211 |
| /kbd                         |    1,192 |        1.2 |      1,087 |         1.3 |          139 |
| /kpi-tile                    |    2,325 |        2.3 |      2,128 |         2.5 |          235 |
| /locales/en-US               |    1,668 |        1.6 |      1,416 |         1.8 |          175 |
| /menu                        |   57,165 |       55.8 |     49,386 |          57 |        1,203 |
| /meter                       |    1,143 |        1.1 |      1,058 |         1.3 |          188 |
| /metric                      |    2,144 |        2.1 |      1,965 |         2.4 |          313 |
| /mobile-tab-bar              |   33,344 |       32.6 |     29,660 |          36 |        3,520 |
| /mobile-top-bar              |      840 |        0.8 |        771 |           1 |          184 |
| /motion                      |    1,573 |        1.5 |      1,436 |         1.7 |          167 |
| /native-select               |    1,562 |        1.5 |      1,416 |         1.7 |          178 |
| /nav-item                    |    1,221 |        1.2 |      1,102 |         1.4 |          212 |
| /number-field                |   28,924 |       28.2 |     25,843 |          32 |        3,844 |
| /number-value                |      788 |        0.8 |        716 |         0.9 |          133 |
| /page-header                 |      890 |        0.9 |        814 |           1 |          134 |
| /page-indicator              |    1,147 |        1.1 |      1,043 |         1.3 |          184 |
| /pagination                  |    1,990 |        1.9 |      1,828 |           2 |           58 |
| /password-input              |    2,671 |        2.6 |      2,406 |         2.8 |          196 |
| /pointer-fx                  |    1,107 |        1.1 |      1,004 |         1.2 |          121 |
| /popover                     |   36,055 |       35.2 |     31,952 |          39 |        3,881 |
| /progress-bar                |    1,137 |        1.1 |      1,039 |         1.3 |          194 |
| /progress-ring               |    1,194 |        1.2 |      1,097 |         1.3 |          137 |
| /quantity-stepper            |    2,680 |        2.6 |      2,463 |         2.9 |          289 |
| /radio-group                 |    2,205 |        2.2 |      2,023 |         2.4 |          252 |
| /ranked-list                 |    2,474 |        2.4 |      2,276 |         2.7 |          290 |
| /search-field                |    3,418 |        3.3 |      3,101 |         3.6 |          268 |
| /segmented-control           |    2,371 |        2.3 |      2,172 |         2.6 |          291 |
| /select                      |   63,745 |       62.3 |     54,722 |          66 |        3,839 |
| /separator                   |      772 |        0.8 |        699 |         0.9 |          149 |
| /sidebar                     |   17,314 |       16.9 |     15,643 |          19 |        2,142 |
| /skeleton                    |      716 |        0.7 |        652 |         0.8 |          103 |
| /split                       |      880 |        0.9 |        804 |           1 |          144 |
| /stack                       |      703 |        0.7 |        640 |         0.8 |          116 |
| /sticky-bar                  |      799 |        0.8 |        729 |         0.9 |          122 |
| /surface                     |      714 |        0.7 |        645 |         0.8 |          105 |
| /switch                      |    1,734 |        1.7 |      1,579 |         1.9 |          211 |
| /tab-nav                     |    1,031 |        1.0 |        949 |         1.2 |          197 |
| /table                       |    1,659 |        1.6 |      1,505 |         1.8 |          184 |
| /table-selection             |    1,862 |        1.8 |      1,686 |         1.9 |           83 |
| /tabs                        |   33,683 |       32.9 |     29,840 |          35 |        2,157 |
| /text                        |      716 |        0.7 |        653 |         0.8 |          103 |
| /textarea                    |    1,368 |        1.3 |      1,251 |         1.5 |          168 |
| /theme-script                |      363 |        0.4 |        289 |         0.4 |           46 |
| /toast                       |   14,913 |       14.6 |     13,319 |          16 |        1,471 |
| /tooltip                     |   16,530 |       16.1 |     14,971 |          18 |        1,902 |
| /top-bar                     |      846 |        0.8 |        781 |           1 |          178 |
| /trend-card                  |    2,441 |        2.4 |      2,238 |         2.7 |          323 |
| /unstable/ai-badge           |    1,138 |        1.1 |      1,045 |         1.3 |          193 |
| /unstable/ai-welcome         |      876 |        0.9 |        805 |           1 |          148 |
| /unstable/approval-card      |    2,095 |        2.0 |      1,917 |         2.3 |          260 |
| /unstable/chat-message       |    1,340 |        1.3 |      1,230 |         1.5 |          196 |
| /unstable/citation           |      932 |        0.9 |        855 |         1.1 |          194 |
| /unstable/code-block         |   34,535 |       33.7 |     30,656 |          38 |        4,377 |
| /unstable/command-menu       |   35,184 |       34.4 |     31,408 |          64 |       30,352 |
| /unstable/comment            |    1,583 |        1.5 |      1,439 |         1.8 |          260 |
| /unstable/copy-button        |    1,449 |        1.4 |      1,329 |         1.6 |          189 |
| /unstable/date-range-picker  |   38,405 |       37.5 |     34,082 |          68 |       31,227 |
| /unstable/docs-card          |    1,068 |        1.0 |        972 |         1.2 |          160 |
| /unstable/event-card         |    1,304 |        1.3 |      1,186 |         1.4 |          129 |
| /unstable/feedback-bar       |   19,652 |       19.2 |     17,702 |        21.2 |        2,056 |
| /unstable/file-item          |    2,065 |        2.0 |      1,882 |         2.3 |          290 |
| /unstable/inline-assist      |    1,687 |        1.6 |      1,544 |         1.9 |          258 |
| /unstable/link               |    1,069 |        1.0 |        975 |         1.2 |          159 |
| /unstable/media-player       |    2,638 |        2.6 |      2,405 |         2.7 |          126 |
| /unstable/model-selector     |   63,787 |       62.3 |     54,715 |          69 |        6,869 |
| /unstable/notification-item  |      940 |        0.9 |        862 |         1.1 |          186 |
| /unstable/profile-card       |      985 |        1.0 |        901 |         1.1 |          141 |
| /unstable/prompt-composer    |    1,528 |        1.5 |      1,384 |         1.7 |          212 |
| /unstable/rating             |    1,549 |        1.5 |      1,394 |         1.7 |          191 |
| /unstable/response-block     |    2,309 |        2.3 |      2,072 |         2.5 |          251 |
| /unstable/slider             |    1,362 |        1.3 |      1,249 |         1.4 |           71 |
| /unstable/source-card        |    1,348 |        1.3 |      1,240 |         1.5 |          188 |
| /unstable/suggestion-chip    |    1,213 |        1.2 |      1,106 |         1.4 |          220 |
| /unstable/tag                |    1,320 |        1.3 |      1,223 |         1.5 |          216 |
| /unstable/thinking-indicator |      844 |        0.8 |        765 |           1 |          180 |
| /unstable/tool-call-card     |    1,638 |        1.6 |      1,492 |         1.8 |          205 |
| /unstable/usage-meter        |    1,873 |        1.8 |      1,743 |         2.1 |          277 |
| /unstable/voice-orb          |    1,889 |        1.8 |      1,718 |         2.1 |          261 |

#### `@nizivo/react`: Composite bundles (one bundle; React Aria counted once)

| Entry                              | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ---------------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| dashboard set                      |   78,934 |       77.1 |     66,735 |          85 |        8,106 |
| { Button } from the barrel         |    1,280 |        1.3 |      1,172 |         1.4 |          153 |
| { Select } from the barrel         |   63,690 |       62.2 |     54,713 |          68 |        5,942 |
| lazy: the DateRangePicker calendar |   39,816 |       38.9 |     34,877 |          43 |        4,216 |
| lazy: the CommandMenu search       |   44,989 |       43.9 |     39,070 |          49 |        5,187 |

#### `@nizivo/react`: Own code (one module minified alone, imports not counted)

| Entry                                                    | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------------------------------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| own: _engines/react-aria/combobox.client                 |    1,614 |        1.6 |      1,443 |         1.7 |          126 |
| own: _engines/react-aria/command-menu.client             |      616 |        0.6 |        540 |         0.7 |          100 |
| own: _engines/react-aria/date-range-picker.client        |      762 |        0.7 |        706 |         0.9 |          159 |
| own: _engines/react-aria/dialog.client                   |    1,084 |        1.1 |        967 |         1.3 |          247 |
| own: _engines/react-aria/drawer.client                   |      100 |        0.1 |         90 |         0.2 |          104 |
| own: _engines/react-aria/file-upload.client              |      369 |        0.4 |        332 |         0.4 |           40 |
| own: _engines/react-aria/locale.client                   |      162 |        0.2 |        142 |         0.2 |           42 |
| own: _engines/react-aria/menu.client                     |    1,823 |        1.8 |      1,612 |           2 |          225 |
| own: _engines/react-aria/number-field.client             |      712 |        0.7 |        645 |         0.8 |          107 |
| own: _engines/react-aria/open-state.client               |      341 |        0.3 |        305 |         0.4 |           68 |
| own: _engines/react-aria/outside-press.client            |      503 |        0.5 |        425 |         0.6 |          111 |
| own: _engines/react-aria/overlay.client                  |      556 |        0.5 |        476 |         0.6 |           58 |
| own: _engines/react-aria/popover.client                  |    1,211 |        1.2 |      1,086 |         1.3 |          120 |
| own: _engines/react-aria/popup.client                    |    1,230 |        1.2 |      1,077 |         1.3 |          101 |
| own: _engines/react-aria/select.client                   |    1,505 |        1.5 |      1,328 |         1.6 |          133 |
| own: _engines/react-aria/tabs.client                     |      769 |        0.8 |        702 |         0.9 |          152 |
| own: _engines/react-aria/toast.client                    |      325 |        0.3 |        296 |         0.4 |           84 |
| own: _engines/react-aria/tooltip.client                  |      724 |        0.7 |        656 |         0.8 |           95 |
| own: _internal/modal.client                              |      562 |        0.5 |        503 |         0.7 |          154 |
| own: alert/alert-dismiss.client                          |      423 |        0.4 |        368 |         0.5 |           89 |
| own: banner/banner-dismiss.client                        |      424 |        0.4 |        371 |         0.5 |           88 |
| own: checkbox/checkbox.client                            |      750 |        0.7 |        692 |         0.9 |          171 |
| own: chip-group/chip-group.client                        |    1,332 |        1.3 |      1,210 |         1.5 |          204 |
| own: choice-card/choice-card.client                      |    1,091 |        1.1 |        991 |         1.2 |          137 |
| own: combobox/combobox.client                            |    1,159 |        1.1 |      1,076 |         1.3 |          172 |
| own: config/config.client                                |      249 |        0.2 |        230 |         0.3 |           58 |
| own: dialog/dialog.client                                |    1,025 |        1.0 |        943 |         1.4 |          408 |
| own: drawer/drawer.client                                |    1,091 |        1.1 |      1,003 |         1.2 |          137 |
| own: field/field-scope.client                            |    1,523 |        1.5 |      1,348 |         1.6 |          115 |
| own: file-upload/file-upload.client                      |    3,136 |        3.1 |      2,870 |         3.4 |          345 |
| own: form/form.client                                    |    1,322 |        1.3 |      1,188 |         1.4 |          111 |
| own: form/submit-button.client                           |      228 |        0.2 |        191 |         0.3 |           79 |
| own: hotkeys/hotkeys.client                              |      748 |        0.7 |        687 |         0.9 |          173 |
| own: icon-button/icon-button.client                      |      353 |        0.3 |        304 |         0.4 |           56 |
| own: input/input.client                                  |      721 |        0.7 |        639 |         0.8 |           98 |
| own: menu/menu.client                                    |    1,035 |        1.0 |        932 |         1.2 |          193 |
| own: mobile-tab-bar/mobile-tab-bar-inset.client          |      370 |        0.4 |        316 |         0.4 |           39 |
| own: mobile-tab-bar/mobile-tab-bar-more.client           |      640 |        0.6 |        574 |         0.7 |           76 |
| own: motion/count-up.client                              |    1,032 |        1.0 |        945 |         1.2 |          196 |
| own: number-field/number-field.client                    |      957 |        0.9 |        900 |         1.1 |          169 |
| own: password-input/password-input.client                |    1,117 |        1.1 |        971 |         1.2 |          111 |
| own: pointer-fx/pointer-fx.client                        |      586 |        0.6 |        522 |         0.7 |          130 |
| own: popover/popover.client                              |      966 |        0.9 |        867 |         1.1 |          160 |
| own: quantity-stepper/quantity-stepper.client            |    1,307 |        1.3 |      1,185 |         1.4 |          126 |
| own: radio-group/radio-group.client                      |      614 |        0.6 |        541 |         0.7 |          102 |
| own: search-field/search-field.client                    |    1,297 |        1.3 |      1,160 |         1.4 |          136 |
| own: segmented-control/segmented-control.client          |    1,169 |        1.1 |      1,052 |         1.3 |          162 |
| own: select/select.client                                |    1,146 |        1.1 |      1,055 |         1.3 |          185 |
| own: sidebar/sidebar-item.client                         |      565 |        0.6 |        509 |         0.7 |          151 |
| own: switch/switch.client                                |      552 |        0.5 |        475 |         0.6 |           62 |
| own: table-selection/table-selection.client              |      896 |        0.9 |        776 |         0.9 |           25 |
| own: tabs/tabs.client                                    |      486 |        0.5 |        439 |         0.6 |          128 |
| own: textarea/textarea.client                            |      350 |        0.3 |        305 |         0.4 |           59 |
| own: toast/toaster.client                                |    2,114 |        2.1 |      1,907 |         2.2 |          138 |
| own: tooltip/tooltip.client                              |      519 |        0.5 |        460 |         0.6 |           95 |
| own: unstable/approval-card/approval-card.client         |      717 |        0.7 |        631 |         0.8 |          102 |
| own: unstable/code-block/code-block.client               |      633 |        0.6 |        570 |         0.7 |           83 |
| own: unstable/command-menu/command-menu.client           |    1,609 |        1.6 |      1,459 |         1.7 |          131 |
| own: unstable/copy-button/copy-button.client             |      611 |        0.6 |        546 |         0.7 |          105 |
| own: unstable/date-range-picker/date-range-picker.client |    2,552 |        2.5 |      2,361 |         2.5 |            8 |
| own: unstable/feedback-bar/feedback-bar.client           |      849 |        0.8 |        771 |           1 |          175 |
| own: unstable/inline-assist/inline-assist.client         |      819 |        0.8 |        723 |         0.9 |          102 |
| own: unstable/media-player/media-player.client           |    1,022 |        1.0 |        921 |         1.1 |          104 |
| own: unstable/model-selector/model-selector.client       |      764 |        0.7 |        696 |         0.8 |           55 |
| own: unstable/prompt-composer/prompt-composer.client     |      747 |        0.7 |        648 |         0.9 |          174 |
| own: unstable/slider/slider.client                       |      842 |        0.8 |        765 |           1 |          182 |

#### `@nizivo/react`: Seam helpers (seam ledger K6 and K7; React Aria external)

| Entry                                                  | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ------------------------------------------------------ | -------: | ---------: | ---------: | ----------: | -----------: |
| seam K6 (stateAttrs, details, EngineLocale, engineDom) |      757 |        0.7 |        664 |         0.9 |          164 |
| seam K7 (renderElement, toRenderFn, mergeProps)        |      678 |        0.7 |        617 |         0.8 |          141 |

#### `@nizivo/react`: CSS and JSON entries (the published file, gzip)

| Entry                       | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| --------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /css/accordion.css          |      530 |        0.5 |        437 |         0.7 |          186 |
| /css/ai-badge.css           |      418 |        0.4 |        341 |         0.5 |           94 |
| /css/ai-welcome.css         |      562 |        0.5 |        472 |         0.7 |          154 |
| /css/alert.css              |      636 |        0.6 |        522 |         0.8 |          183 |
| /css/app-shell.css          |      610 |        0.6 |        504 |         0.7 |          106 |
| /css/approval-card.css      |      508 |        0.5 |        403 |         0.6 |          106 |
| /css/avatar.css             |      745 |        0.7 |        606 |         0.9 |          176 |
| /css/badge.css              |      512 |        0.5 |        424 |         0.6 |          102 |
| /css/banner.css             |      658 |        0.6 |        533 |         0.8 |          161 |
| /css/base.css               |    1,522 |        1.5 |      1,298 |         1.6 |          116 |
| /css/breadcrumb.css         |      551 |        0.5 |        431 |         0.6 |           63 |
| /css/bulk-action-bar.css    |      400 |        0.4 |        325 |         0.5 |          112 |
| /css/button.css             |    1,153 |        1.1 |        974 |         1.3 |          178 |
| /css/card.css               |      665 |        0.6 |        560 |         0.7 |           51 |
| /css/chat-message.css       |      537 |        0.5 |        432 |         0.6 |           77 |
| /css/checkbox.css           |      834 |        0.8 |        687 |         0.9 |           87 |
| /css/chip-group.css         |      986 |        1.0 |        808 |         1.1 |          140 |
| /css/choice-card.css        |    1,005 |        1.0 |        851 |         1.1 |          121 |
| /css/citation.css           |      369 |        0.4 |        282 |         0.4 |           40 |
| /css/code-block.css         |      588 |        0.6 |        499 |         0.6 |           26 |
| /css/combobox.css           |    1,047 |        1.0 |        857 |         1.2 |          181 |
| /css/command-menu.css       |      875 |        0.9 |        708 |           1 |          149 |
| /css/comment.css            |      522 |        0.5 |        424 |         0.6 |           92 |
| /css/container.css          |      185 |        0.2 |        155 |         0.2 |           19 |
| /css/copy-button.css        |      336 |        0.3 |        280 |         0.4 |           73 |
| /css/data-view.css          |      570 |        0.6 |        449 |         0.7 |          146 |
| /css/date-range-picker.css  |    1,225 |        1.2 |      1,045 |         1.3 |          106 |
| /css/delta.css              |      472 |        0.5 |        383 |         0.5 |           40 |
| /css/dialog.css             |      944 |        0.9 |        787 |           1 |           80 |
| /css/docs-card.css          |      584 |        0.6 |        480 |         0.7 |          132 |
| /css/drawer.css             |    1,103 |        1.1 |        938 |         1.2 |          125 |
| /css/empty-state.css        |      476 |        0.5 |        373 |         0.6 |          138 |
| /css/event-card.css         |      539 |        0.5 |        440 |         0.6 |           75 |
| /css/feedback-bar.css       |      303 |        0.3 |        253 |         0.3 |            4 |
| /css/field.css              |      330 |        0.3 |        264 |         0.4 |           79 |
| /css/fieldset.css           |      362 |        0.4 |        293 |         0.4 |           47 |
| /css/file-item.css          |      683 |        0.7 |        581 |         0.8 |          136 |
| /css/file-upload.css        |    1,261 |        1.2 |      1,058 |         1.4 |          172 |
| /css/form.css               |      280 |        0.3 |        225 |         0.4 |          129 |
| /css/grid.css               |      531 |        0.5 |        423 |         0.6 |           83 |
| /css/heading.css            |      390 |        0.4 |        318 |         0.5 |          122 |
| /css/icon-button.css        |    1,004 |        1.0 |        852 |         1.1 |          122 |
| /css/image.css              |      243 |        0.2 |        191 |         0.3 |           64 |
| /css/inline-assist.css      |      547 |        0.5 |        440 |         0.6 |           67 |
| /css/inline-error.css       |      273 |        0.3 |        217 |         0.3 |           34 |
| /css/inline.css             |      274 |        0.3 |        219 |         0.3 |           33 |
| /css/input.css              |      844 |        0.8 |        710 |         0.9 |           77 |
| /css/kbd.css                |      377 |        0.4 |        303 |         0.5 |          135 |
| /css/kpi-tile.css           |      162 |        0.2 |        134 |         0.2 |           42 |
| /css/link.css               |      301 |        0.3 |        238 |         0.4 |          108 |
| /css/media-player.css       |      669 |        0.7 |        550 |         0.8 |          150 |
| /css/menu.css               |    1,050 |        1.0 |        867 |         1.2 |          178 |
| /css/meter.css              |      657 |        0.6 |        537 |         0.8 |          162 |
| /css/metric.css             |      732 |        0.7 |        629 |         0.8 |           87 |
| /css/mobile-tab-bar.css     |      987 |        1.0 |        813 |         1.1 |          139 |
| /css/mobile-top-bar.css     |      536 |        0.5 |        442 |         0.6 |           78 |
| /css/model-selector.css     |      479 |        0.5 |        402 |         0.6 |          135 |
| /css/motion.css             |      192 |        0.2 |        154 |         0.3 |          115 |
| /css/native-select.css      |      930 |        0.9 |        778 |           1 |           94 |
| /css/nav-item.css           |    1,004 |        1.0 |        834 |         1.1 |          122 |
| /css/notification-item.css  |      518 |        0.5 |        428 |         0.6 |           96 |
| /css/number-field.css       |      517 |        0.5 |        401 |         0.6 |           97 |
| /css/number-value.css       |      154 |        0.2 |        116 |         0.2 |           50 |
| /css/page-header.css        |      416 |        0.4 |        333 |         0.5 |           96 |
| /css/page-indicator.css     |      564 |        0.6 |        473 |         0.7 |          152 |
| /css/pagination.css         |      816 |        0.8 |        674 |         0.9 |          105 |
| /css/password-input.css     |      486 |        0.5 |        386 |         0.6 |          128 |
| /css/pointer-fx.css         |      299 |        0.3 |        245 |         0.4 |          110 |
| /css/popover.css            |      711 |        0.7 |        567 |         0.8 |          108 |
| /css/profile-card.css       |      752 |        0.7 |        631 |         0.8 |           67 |
| /css/progress-bar.css       |      800 |        0.8 |        664 |         0.9 |          121 |
| /css/progress-ring.css      |      509 |        0.5 |        432 |         0.6 |          105 |
| /css/prompt-composer.css    |      745 |        0.7 |        592 |         0.9 |          176 |
| /css/quantity-stepper.css   |      611 |        0.6 |        498 |         0.6 |            3 |
| /css/radio-group.css        |      824 |        0.8 |        678 |         0.9 |           97 |
| /css/ranked-list.css        |      825 |        0.8 |        677 |         0.9 |           96 |
| /css/rating.css             |      333 |        0.3 |        266 |         0.4 |           76 |
| /css/response-block.css     |      819 |        0.8 |        686 |         0.9 |          102 |
| /css/search-field.css       |    1,087 |        1.1 |        934 |         1.2 |          141 |
| /css/segmented-control.css  |      986 |        1.0 |        808 |         1.1 |          140 |
| /css/select.css             |    1,237 |        1.2 |      1,040 |         1.4 |          196 |
| /css/separator.css          |      261 |        0.3 |        203 |         0.3 |           46 |
| /css/sidebar.css            |      928 |        0.9 |        753 |           1 |           96 |
| /css/skeleton.css           |      365 |        0.4 |        325 |         0.4 |           44 |
| /css/slider.css             |      681 |        0.7 |        571 |         0.8 |          138 |
| /css/source-card.css        |      563 |        0.5 |        461 |         0.7 |          153 |
| /css/split.css              |      249 |        0.2 |        226 |         0.3 |           58 |
| /css/stack.css              |      270 |        0.3 |        209 |         0.3 |           37 |
| /css/sticky-bar.css         |      479 |        0.5 |        399 |         0.5 |           33 |
| /css/suggestion-chip.css    |      468 |        0.5 |        373 |         0.6 |          146 |
| /css/surface.css            |      384 |        0.4 |        313 |         0.5 |          128 |
| /css/switch.css             |      883 |        0.9 |        738 |           1 |          141 |
| /css/tab-nav.css            |      842 |        0.8 |        690 |           1 |          182 |
| /css/table-selection.css    |      122 |        0.1 |         88 |         0.2 |           82 |
| /css/table.css              |    1,093 |        1.1 |        890 |         1.1 |           33 |
| /css/tabs.css               |      972 |        0.9 |        792 |         1.1 |          154 |
| /css/tag.css                |      656 |        0.6 |        533 |         0.8 |          163 |
| /css/text.css               |      574 |        0.6 |        489 |         0.7 |          142 |
| /css/textarea.css           |      751 |        0.7 |        624 |         0.8 |           68 |
| /css/thinking-indicator.css |      472 |        0.5 |        408 |         0.6 |          142 |
| /css/toast.css              |      918 |        0.9 |        767 |           1 |          106 |
| /css/tool-call-card.css     |      913 |        0.9 |        794 |           1 |          111 |
| /css/tooltip.css            |      581 |        0.6 |        503 |         0.6 |           33 |
| /css/top-bar.css            |      452 |        0.4 |        379 |         0.5 |           60 |
| /css/trend-card.css         |      403 |        0.4 |        346 |         0.5 |          109 |
| /css/usage-meter.css        |      443 |        0.4 |        356 |         0.5 |           69 |
| /css/voice-orb.css          |      955 |        0.9 |        825 |         1.1 |          171 |
| /styles.css                 |   26,040 |       25.4 |     20,921 |          26 |          584 |

#### `@nizivo/tokens`: Public JS entries (bundled with what they import, React Aria included)

| Entry | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----- | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`   |    2,370 |        2.3 |      2,047 |         2.5 |          190 |

#### `@nizivo/tokens`: CSS and JSON entries (the published file, gzip)

| Entry             | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /contract.json    |    3,304 |        3.2 |      2,692 |         3.5 |          280 |
| /custom-media.css |      166 |        0.2 |        126 |         0.2 |           38 |
| /tailwind.css     |      811 |        0.8 |        711 |         0.9 |          110 |
| /tokens.css       |    3,949 |        3.9 |      3,273 |         4.2 |          351 |
| /tokens.json      |   10,360 |       10.1 |      8,236 |          12 |        1,928 |

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

#### `@nizivo/charts`: Public JS entries (bundled with what they import, React Aria included)

| Entry          | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`            |   10,372 |       10.1 |      9,397 |        11.2 |        1,096 |
| /area-chart    |    6,724 |        6.6 |      6,078 |         7.1 |          546 |
| /bar-chart     |    5,418 |        5.3 |      4,885 |         5.7 |          418 |
| /chart-frame   |    1,828 |        1.8 |      1,638 |           2 |          220 |
| /chart-tooltip |      413 |        0.4 |        373 |         0.5 |           99 |
| /donut-chart   |    4,894 |        4.8 |      4,397 |         5.3 |          533 |
| /funnel-chart  |    2,583 |        2.5 |      2,344 |         2.8 |          284 |
| /heatmap       |    2,579 |        2.5 |      2,344 |         2.8 |          288 |
| /legend        |      870 |        0.8 |        796 |           1 |          154 |
| /sparkline     |    1,618 |        1.6 |      1,526 |         1.8 |          225 |

#### `@nizivo/charts`: Composite bundles (one bundle; React Aria counted once)

| Entry                         | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| { AreaChart } from the barrel |    6,719 |        6.6 |      6,078 |         7.1 |          551 |
| island with its imports       |    1,580 |        1.5 |      1,420 |         1.7 |          160 |

#### `@nizivo/charts`: CSS and JSON entries (the published file, gzip)

| Entry       | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /styles.css |    4,349 |        4.2 |      3,860 |         4.7 |          463 |

<!-- size:tables:end -->

## Regression check (W5)

On the built tree, with a scratch copy of each file kept and restored byte for byte (`cmp`) afterwards:

- 2,068 B of random base64 appended to `dist/button/button.js` as a top-level statement (+1,770 B gzip; an unused `export` would be tree-shaken and measure nothing): `pnpm --filter @nizivo/react size` exits 1 and names `@nizivo/react/button` and `{ Button } from the barrel` (3.15 kB against 1.54 kB). Restored: exit 0.
- The same pad in `dist/_engines/react-aria/select.client.js`: the Select subpath, the dashboard set and `{ Select }` from the barrel all pass (+1.7 KB is inside their +10%), and the own-code check `own: _engines/react-aria/select.client` fails (3.02 kB against 1.43 kB). Restored: exit 0.

## Not measured

- Runtime performance (Vitest `bench`, §17.3): not part of W5.
- Tarball sizes: `pnpm check:release` packs the three packages; the W4 figures are in W4-RESULTS.md.
- A PR comment with the size diff (§17.3): Actions is off; `measure.ts` prints measured against recorded locally.
