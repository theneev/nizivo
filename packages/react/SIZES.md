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

| Entry              | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ------------------ | -------: | ---------: | ---------: | ----------: | -----------: |
| `.`                |  100,924 |       98.6 |     84,320 |         107 |        8,644 |
| /alert             |    1,283 |        1.3 |      1,182 |         1.4 |          150 |
| /augment           |        0 |        0.0 |          0 |           0 |            — |
| /avatar            |    1,381 |        1.3 |      1,283 |         1.5 |          155 |
| /badge             |      796 |        0.8 |        727 |         0.9 |          125 |
| /banner            |    1,314 |        1.3 |      1,209 |         1.5 |          222 |
| /breadcrumb        |    1,291 |        1.3 |      1,190 |         1.4 |          142 |
| /button            |    1,276 |        1.2 |      1,176 |         1.4 |          157 |
| /card              |    1,086 |        1.1 |        971 |         1.2 |          142 |
| /checkbox          |    2,065 |        2.0 |      1,907 |         2.3 |          290 |
| /config            |      165 |        0.2 |        152 |         0.2 |           39 |
| /container         |      694 |        0.7 |        633 |         0.8 |          125 |
| /contracts         |    1,021 |        1.0 |        915 |         1.1 |          105 |
| /delta             |    1,012 |        1.0 |        932 |         1.1 |          114 |
| /dialog            |   32,622 |       31.9 |     28,960 |          32 |          146 |
| /drawer            |   32,703 |       31.9 |     29,034 |          35 |        3,137 |
| /empty-state       |      840 |        0.8 |        768 |           1 |          184 |
| /field             |    3,603 |        3.5 |      3,278 |         3.9 |          390 |
| /fieldset          |    1,715 |        1.7 |      1,564 |         1.9 |          230 |
| /grid              |      793 |        0.8 |        737 |         0.9 |          128 |
| /heading           |      767 |        0.7 |        697 |         0.9 |          154 |
| /icon-button       |   17,528 |       17.1 |     15,819 |          19 |        1,928 |
| /image             |      794 |        0.8 |        723 |         0.9 |          127 |
| /inline            |      703 |        0.7 |        639 |         0.8 |          116 |
| /inline-error      |    1,046 |        1.0 |        953 |         1.2 |          182 |
| /input             |    1,833 |        1.8 |      1,658 |           2 |          215 |
| /kbd               |    1,192 |        1.2 |      1,087 |         1.3 |          139 |
| /kpi-tile          |    2,324 |        2.3 |      2,115 |         2.5 |          236 |
| /menu              |   57,165 |       55.8 |     49,433 |          57 |        1,203 |
| /meter             |    1,143 |        1.1 |      1,058 |         1.3 |          188 |
| /metric            |    2,143 |        2.1 |      1,949 |         2.4 |          314 |
| /motion            |    1,573 |        1.5 |      1,436 |         1.7 |          167 |
| /native-select     |    1,560 |        1.5 |      1,411 |         1.7 |          180 |
| /number-value      |      788 |        0.8 |        716 |         0.9 |          133 |
| /page-header       |      890 |        0.9 |        814 |           1 |          134 |
| /pagination        |    1,823 |        1.8 |      1,676 |           2 |          225 |
| /popover           |   36,008 |       35.2 |     31,948 |          39 |        3,928 |
| /progress-bar      |    1,137 |        1.1 |      1,039 |         1.3 |          194 |
| /progress-ring     |    1,194 |        1.2 |      1,097 |         1.3 |          137 |
| /radio-group       |    2,200 |        2.1 |      2,029 |         2.4 |          257 |
| /ranked-list       |    2,475 |        2.4 |      2,286 |         2.7 |          289 |
| /segmented-control |    2,368 |        2.3 |      2,160 |         2.6 |          294 |
| /select            |   63,728 |       62.2 |     54,791 |          66 |        3,856 |
| /separator         |      772 |        0.8 |        699 |         0.9 |          149 |
| /skeleton          |      716 |        0.7 |        652 |         0.8 |          103 |
| /stack             |      703 |        0.7 |        640 |         0.8 |          116 |
| /switch            |    1,730 |        1.7 |      1,575 |         1.9 |          215 |
| /tab-nav           |    1,031 |        1.0 |        949 |         1.2 |          197 |
| /table             |    1,661 |        1.6 |      1,505 |         1.8 |          182 |
| /tabs              |   33,683 |       32.9 |     29,840 |          35 |        2,157 |
| /text              |      716 |        0.7 |        653 |         0.8 |          103 |
| /textarea          |    1,364 |        1.3 |      1,247 |         1.5 |          172 |
| /theme-script      |      363 |        0.4 |        289 |         0.4 |           46 |
| /toast             |   14,846 |       14.5 |     13,274 |          16 |        1,538 |
| /tooltip           |   16,529 |       16.1 |     14,977 |          18 |        1,903 |
| /trend-card        |    2,443 |        2.4 |      2,228 |         2.7 |          321 |

#### `@nizivo/react`: Composite bundles (one bundle; React Aria counted once)

| Entry                      | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| dashboard set              |   78,886 |       77.0 |     66,602 |          85 |        8,154 |
| { Button } from the barrel |    1,277 |        1.2 |      1,169 |         1.4 |          156 |
| { Select } from the barrel |   63,663 |       62.2 |     54,684 |          68 |        5,969 |

#### `@nizivo/react`: Own code (one module minified alone, imports not counted)

| Entry                                           | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------------------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| own: _engines/react-aria/dialog.client          |    1,082 |        1.1 |        963 |         1.3 |          249 |
| own: _engines/react-aria/drawer.client          |      100 |        0.1 |         90 |         0.2 |          104 |
| own: _engines/react-aria/locale.client          |      162 |        0.2 |        142 |         0.2 |           42 |
| own: _engines/react-aria/menu.client            |    1,824 |        1.8 |      1,613 |           2 |          224 |
| own: _engines/react-aria/open-state.client      |      341 |        0.3 |        305 |         0.4 |           68 |
| own: _engines/react-aria/outside-press.client   |      503 |        0.5 |        425 |         0.6 |          111 |
| own: _engines/react-aria/overlay.client         |      556 |        0.5 |        476 |         0.6 |           58 |
| own: _engines/react-aria/popover.client         |    1,210 |        1.2 |      1,087 |         1.3 |          121 |
| own: _engines/react-aria/popup.client           |    1,230 |        1.2 |      1,077 |         1.3 |          101 |
| own: _engines/react-aria/select.client          |    1,505 |        1.5 |      1,327 |         1.6 |          133 |
| own: _engines/react-aria/tabs.client            |      769 |        0.8 |        702 |         0.9 |          152 |
| own: _engines/react-aria/toast.client           |      325 |        0.3 |        296 |         0.4 |           84 |
| own: _engines/react-aria/tooltip.client         |      723 |        0.7 |        660 |         0.8 |           96 |
| own: _internal/modal.client                     |      562 |        0.5 |        503 |         0.7 |          154 |
| own: alert/alert-dismiss.client                 |      394 |        0.4 |        346 |         0.4 |           15 |
| own: banner/banner-dismiss.client               |      395 |        0.4 |        347 |         0.5 |          117 |
| own: checkbox/checkbox.client                   |      750 |        0.7 |        692 |         0.9 |          171 |
| own: config/config.client                       |      197 |        0.2 |        179 |         0.3 |          110 |
| own: dialog/dialog.client                       |      997 |        1.0 |        911 |         1.4 |          436 |
| own: drawer/drawer.client                       |    1,064 |        1.0 |        973 |         1.2 |          164 |
| own: field/field-scope.client                   |    1,496 |        1.5 |      1,315 |         1.6 |          142 |
| own: icon-button/icon-button.client             |      353 |        0.3 |        302 |         0.4 |           56 |
| own: input/input.client                         |      721 |        0.7 |        639 |         0.8 |           98 |
| own: menu/menu.client                           |    1,035 |        1.0 |        932 |         1.2 |          193 |
| own: motion/count-up.client                     |    1,032 |        1.0 |        945 |         1.2 |          196 |
| own: popover/popover.client                     |      933 |        0.9 |        838 |         1.1 |          193 |
| own: radio-group/radio-group.client             |      614 |        0.6 |        541 |         0.7 |          102 |
| own: segmented-control/segmented-control.client |    1,169 |        1.1 |      1,052 |         1.3 |          162 |
| own: select/select.client                       |    1,146 |        1.1 |      1,055 |         1.3 |          185 |
| own: switch/switch.client                       |      552 |        0.5 |        475 |         0.6 |           62 |
| own: tabs/tabs.client                           |      486 |        0.5 |        439 |         0.6 |          128 |
| own: textarea/textarea.client                   |      350 |        0.3 |        305 |         0.4 |           59 |
| own: toast/toaster.client                       |    2,092 |        2.0 |      1,885 |         2.2 |          160 |
| own: tooltip/tooltip.client                     |      519 |        0.5 |        460 |         0.6 |           95 |

#### `@nizivo/react`: Seam helpers (seam ledger K6 and K7; React Aria external)

| Entry                                                  | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ------------------------------------------------------ | -------: | ---------: | ---------: | ----------: | -----------: |
| seam K6 (stateAttrs, details, EngineLocale, engineDom) |      757 |        0.7 |        664 |         0.9 |          164 |
| seam K7 (renderElement, toRenderFn, mergeProps)        |      678 |        0.7 |        617 |         0.8 |          141 |

#### `@nizivo/react`: CSS and JSON entries (the published file, gzip)

| Entry                      | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| -------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /css/alert.css             |      636 |        0.6 |        522 |         0.8 |          183 |
| /css/avatar.css            |      745 |        0.7 |        606 |         0.9 |          176 |
| /css/badge.css             |      512 |        0.5 |        424 |         0.6 |          102 |
| /css/banner.css            |      658 |        0.6 |        533 |         0.8 |          161 |
| /css/base.css              |    1,106 |        1.1 |        929 |         1.1 |           20 |
| /css/breadcrumb.css        |      551 |        0.5 |        431 |         0.6 |           63 |
| /css/button.css            |    1,153 |        1.1 |        974 |         1.3 |          178 |
| /css/card.css              |      665 |        0.6 |        560 |         0.7 |           51 |
| /css/checkbox.css          |      834 |        0.8 |        687 |         0.9 |           87 |
| /css/container.css         |      185 |        0.2 |        155 |         0.2 |           19 |
| /css/delta.css             |      472 |        0.5 |        383 |         0.5 |           40 |
| /css/dialog.css            |      944 |        0.9 |        787 |           1 |           80 |
| /css/drawer.css            |    1,103 |        1.1 |        938 |         1.2 |          125 |
| /css/empty-state.css       |      476 |        0.5 |        373 |         0.6 |          138 |
| /css/field.css             |      330 |        0.3 |        264 |         0.4 |           79 |
| /css/fieldset.css          |      362 |        0.4 |        293 |         0.4 |           47 |
| /css/grid.css              |      531 |        0.5 |        423 |         0.6 |           83 |
| /css/heading.css           |      390 |        0.4 |        318 |         0.5 |          122 |
| /css/icon-button.css       |    1,004 |        1.0 |        852 |         1.1 |          122 |
| /css/image.css             |      243 |        0.2 |        191 |         0.3 |           64 |
| /css/inline-error.css      |      273 |        0.3 |        217 |         0.3 |           34 |
| /css/inline.css            |      274 |        0.3 |        219 |         0.3 |           33 |
| /css/input.css             |      844 |        0.8 |        710 |         0.9 |           77 |
| /css/kbd.css               |      377 |        0.4 |        303 |         0.5 |          135 |
| /css/kpi-tile.css          |      162 |        0.2 |        134 |         0.2 |           42 |
| /css/menu.css              |    1,050 |        1.0 |        867 |         1.2 |          178 |
| /css/meter.css             |      657 |        0.6 |        537 |         0.8 |          162 |
| /css/metric.css            |      732 |        0.7 |        629 |         0.8 |           87 |
| /css/motion.css            |      192 |        0.2 |        154 |         0.3 |          115 |
| /css/native-select.css     |      930 |        0.9 |        778 |           1 |           94 |
| /css/number-value.css      |      154 |        0.2 |        116 |         0.2 |           50 |
| /css/page-header.css       |      416 |        0.4 |        333 |         0.5 |           96 |
| /css/pagination.css        |      789 |        0.8 |        656 |         0.9 |          132 |
| /css/popover.css           |      711 |        0.7 |        567 |         0.8 |          108 |
| /css/progress-bar.css      |      800 |        0.8 |        664 |         0.9 |          121 |
| /css/progress-ring.css     |      509 |        0.5 |        432 |         0.6 |          105 |
| /css/radio-group.css       |      824 |        0.8 |        678 |         0.9 |           97 |
| /css/ranked-list.css       |      825 |        0.8 |        677 |         0.9 |           96 |
| /css/segmented-control.css |      986 |        1.0 |        808 |         1.1 |          140 |
| /css/select.css            |    1,237 |        1.2 |      1,040 |         1.4 |          196 |
| /css/separator.css         |      261 |        0.3 |        203 |         0.3 |           46 |
| /css/skeleton.css          |      365 |        0.4 |        325 |         0.4 |           44 |
| /css/stack.css             |      270 |        0.3 |        209 |         0.3 |           37 |
| /css/switch.css            |      883 |        0.9 |        738 |           1 |          141 |
| /css/tab-nav.css           |      842 |        0.8 |        690 |           1 |          182 |
| /css/table.css             |    1,042 |        1.0 |        842 |         1.1 |           84 |
| /css/tabs.css              |      972 |        0.9 |        792 |         1.1 |          154 |
| /css/text.css              |      574 |        0.6 |        489 |         0.7 |          142 |
| /css/textarea.css          |      751 |        0.7 |        624 |         0.8 |           68 |
| /css/toast.css             |      891 |        0.9 |        740 |           1 |          133 |
| /css/tooltip.css           |      581 |        0.6 |        503 |         0.6 |           33 |
| /css/trend-card.css        |      403 |        0.4 |        346 |         0.5 |          109 |
| /styles.css                |   19,355 |       18.9 |     16,211 |          19 |          101 |

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
| /tokens.css       |    3,949 |        3.9 |      3,254 |         4.2 |          351 |
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
| `.`            |    9,296 |        9.1 |      8,381 |         9.7 |          636 |
| /area-chart    |    6,711 |        6.6 |      6,082 |         7.1 |          559 |
| /bar-chart     |    5,407 |        5.3 |      4,875 |         5.7 |          429 |
| /chart-frame   |    1,820 |        1.8 |      1,629 |           2 |          228 |
| /chart-tooltip |      413 |        0.4 |        373 |         0.5 |           99 |
| /donut-chart   |    4,885 |        4.8 |      4,390 |         5.3 |          542 |
| /legend        |      870 |        0.8 |        796 |           1 |          154 |
| /sparkline     |    1,618 |        1.6 |      1,526 |         1.8 |          225 |

#### `@nizivo/charts`: Composite bundles (one bundle; React Aria counted once)

| Entry                         | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------------------------- | -------: | ---------: | ---------: | ----------: | -----------: |
| { AreaChart } from the barrel |    6,709 |        6.6 |      6,074 |         7.1 |          561 |
| island with its imports       |    1,580 |        1.5 |      1,420 |         1.7 |          160 |

#### `@nizivo/charts`: CSS and JSON entries (the published file, gzip)

| Entry       | gzip (B) | gzip (KiB) | brotli (B) | Limit (KiB) | Headroom (B) |
| ----------- | -------: | ---------: | ---------: | ----------: | -----------: |
| /styles.css |    3,506 |        3.4 |      3,101 |         3.7 |          282 |

<!-- size:tables:end -->

## Regression check (W5)

On the built tree, with a scratch copy of each file kept and restored byte for byte (`cmp`) afterwards:

- 2,068 B of random base64 appended to `dist/button/button.js` as a top-level statement (+1,770 B gzip; an unused `export` would be tree-shaken and measure nothing): `pnpm --filter @nizivo/react size` exits 1 and names `@nizivo/react/button` and `{ Button } from the barrel` (3.15 kB against 1.54 kB). Restored: exit 0.
- The same pad in `dist/_engines/react-aria/select.client.js`: the Select subpath, the dashboard set and `{ Select }` from the barrel all pass (+1.7 KB is inside their +10%), and the own-code check `own: _engines/react-aria/select.client` fails (3.02 kB against 1.43 kB). Restored: exit 0.

## Not measured

- Runtime performance (Vitest `bench`, §17.3): not part of W5.
- Tarball sizes: `pnpm check:release` packs the three packages; the W4 figures are in W4-RESULTS.md.
- A PR comment with the size diff (§17.3): Actions is off; `measure.ts` prints measured against recorded locally.
