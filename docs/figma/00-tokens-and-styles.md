# Grove UI — Figma token & style snapshot (read 2026-10-14)

File: https://www.figma.com/design/BIzJFf1wm8KP0YG2AVI1tP/Grove-UI-Library
Product will ship as **Nizivo UI** (`@nizivo/*`); every `grove` prefix below must become configurable (e.g. `--nz-`).

## File hygiene facts
- Pages: Cover, 01 Foundations (7275:11884), 02 Actions & Forms (7275:11238), 03 Data Visualization (7275:13284), 04 Dashboard Widgets (7275:13737), 05 Commerce (7275:13983), 06 Navigation (7275:14694), 07 Feedback & Overlays (7275:15065), 08 Overview Dashboard (7275:15335 — sections: Overview Dashboard 7275:15336, Patterns 7275:15756, Responsive 7275:18740), 09 3D, Shader & Motion Lab (7275:19608, section labelled "11"), 10 Instagram Storefront (7275:19790, section labelled "12").
- Non-Grove leftovers in the same file: variable collections Clario, Pipkin, Pipkin Soft, Merit, Ashgrove, Noema, Praxa, Pogo, Halden, Ardenfield (+ ~130 text styles with those prefixes). NOT part of the design system.
- 0 paint styles. Colors are variables only. Subscribed community libraries: Material 3, Simple Design System, iOS/iPadOS 26/27, watchOS 26, visionOS 26, macOS 26/27 (unused by Grove as far as known).
- Variables already carry WEB codeSyntax: `var(--grove-…)`; primitives use `--grove-p-…`.

## Variable collections (Grove only)
Format: name | type (C=color, F=float, S=string) | value or [mode values] ; `{x}` = alias to primitive x.

### Grove Primitives (mode: Value) — 54 vars, codeSyntax `--grove-p-<group>-<step>`
green: 25 #f4f8f5, 50 #e9f3ec, 100 #d3e8da, 200 #aad3b9, 300 #79b993, 400 #4c9e71, 500 #2e8358, 600 #216c47, 700 #1a573a, 800 #15452f, 900 #103324, 950 #0a211a
lime: 50 #f6fae8, 100 #ecf5cb, 200 #dcec9c, 300 #c6e06a, 400 #afd146, 500 #8db22b, 600 #6b8a1e
neutral: 0 #ffffff, 25 #fbfbf9, 50 #f6f7f4, 100 #eef0ec, 200 #e2e5df, 300 #cbd0c8, 400 #9ea59c, 500 #747c73, 600 #596058, 700 #414741, 800 #2b302c, 850 #202421, 900 #181b19, 950 #101311
red: 50 #fdf1ee, 100 #faddd6, 500 #d6492f, 600 #b93a23, 700 #8f2c1a
amber: 50 #fdf6e6, 100 #fae8bf, 500 #d99a1b, 600 #b07b0e, 700 #7c560a
blue: 50 #eef3fc, 100 #d8e4f8, 500 #3d6fd1, 600 #2e58b0, 700 #22427f
viz: green-500 #138a55, green-600 #1a7d4e, lime-500 #8fbf2f, lime-600 #88a02a, teal-500 #1689a8, teal-400 #3e9fc4

### Grove Color (modes: Light, Dark) — 58 semantic vars, codeSyntax `--grove-<group>-<name>`
bg/canvas [neutral/50, neutral/950]; bg/surface [neutral/0, neutral/900]; bg/surface-raised [neutral/0, neutral/850]; bg/subtle [neutral/25, neutral/900]; bg/muted [neutral/100, neutral/800]; bg/hover [neutral/50, neutral/800]; bg/pressed [neutral/100, neutral/700]; bg/inverse [neutral/900, neutral/0]; bg/inverse-elevated [neutral/850, neutral/100]; bg/brand [green/700, green/400]; bg/brand-hover [green/800, green/300]; bg/brand-pressed [green/900, green/200]; bg/brand-subtle [green/50, green/950]; bg/brand-muted [green/100, green/900]; bg/accent [lime/300, lime/400]; bg/accent-subtle [lime/50, green/950]; bg/success-subtle [green/50, green/950]; bg/warning-subtle [amber/50, neutral/850]; bg/critical-subtle [red/50, neutral/850]; bg/info-subtle [blue/50, neutral/850]; bg/critical [red/600, red/500]; bg/disabled [neutral/100, neutral/800]
text/primary [neutral/900, neutral/50]; text/secondary [neutral/600, neutral/400]; text/tertiary neutral/500; text/disabled [neutral/400, neutral/600]; text/inverse [neutral/0, neutral/900]; text/on-brand [neutral/0, green/950]; text/on-accent green/950; text/brand [green/700, green/300]; text/success [green/600, green/300]; text/warning [amber/700, amber/500]; text/critical [red/600, red/500]; text/info [blue/600, blue/500]
border/default [neutral/200, neutral/800]; border/subtle [neutral/100, neutral/850]; border/strong [neutral/300, neutral/700]; border/brand [green/600, green/400]; border/focus [green/500, green/300]; border/critical red/500; border/warning amber/500
icon/primary [neutral/800, neutral/100]; icon/secondary [neutral/500, neutral/400]; icon/brand [green/600, green/300]; icon/inverse [neutral/0, neutral/900]; icon/success [green/500, green/300]; icon/warning amber/500; icon/critical red/500
chart/primary [green/600, green/400]; chart/secondary [green/200, green/800]; chart/tertiary lime/400; chart/neutral [neutral/300, neutral/700]; chart/track [neutral/100, neutral/800]; chart/grid [neutral/100, neutral/850]; chart/negative red/500
chart/cat-1 [viz/green-500, viz/green-600]; chart/cat-2 [viz/lime-500, viz/lime-600]; chart/cat-3 [viz/teal-500, viz/teal-400] — description: "Validated categorical slot (CVD ΔE≥14, light+dark). Fixed order, never cycled; 4th+ series fold into chart/neutral 'Other'."
Notable gaps: no info/success solid bg, no border/info, no icon/info, no overlay/scrim token, no warning solid bg.

### Grove Space (mode: Value) — 33 vars (all px floats)
space: 0 0, 0-5 2, 1 4, 1-5 6, 2 8, 3 12, 4 16, 5 20, 6 24, 8 32, 10 40, 12 48, 16 64, 20 80, 24 96
radius: none 0, xs 4, sm 8, md 12, lg 16, xl 20, 2xl 28, full 999
border-width: default 1, strong 1.5, focus 2
size: control-sm 32, control-md 40, control-lg 48, icon-sm 16, icon-md 20, icon-lg 24, touch-min 44

### Grove Motion (modes: Default, Reduced) — 20 vars
duration (ms): instant [80,0], fast [140,0], base [220,120], slow [320,120], slower [480,160], count-up [900,0], chart-draw [700,0]
easing: standard [cubic-bezier(0.2,0,0,1), linear], enter [cubic-bezier(0,0,0,1), linear], exit [cubic-bezier(0.3,0,1,1), linear], spring ["spring(1, 260, 24, 0)", linear], spring-soft ["spring(1, 170, 26, 0)", linear]  ← spring() is not valid CSS; needs linear() approximation or JS
distance (px): lift [4,0], reveal [12,0], float [8,0]; tilt/max-deg [6,0]; scale/press [0.98,1]; scale/hover [1.02,1]; stagger/item [40,0]; magnetic/pull [6,0]

### Grove Responsive (modes: Desktop, Tablet, Mobile) — 10 vars
grid/columns [12,8,4]; grid/gutter [24,20,16]; grid/margin [32,24,16]; layout/viewport [1440,1024,390]; layout/sidebar [264,72,0]; layout/content-max [1280,976,358]; type/display [56,44,36]; type/h1 [32,28,24]; type/kpi [32,28,28]; section/gap [32,24,20]
(No breakpoint min-width values defined — viewport widths are frame sizes, not breakpoints.)

## Text styles (Grove/*) — font family Geist / Geist Mono; no variable bindings on text styles
Display/L Geist SemiBold 56 / 104% / -3%
Display/M Geist SemiBold 44 / 108% / -2.5%
Heading/H1 SemiBold 32 / 120% / -2%
Heading/H2 SemiBold 24 / 130% / -1.5%
Heading/H3 SemiBold 20 / 140% / -1%
Heading/H4 SemiBold 16 / 150% / -0.5%
Body/L Regular 16 / 160% / 0
Body/M Regular 14 / 150% / 0
Body/M Strong Medium 14 / 150% / 0
Label/L Medium 16 / 140% / -0.2%
Label/M Medium 14 / 140% / 0
Label/M Strong SemiBold 14 / 140% / 0
Numeric/Display SemiBold 40 / 100% / -3%  (desc: tabular-nums; animate with count-up, duration/count-up)
Numeric/KPI SemiBold 32 / 100% / -2.5% (same desc)
Numeric/L SemiBold 24 / 110% / -1.5% (same desc)
Numeric/M Medium 16 / 120% / -0.5% (same desc)
Mono/M Geist Mono Regular 14 / 140% / 0
Mono/M Strong Geist Mono Medium 14 / 140% / 0
Note: no 12px caption/overline style; responsive type vars (type/display, type/h1, type/kpi) exist but text styles are not bound to them.

## Effect styles (Grove/*) — colors are hard-coded (not bound to variables), shadow tint = neutral/950 #101311
Elevation/0 Flat: none
Elevation/1 Card: 0 1 2 0 #1013110a, 0 1 1 0 #10131108
Elevation/2 Raised: 0 2 4 0 #1013110a, 0 8 16 -4 #1013110d
Elevation/3 Popover: 0 4 8 0 #1013110d, 0 16 32 -8 #10131114
Elevation/4 Modal: 0 8 16 0 #1013110f, 0 32 64 -12 #10131124
Focus/Ring: 0 0 0 4 #2e825847 (green/500 @ ~28%)
Focus/Ring Critical: 0 0 0 4 #d64a2e40 (red/500 @ 25%)
Surface/Glass: background-blur 24 + 0 16 40 -8 #1013111a
Surface/Liquid Glass: GLASS effect blur 12 (Figma-native; no direct CSS equivalent)
Surface/Inner Highlight: inset 0 1 0 0 #ffffffb2
Note: no dark-mode variants of elevation (dark shadows usually need different treatment).

## Component sets by page (name [node id] variant count)
02 Actions & Forms: Button [7275:11244] 27, Icon Button [7275:11357] 6, Badge [7275:11374] 6, Input [7275:11397] 6, Select [7275:11438] 3, Checkbox [7275:11456] 6, Radio [7275:11479] 4, Switch [7275:11494] 4, Menu Item [7275:11516] 4, Upload [7275:11548] 3
03 Data Visualization: Chart Legend Item [7275:13291] 3, Chart Tooltip [7275:13303] 2, Sparkline [7275:13323] 2, Area Chart [7275:13336] 2, Bar Chart [7275:13387] 2, Donut Chart [7275:13455] 2, Progress Bar [7275:13526] 3, Progress Ring [7275:13545] 4
04 Dashboard Widgets: Delta [7275:13743] 3, Card [7275:13757] 3, KPI Tile [7275:13780] 4, Insight Card [7275:13829] 3
05 Commerce: Product Card [7275:13989] 3, Variant Option [7275:14018] 6, Product Row [7275:14040] 3, Order Row [7275:14091] 2, Discount Card [7275:14130] 3, Payment Method [7275:14174] 2, Shipment Tracker [7275:14195] 3, Plan Card [7275:14284] 3
06 Navigation: Nav Item [7275:14700] 6, Sidebar [7275:14732] 2, Search Field [7275:14764] 2, Tab [7275:14781] 3, Segment [7275:14797] 2
07 Feedback & Overlays: Toast [7275:15071] 3, Alert [7275:15091] 4, Banner [7275:15120] 2, Modal [7275:15139] 2, Empty State [7275:15168] 2, Skeleton [7275:15181] 3
08 Overview Dashboard: Mobile Tab Bar [7275:18747] 2 (+ dashboard composition, patterns, responsive sections)
09 3D/Shader/Motion Lab: no component sets (section 7275:19609)
10 Instagram Storefront: Collection Circle [7275:19802] 2, Shoppable Post [7275:19815] 4, Product Tag [7275:19846] 2, Tagged Product [7275:19862] 2, Storefront Bar [7275:19889] 2 (+ Hero frame 7279:1476)
01 Foundations: no components (documentation section 7275:11885)
