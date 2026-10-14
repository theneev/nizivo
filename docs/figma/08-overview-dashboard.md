# Grove · 08 Overview Dashboard: layout, templates and responsive analysis

- **File:** `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read, now "Nizivo UI Library"; ships as **Nizivo UI**, `@nizivo/*`)
- **Page:** `7275:15335` "Grove · 08 Overview Dashboard"
- **Read on:** 2026-10-14. Read-only. 11 Figma calls (2 failed: one type guard, one over the 20 KB return limit; both retried).
- **Sections**
  - `7275:15336` "Grove · 08 Overview Dashboard" (1640×1587): one desktop composition.
  - `7275:15756` "Grove · 08 Patterns" (6280×3168): 8 desktop page templates.
  - `7275:18740` "Grove · 08 Responsive" (4000×1837): mobile-navigation doc with the **only component set on the page** (Mobile Tab Bar `7275:18747`), plus Tablet 1024 and two Mobile 390 compositions.
- **Node counts:** Overview has 65 frames, 75 instances and 105 texts. Patterns has 449 frames, 497 instances and 637 texts. Responsive has 165 frames, 135 instances, 190 texts, 1 component set and 2 components. In total there are **707 instances**.
- **Screenshots:** `shots/08-overview-section.png`, `shots/08-patterns-section.png`, `shots/08-responsive-section.png`.

Token names follow the snapshot `00-tokens-and-styles.md`. In the tree notation below, `!` means a raw value with no bound variable, `{x}` means bound to variable x, and `*` means bound.

---

## 0. Key findings

1. **Every instance on this page links to an off-canvas "ghost" main component, not to the canonical sets.** The ghosts' parent chain is empty, with `removed=false` and `remote=false`, and their keys differ from the canonical sets. Examples:
   - Button → `744:263` (canonical `7275:11244`)
   - Nav Item → `755:658` (canonical `7275:14700`)
   - KPI Tile → `752:380` (canonical `7275:13780`)

   **The page's own Mobile Tab Bar set `7275:18747` has 0 instances.** Both tab-bar instances (`7275:18978` and `7275:19052`) point to the ghost set `764:3482`. Pages 03, 04, 05 and 06 report the same bug. For Code Connect and token-sync tooling, the canonical `7275:*` IDs are the source of truth. The ghost IDs must be mapped or relinked by design.
2. **The `Card` set (`7275:13757`) is never used.** Every card surface in the 12 compositions is a hand-built FRAME with r20, `{bg/surface}` and `{border/subtle}` 1 px. Examples: Recent orders, Goals, Details, Variants, Pricing, Status, Inventory, Plan, Payment methods, Billing emails, Checkout funnel, Sales by channel, Orders by hour, Orders per day, Setup guide, and the mobile Sales/Today/Yesterday cards. Code must treat `Card`/`Section` as the single surface primitive and treat these frames as instances of it.
3. **Colors and type are fully tokenized; spacing and radius are not tokenized at all.** In all 12 compositions and in the Mobile Tab Bar set:
   - Every fill and stroke is bound to Grove Color, and every text uses a Grove text style. No RAW fonts, no raw hex, and no non-Grove (Clario, Pipkin, …) variables were found.
   - **Every** padding, gap and corner radius is a raw number. Most values sit on the scale.
   - Off-scale values: padding 3 and radius 10 (Range), 14 (chips, Top Bar, Order List Item, Setup step), gap 10 (mobile value row), and radius 32 (mobile device frames).
4. **This page holds the file's only explicit breakpoint.** Text `7275:18744` reads: *"Below 640px the sidebar becomes a five-tab bar and the top bar shrinks."* That conflicts with 01-foundations' proposal (mobile < 768). The tablet-to-desktop threshold (rail vs. expanded sidebar) is **not stated anywhere**.
5. **Responsive behavior swaps content as well as reflowing it.**
   - Mobile replaces the Revenue Card (area chart) with a hand-built 7-day bar card, and replaces the orders table with `Order List Item` rows.
   - Mobile drops the Banner, Goals, Export and the user avatar.
   - Tablet drops the Banner, Goals and Export, adds an Insight Card, and trims the Range segments to 3. Mobile keeps all 5 segments, which is inconsistent.

   Templates therefore need slot-level responsive presentations (for example a table shown as a list, or a compact chart), driven mostly by **container queries**.
6. **The Grove Responsive tokens don't match the compositions.** See §6.1 for the full table.
   - `layout/sidebar` is 264/72 but the frames use 248/76.
   - `section/gap` is unused: vertical rhythm uses `grid/gutter` values.
   - KPI rows use gap 16, not the gutter.
   - Tablet uses H1 32 (token: 28), and mobile KPI uses 32 (token: 28).
   - The tablet `content-max` 976 ignores the rail.
   - Analytics (Pattern 6) card widths ignore the 12-column spans.
7. **Dark-mode scrim bug (blocker class).** The drawer scrim `7275:16092` is a RECT filled `{bg/inverse}` at node opacity 0.32. In dark mode `bg/inverse` is white, so it **brightens** the page: it gives #5c5f5d over canvas #101311. An `overlay/scrim` token is needed.
8. **"Live Render" rectangles are rasters laid over component media slots.** There are five absolutely-positioned RECTs with IMAGE fills (scaleMode FIT): `7275:15439`, `7275:18886`, `7275:16203`, `7275:16592` and `7275:16604`. They sit over the Banner illustration, the Insight Card media and the Empty State illustration, and are probably stills of the 3D renders from page 09 Lab. **Banner, Insight Card and Empty State therefore need a `media` slot** that accepts a static image or a lazy 3D/shader component.
9. **Many UI elements in the compositions have no component at all.** Examples: Avatar (an ELLIPSE with an image fill), Segmented-control container, Filter chip, Tabs strip, Table container, Link ("View all"), Page header, Setup-guide checklist/stepper, Settings sub-nav, Scrim, Media gallery, Kbd (⌘K), notification dot. Tooltip, Dropdown/Menu surface, Popover, Date picker, Bottom sheet, Toast and Command menu are **absent** from the compositions, although the UI implies them (account menu, store-switcher list, "More" tab, ⌘K, row "…" menus).
10. **Documentation is almost empty.** The page has two annotation texts in total. Mobile Tab Bar and its variants have empty descriptions and no documentationLinks.

---

## 1. Page inventory (node IDs)

### 1.1 Section `7275:15336`: Overview Dashboard
| Node | Name | Size | Layout |
|---|---|---|---|
| `7275:15337` | Overview · Desktop 1440 | 1440×1375 | H, gap 0, r20!, fill {bg/canvas} |
| `7275:15338` | Sidebar (INSTANCE → ghost Sidebar `755:869` Expanded=True) | 248×1375 | V gap4 p16, FILL/FILL |
| `7275:15339` | Main | 1192×1375 | V gap0 |
| `7275:15340` | Top Bar (INSTANCE → ghost COMPONENT `755:1031`, Title="Overview") | 1192×71 | H gap24 p14/32/14/32 |
| `7275:15341` | Content | 1192×1304 | V gap24! p32/32/40/32! |
| `7275:15439` | Live Render (RECT, IMAGE FIT, ABSOLUTE, 72×72 at 304,183) | | over Banner illustration |

### 1.2 Section `7275:15756`: Patterns (all 1440 wide, Sidebar 248 + Main 1192, Content V gap24 p32/32/40/32 raw)
| Composition | Root | Sidebar | Top Bar (Title) | Content | Extras |
|---|---|---|---|---|---|
| Pattern 1 · Products | `7275:15757` (1440×972) | `7275:15758` | `7275:15760` "Products" | `7275:15761` | |
| Pattern 2 · Product detail | `7275:15860` (×1363) | `7275:15861` | `7275:15863` "Products" | `7275:15864` | |
| Pattern 3 · Orders + drawer | `7275:15971` (×972) | `7275:15972` | `7275:15974` "Orders" | `7275:15975` | Scrim RECT `7275:16092`, Drawer INSTANCE `7275:16096` (440×972 at x1000) |
| Pattern 4 · Customers | `7275:16097` (×1122) | `7275:16098` | `7275:16100` "Customers" | `7275:16101` | Live Render `7275:16203` (312×168) |
| Pattern 5 · Discounts | `7275:16204` (×925) | `7275:16205` | `7275:16207` "Discounts" | `7275:16208` | |
| Pattern 6 · Analytics | `7275:16296` (×1501) | `7275:16297` | `7275:16299` "Analytics" | `7275:16300` | |
| Pattern 7 · Settings · Plan & billing | `7275:16412` (×1178) | `7275:16413` | `7275:16415` "Settings" | `7275:16416` | |
| Pattern 8 · Onboarding | `7275:16478` (×988) | `7275:16479` | `7275:16481` "Home" | `7275:16482` | Live Render `7275:16592` (140×140), `7275:16604` (312×168) |

### 1.3 Section `7275:18740`: Responsive
| Node | Name | Size | Notes |
|---|---|---|---|
| `7275:18741` | Doc/Mobile navigation | 564×745, V gap32 p48, r28 | Header `7275:18742` (texts `7275:18743`, `7275:18744`); Stage `7275:18745` → Mobile Top Bar INSTANCE `7275:18746`; **COMPONENT_SET Mobile Tab Bar `7275:18747`** (placed directly, styled as a stage: V gap16 p24 r16); Stage `7275:18790` → Order List Item INSTANCE `7275:18791` |
| `7275:18792` | Overview · Tablet 1024 | 1024×1677 | Sidebar `7275:18793` (**Expanded=False**, 76 wide), Main `7275:18794`, Top Bar `7275:18795`, Content `7275:18796` (V gap20 p24/24/32/24), Live Render `7275:18886` (393×168) |
| `7275:18887` | Overview · Mobile 390 | 390×1551, r32 | Mobile Top Bar `7275:18888`, Content `7275:18889` (V gap16 p20/16/24/16), Mobile Tab Bar `7275:18978` (Active=Home) |
| `7275:18979` | Orders · Mobile 390 | 390×854, r32 | Mobile Top Bar `7275:18980`, Content `7275:18981`, Mobile Tab Bar `7275:19052` (Active=Orders) |

---

## 2. Annotation and documentation text (complete)

These are all the TEXT nodes on the page outside compositions, instances and components.

| Node | Text |
|---|---|
| `7275:18743` | **"Mobile navigation"** (section title) |
| `7275:18744` | "Below 640px the sidebar becomes a five-tab bar and the top bar shrinks." |

- Component descriptions: Mobile Tab Bar `7275:18747` = "" (variants `7275:18748` and `7275:18769` also ""). documentationLinks: none. The ghost components Mobile Top Bar `764:3397`, Order List Item `764:3483` and Drawer `756:1001` also have empty descriptions.
- Composition frame names encode the intent: "Overview · Desktop 1440", "Pattern 3 · Orders + drawer", and so on. There are no do/don't notes, no a11y notes and no motion specs on this page. The 01-foundations motion guidance applies, e.g. "Overlays — modals and drawers enter on spring, exit in 140ms ease-in; the backdrop only fades."

---

## 3. Visual language (from the screenshots)

- **Shell:** a calm, light, warm-neutral admin.
  - Canvas `bg/canvas` (#f6f7f4). White cards with hairline `border/subtle` and **no shadows at rest**. The compositions show no Elevation on cards; only the Drawer uses `Elevation/4 Modal`.
  - Large radii: 20 on cards, 999 on pills and chips, 12 on the table container.
- **Density:** comfortable.
  - 32 px page margins on desktop. 24 px inside cards. 16–24 px between cards.
  - 40 px controls (Button Md). Row heights: 57 for orders, 65 for products, 78 for the mobile list item.
- **Typography:** Geist, plus Geist Mono for order IDs, SKUs and timestamps ("#1042 · 09:12").
  - Greeting/page title uses Heading/H1 32 (desktop and tablet) and Heading/H2 24 (mobile).
  - Card titles use H4 16. KPIs use Numeric/KPI 32. The hero uses Numeric/Display 40 inside the Revenue Card.
- **Color:**
  - Brand deep green `bg/brand` #1a573a for primary actions and the active nav. Light green tints `bg/brand-subtle` for the active nav item, the tinted KPI and the promo banner.
  - The lime accent appears on the dark "Grow" plan card CTA.
  - Status badges use subtle tints (success, warning, neutral, critical).
- **Selection languages (3 coexist):**
  - Brand-subtle pill: nav item, tab-bar indicator.
  - White with shadow: Segment, per 06.
  - **Inverse black pill:** filter chip "Unfulfilled", and Pagination's current page per 06.
- **Imagery:** warm product photography for avatars and thumbnails. **Soft 3D renders**: a glass shop box on the banner, a green glass sphere on the Insight Card, a box on the Empty State. These are composited as "Live Render" rasters.
- **Motion cues:** prototype reactions only (§10). Hover → SMART_ANIMATE 160 ms; click → 220 ms; easing cubic-bezier(0.2,0,0,1) = `easing/standard`. No glass effects on this page.

---

## 4. Composition anatomy

Notation: `I→X` means an instance of X. `×N` means N consecutive identical siblings. All spacing and radius values are raw unless marked.

### 4.1 Overview · Desktop 1440 (`7275:15337`)
```
FRAME 1440×1375 H r20! {bg/canvas}
├ I→Sidebar[Expanded=True] 248 FILL-H
└ Main V (FILL)
  ├ I→Top Bar {Title=Overview} 1192×71
  └ Content V g24 p32/32/40/32
    ├ Page header H g16 al:center-y
    │  ├ T "Good morning, Maya" Heading/H1 {text/primary}
    │  ├ Range H g2 p3 r10! {bg/subtle} → I→Segment ×5 (Today/7D/30D/90D/12M, 32 h)
    │  └ I→Button[Secondary,Md] "Export" (leading icon download)
    ├ I→Banner[Tone=Promo] 1128×104 ("6 new posts need product tags" / CTA "Tag posts" / dismiss ×)
    ├ KPIs H g16 → I→KPI Tile ×4 (Tinted+Up "Total sales $48,290", Surface: Orders, Conversion(Down), Avg. order value) ≈270 each
    ├ Sales row H g24
    │  ├ I→Revenue Card 744×467   (= 8 of 12 cols)
    │  └ Side V g24 360           (= 4 of 12 cols)
    │     ├ I→Ranked List 360×324 ("Top channels")
    │     └ Goals V g16 p24 r20! {bg/surface}{border/subtle} → "Monthly goal 68%" + Progress Bar
    └ Recent orders V g16 p24 r20! {bg/surface}{border/subtle}
       ├ Header H: T "Recent orders" H4 · T "View all" Label/M {text/brand}   ← plain text link
       └ Table V r12! stroke{border/subtle} → I→Order Table Header + I→Order Row ×4
RECT "Live Render" 72×72 ABS (Banner illustration)
```
**12-column check (desktop):** content width 1128, gutter 24 → column width = (1128 − 11·24)/12 = **72**. 8 columns = 744 ✓ and 4 columns = 360 ✓, so the Sales row snaps to spans. The **KPI row uses gap 16** (4 × 270 + 3 × 16), so it doesn't snap to 3-column spans (264 + 24).

### 4.2 Overview · Tablet 1024 (`7275:18792`)
```
FRAME 1024×1677 H r20!
├ I→Sidebar[Expanded=False] 76 (rail: icons only; store mark only)
└ Main → I→Top Bar {Title=Overview} 948×71 (same component; search field still present)
   Content V g20 p24/24/32/24
   ├ Page header H g12: H1 "Good morning, Maya" (Heading/H1 32) · Range ×3 (7D/30D/90D)   ← Export removed
   ├ KPIs H g16 → KPI Tile ×2 (441)  ×2 rows                                  ← 2×2 grid
   ├ I→Revenue Card 900×467 (full width)
   ├ Row H g16 → I→Ranked List 443 · I→Insight Card[Brand] 441 "Holiday drop is ready"   ← Insight replaces Goals
   └ Recent orders V g12 p24/0/0/0 r20! → Header (p0/24/0/24) · Order Table Header · Order Row ×3 (table full-bleed in card)
RECT "Live Render" 393×168 ABS (Insight Card media)
```
The Banner and Goals are dropped. On an 8-column grid with gutter 20 over 900 px, a column is (900 − 140)/8 = 95, and 4 columns = 440. The KPI and Row gaps are 16, not 20.

### 4.3 Overview · Mobile 390 (`7275:18887`)
```
FRAME 390×1551 V r32! {bg/canvas}
├ I→Mobile Top Bar {Title=Overview} 390×57   (store mark · title · search icon · bell icon; no avatar)
├ Content V g16 p20/16/24/16
│ ├ T "Good morning, Maya" Heading/H2 {text/primary}        ← level swap H1→H2 instead of responsive size
│ ├ Range H g2 p3 r10! FILL → Segment ×5
│ ├ Sales V g16 p20 r20! {bg/surface}{border/subtle}        ← hand-built, replaces Revenue Card
│ │  ├ Head: "Total sales" Label/M {text/secondary} · "Last 7 days" Label/M {text/tertiary}
│ │  ├ Value H g10!: "$11,284" Numeric/KPI · I→Delta[Up] "12.4%"
│ │  └ Bars H g8 → Day ×7 (V g8: bar + "M/T/W/T/F/S/S"; Saturday highlighted dark green)
│ ├ I→KPI Tile[Tinted,Up] "Orders 1,284" · I→KPI Tile[Surface,Down] "Conversion 3.2%"  (stacked, 358 w)
│ ├ I→Ranked List 358×324
│ └ Recent orders V p16/0/0/0 r20! → Header (p0/16/8/16) · I→Order List Item ×3
└ I→Mobile Tab Bar[Active=Home] 390×97 (in flow at bottom; in code: fixed + safe-area)
```

### 4.4 Orders · Mobile 390 (`7275:18979`)
```
├ I→Mobile Top Bar {Title=Orders}
├ Content V g16 p20/16/24/16
│ ├ Header H g12: T "Orders" Heading/H2 · I→Button[Primary,Md] "Create" (+ icon)
│ ├ I→Search Field[Default] 358×39 ("Search orders")
│ ├ Filters H g8 (HUG, 312 w) → chip FRAMEs: "All" {bg/surface}{border/default} · "Unfulfilled" {bg/inverse}/{text/inverse} (36 h, no stroke) · "Unpaid" · "Open" (38 h) — r999! p8/14!
│ ├ T "Today" Label/M Strong {text/secondary}  → Today V r20! card → I→Order List Item ×2
│ ├ T "Yesterday" …                           → Yesterday V r20! card → I→Order List Item ×2
│ └ I→Alert[Tone=Warning] "2 orders waiting over 24h / Fulfil them to keep your badge." (dismiss ×)
└ I→Mobile Tab Bar[Active=Orders]
```
The active chip is 36 px tall and the inactive chips are 38 px, because only the inactive chips have a 1 px stroke. Selecting a chip therefore shifts the layout.

### 4.5 Pattern 1 · Products (`7275:15757`): resource index with a data table
```
Content
├ Page header H g12: H1 "Products" · Button[Secondary] "Import" · Button[Primary] "Add product"
└ Catalogue V r20 {bg/surface}{border/subtle}
   ├ Toolbar V g16 p16/24
   │  ├ Tabs H g24 stroke-bottom{border/subtle} → Tab ×4 (All[Active]/Active/Draft/Archived)
   │  └ Filters H g12 → Search Field (868) · Button[Secondary] "Filters" · Button "Sort"
   ├ I→Table Header 1126×44 (checkbox · Product · Status · Inventory · Price)
   ├ I→Product Row ×8 (2 × State=Selected: green row tint + checked checkbox; thumbnail, name, SKU mono, Badge, stock text with warning/critical colors, price, "…" row menu)
   └ Footer H p16/24 → "Showing 1–20 of 248" + I→Pagination
```
Rows are selected, but there is **no bulk-action bar**. "…" implies a row menu that is not designed.

### 4.6 Pattern 2 · Product detail (`7275:15860`): edit form with 8/4 columns
```
Content
├ I→Breadcrumb {Products › Mugs & cups › Stoneware mug}
├ Page header: H1 "Stoneware mug" · Badge[Success] "Active" · Button[Secondary] "Preview" · Button[Primary] "Save"
└ Columns H g24
   ├ Main V g24 744: Media (Gallery H g12: 1 large + 4 small tiles, one empty/upload) · Details (Input[Filled] ×2: Title, Description w/ help text) · Variants ("Colour" → Variant Option[Colour] ×4 incl. Disabled; "Size" → Variant Option[Size] ×3) · Pricing (Prices H g16 → 3 inputs Price/Compare-at/Cost)
   └ Aside V g24 360: Status (Switch ×3: Instagram shop/Store link/Wholesale) · I→KPI Tile[Tinted] "Sold · 30 days 412" · Inventory (Progress Bar "On hand 124/180" + Checkbox "Track inventory")
```

### 4.7 Pattern 3 · Orders + drawer (`7275:15971`): index with a detail drawer over a scrim
```
Content: Page header (H1 "Orders" · Button "Export" + a second Button, label not read) · KPIs H g16 → KPI Tile[Surface] ×4 · Orders card (Toolbar: Tabs ×5 [All/Unfulfilled/Unpaid/Open/Archived] + Search + Filters) · Order Table Header · Order Row ×6 · Footer + Pagination
RECT "Scrim" 1440×972 ABS {bg/inverse} opacity 0.32           ← whole frame incl. sidebar
I→Drawer {Title=Order #1042} 440×972 ABS at x1000 (right edge)
```

### 4.8 Pattern 4 · Customers (`7275:16097`): card grid with an aside
```
Content: Page header (H1 "Customers" · Export · Add customer) · KPIs H g16 → KPI Tile ×3 (364) · Tabs H g24 → Tab ×4 (All/VIP/Subscribers/At risk) · Columns H g24
  ├ Grid V g24 744 → Row H g24 → I→Customer Card 360×229 ×2  ×2 rows   (2-up within 8 cols)
  └ Aside V g24 360 → I→Ranked List "Top cities" · I→Insight Card[Accent] "Win back 214 lapsed buyers" (+ Live Render 3D box)
```

### 4.9 Pattern 5 · Discounts (`7275:16204`): card grid
```
Content: Page header (H1 "Discounts" · Button[Primary] "Create discount") · I→Alert[Info] "Discounts now stack with free shipping" · KPIs → KPI Tile ×3 · Tabs ×4 (All/Active/Scheduled/Expired) · Row H g24 → Discount Card ×3  ×2 rows (Active ×3, Scheduled ×2, Expired ×1)
```

### 4.10 Pattern 6 · Analytics (`7275:16296`): report dashboard
```
Content: Page header (H1 · Range ×5 (r10, p3) · Export) · KPIs → KPI Tile ×4 (Sessions/Conversion/Total sales/Bounce rate)
├ Row 1 H g16: "Checkout funnel" card 798 (I→Funnel Chart 748×180) · "Goals" card 314 (Rings 2×2 → Progress Ring 75/50/100/25 + labels)
├ Row 2 H g16: "Sales by channel" 524 (I→Donut Chart 482×200 + legend table) · "Orders by hour" 588 (I→Heatmap 500×322)
└ Row 3 H g16: "Orders per day" 690 (I→Bar Chart 640×260) · I→Ranked List 422 "Top products"
```
The widths 798/314, 524/588 and 690/422 **don't correspond to 12-column spans**: 798 is neither 8 columns (744) nor 9 columns (840). They are hug or fixed widths from the chart instances. The card padding varies too (24 vs 24/20).

### 4.11 Pattern 7 · Settings · Plan & billing (`7275:16412`): settings with a sub-nav
```
Content: Page header (H1 "Settings") · Columns H **g32**
  ├ Settings menu V g4 232 → I→Nav Item ×7 (General / Plan & billing[Active] / Payments / Shipping / Staff / Notifications / Domains)
  └ Main V g24 864: Plan card (Header "Plan" + "Renews Nov 14"; Tiers H g16 → Plan Card ×3 Basic/Grow[inverse, "Popular"]/Scale) · Payment methods (Header + "Add method"; Payment Method ×2, Selected has "Default" badge) · Billing emails (H3!, Switch ×3 Invoices/Failed payments/Usage reports)
```
The section title "Billing emails" uses Heading/H3, while every other card title uses H4. The columns gap is 32, which is not the gutter.

### 4.12 Pattern 8 · Onboarding (`7275:16478`): setup guide and empty state
```
Content: Page header (H1 "Let's get Moss & Kiln selling") · Columns H g24
  ├ Main V g24 744: Setup guide card (Header V g12 p24/24/20/24: title + "2 of 5 done" + 40% progress; Step H g14! p16/24 ×5: check circle, label, action Button ("Set up", "Add rates", "Tag posts")) · I→Empty State[Context=Orders] "No orders yet" + "Share your store" (+ Live Render 3D box 140×140)
  └ Aside V g24 360: I→Insight Card[Brand] "Put your store link in your Instagram bio" (+ Live Render sphere) · I→Plan Card[Tier=Grow]
```

---

## 5. Instance → main component audit (all 707 instances)

`top` counts outermost instances in compositions. `nested` counts instances inside other instances. Every main component listed has an **empty parent chain**: it is a ghost, local and not remote. "Canonical" is the on-canvas set listed in the snapshot.

| Main (ghost id) | Kind | top / nested | Variants used | Canonical on canvas |
|---|---|---|---|---|
| Nav Item `755:658` | SET | 7 / 90 | Default ×78, Active ×10, Collapsed Default ×8, Collapsed Active ×1 | `7275:14700` |
| Badge `744:315` | SET | 1 / 61 | Success 24, Warning 18, Neutral 11, Brand 6, Info 2, Critical 1 | `7275:11374` |
| Button `744:263` | SET | 19 / 11 | Secondary Md ×18, Primary Md ×10, Accent Md ×2 (all State=Default) | `7275:11244` |
| Delta `752:269` | SET | 1 / 27 | Up 22, Down 6 | `7275:13743` |
| KPI Tile `752:380` | SET | 25 / 0 | Tinted+Up 7, Surface+Up 12, Surface+Down 6 | `7275:13780` |
| Sparkline `747:288` | SET | 0 / 25 | Up 19, Down 6 | `7275:13323` |
| Segment `755:982` | SET | 17 / 0 | Default 13, Active 4 | `7275:14797` |
| Tab `755:961` | SET | 17 / 0 | Active 4, Default 13 | `7275:14781` |
| Search Field `755:888` | SET | 3 / 10 | Default 13 | `7275:14764` |
| Order Row `753:644` | SET | 13 / 0 | Default 13 | `7275:14091` |
| Sidebar `755:869` | SET | 10 / 0 | Expanded=True 9, False 1 | `7275:14732` |
| Product Row `753:476` | SET | 8 / 0 | Default 6, Selected 2 | `7275:14040` |
| Variant Option `753:405` | SET | 7 / 0 | Colour Selected/Default×2/Disabled; Size Default×2/Selected | `7275:14018` |
| Switch `745:286` | SET | 6 / 0 | On ×4, Off ×2 | `7275:11494` |
| Discount Card `754:615` | SET | 6 / 0 | Active 3, Scheduled 2, Expired 1 | `7275:14130` |
| Input `745:187` | SET | 5 / 0 | Filled 5 | `7275:11397` |
| Progress Ring `751:388` | SET | 4 / 0 | 75, 50, 100, 25 | `7275:13545` |
| Plan Card `754:892` | SET | 4 / 0 | Basic, Grow ×2, Scale | `7275:14284` |
| Progress Bar `751:367` | SET | 3 / 0 | Brand 3 | `7275:13526` |
| Insight Card `752:531` | SET | 3 / 0 | Brand 2, Accent 1 | `7275:13829` |
| Alert `756:868` | SET | 2 / 0 | Info, Warning | `7275:15091` |
| Payment Method `754:644` | SET | 2 / 0 | Selected, Default | `7275:14174` |
| **Mobile Tab Bar `764:3482`** | SET | 2 / 0 | Home, Orders | **`7275:18747` (this page; 0 instances)** |
| Banner `756:913` | SET | 1 / 0 | Promo | `7275:15120` |
| Checkbox `745:284` | SET | 1 / 0 | Checked | `7275:11456` |
| Donut Chart `751:314` / Bar Chart `747:424` | SET | 1 / 0 each | Default | `7275:13455` / `7275:13387` |
| Empty State `756:1149` | SET | 1 / 0 | Context=Orders | `7275:15168` |
| Select `745:222`, Area Chart `747:351`, Chart Legend Item `747:286` | SET | 0 / 2, 0 / 2, 0 / 4 | nested in Revenue Card | `7275:11438`, `7275:13336`, `7275:13291` |
| Top Bar `755:1031` | COMPONENT | 10 / 0 | — | **none** |
| Store Switcher `755:663` | COMPONENT | 0 / 9 | — | none |
| Order List Item `764:3483` | COMPONENT | 8 / 0 | — | **none** |
| Ranked List `752:444` | COMPONENT | 5 / 0 | — | none |
| Customer Card `754:530` | COMPONENT | 4 / 0 | — | none |
| Order Table Header `753:599` | COMPONENT | 3 / 0 | — | none |
| Mobile Top Bar `764:3397` | COMPONENT | 3 / 0 | — | **none** |
| Revenue Card `752:385` | COMPONENT | 2 / 0 | — | none |
| Pagination `755:1007` | COMPONENT | 2 / 0 | — | none |
| Table Header `753:410`, Breadcrumb `755:998`, Drawer `756:1001`, Funnel Chart `751:319`, Heatmap `751:393` | COMPONENT | 1 / 0 each | — | none |
| Order Summary `754:897` | COMPONENT | 0 / 1 (in Drawer) | — | none |
| Icon/* (Lucide) `738:*`, 34 distinct | COMPONENT | ≈12 (inside the canonical Mobile Tab Bar variants) / ≈250 | — | none (01 report: masters unparented) |
| Social/Instagram `772:4302` | COMPONENT | 0 / 10 | — | none |

Icons used on this page: trending-up/down, check, search, users, house, shopping-bag, package, bell, ellipsis, chevrons-up-down, settings, chart-column, megaphone, percent, plus, download, x, chevron-right/left, tag, arrow-right, credit-card, calendar, sliders-horizontal, upload, arrow-up-down, eye, user-plus, info, wallet, truck, globe, triangle-alert, plus Social/Instagram. All are local ghosts (`remote=false`), and all are Lucide according to their descriptions (01 report).

---

## 6. Responsive behavior

### 6.1 Grove Responsive tokens compared with the compositions
| Token | Desktop / Tablet / Mobile | Observed in compositions | Verdict |
|---|---|---|---|
| `layout/viewport` | 1440 / 1024 / 390 | frame widths 1440 / 1024 / 390 | ✓ (device sizes, **not** breakpoints) |
| `layout/sidebar` | 264 / 72 / 0 | **248 / 76** / 0 (tab bar instead) | ✗ drift on both (06 reports the same). Decide which side is right. |
| `grid/margin` | 32 / 24 / 16 | Content left/right padding 32 / 24 / 16 | ✓ values match, but they are **unbound**. Bottom padding is margin + 8 (40/32/24). Mobile top padding is 20. |
| `grid/gutter` | 24 / 20 / 16 | Content **vertical** gap 24 / 20 / 16. Horizontal gaps: Sales row 24 ✓; KPI rows **16** (desktop and tablet); tablet Row 16 (≠ 20); Analytics rows 16; Settings columns **32** | Mixed. The gutter is used as vertical rhythm, and horizontal gaps are inconsistent. |
| `section/gap` | 32 / 24 / 20 | **not used anywhere** | ✗ Designers need to decide: section/gap or gutter for vertical rhythm. |
| `layout/content-max` | 1280 / 976 / 358 | 1128 desktop (1440 − 248 − 64; no max-width set on Content) / **900** tablet (976 = 1024 − 48 ignores the 76 rail) / 358 ✓ | The tablet value is inconsistent with the rail. Desktop never reaches 1280 at 1440, so the token acts as a cap for wider screens. Content has no `maxWidth` in Figma. |
| `grid/columns` | 12 / 8 / 4 | Desktop 8+4 splits (744/360) in Overview and Patterns 2, 4 and 8 ✓; KPI 4-up; Analytics arbitrary ✗. Tablet: KPI 2×2, Revenue full, 2-up rows (≈4+4 of 8). Mobile: 1-up. | Partly followed |
| `type/display` | 56 / 44 / 36 | not used on this page | — |
| `type/h1` | 32 / 28 / 24 | Desktop Heading/H1 32 ✓; **Tablet Heading/H1 32 ✗ (token 28)**; Mobile **Heading/H2** 24 (value ✓, wrong semantic level) | Text styles aren't bound to the responsive variables. In code: one `<h1>` with a responsive size. |
| `type/kpi` | 32 / 28 / 28 | KPI tiles 32 everywhere; mobile Sales "$11,284" Numeric/KPI **32** ✗ | Not applied |

### 6.2 Breakpoints
- **Documented:** mobile < **640 px** (`7275:18744`): "the sidebar becomes a five-tab bar and the top bar shrinks".
- **Observed but not specified:** at 1024 the sidebar is a **rail** (Sidebar Expanded=False, 76). At 1440 it is **expanded** (248). The rail→expanded threshold is undefined.
- **Conflict:** 01-foundations proposed `md 768 / lg 1280`. This page states 640. **Proposal (needs designer sign-off):** `sm = 640` (tab bar ↔ rail, from the doc) and `lg = 1280` (rail ↔ expanded; at 1280 − 248 = 1032 the main area can still hold the 4-up KPI row). Tablet range: 640–1279. Expose these as `--nz-bp-sm` and `--nz-bp-lg` and as a JS `breakpoints` object from `@nizivo/tokens`.

### 6.3 Content swaps and reflow (Overview)
| Region | Desktop 1440 | Tablet 1024 | Mobile 390 |
|---|---|---|---|
| Navigation | Sidebar expanded (store switcher, 8 items + Settings, counts) | Sidebar rail (icons only, store mark) | **Mobile Tab Bar** (Home/Orders/Products/Customers/More) |
| Top bar | Top Bar: title, search field with ⌘K, bell with dot, avatar | Same Top Bar (search field still present) | **Mobile Top Bar**: store mark, title, search **icon**, bell icon; **no avatar** |
| Page title | H1 32 | H1 32 | H2 24 |
| Range | 5 segments + Export | **3 segments**, no Export | 5 segments, full width |
| Promo Banner | shown | **hidden** | **hidden** |
| KPIs | 4-up (gap 16) | 2×2 | 2 tiles stacked (Total sales becomes the Sales card) |
| Hero chart | Revenue Card (area, 744) | Revenue Card full width | **Hand-built 7-day bar card** (not a component) |
| Side widgets | Ranked List + Goals | Ranked List + **Insight Card** | Ranked List |
| Recent orders | Table (header + 4 rows) inside a padded card | Table full-bleed in card (3 rows) | **Order List Item** list (3) |

**Architecture implication:** CSS reflow alone can't produce these layouts. Recipes need:
- (a) **container-query-driven presentations**: Table ↔ List, Revenue chart ↔ compact bars, Range options reduced;
- (b) **responsive visibility** for optional widgets (`hideBelow="lg"`);
- (c) **navigation driven by one config**, rendered as Sidebar, Rail or Tab Bar.

The Range inconsistency (tablet 3 options, mobile 5) should go back to design.

---

## 7. Component set: Mobile Tab Bar (`7275:18747`)

### 7.1 Raw componentPropertyDefinitions
```json
// 7275:18747 (canonical, on this page, 0 instances)
{"Active":{"type":"VARIANT","defaultValue":"Home","variantOptions":["Home","Orders"]}}
// 764:3482 (ghost set used by both instances) — identical
{"Active":{"type":"VARIANT","defaultValue":"Home","variantOptions":["Home","Orders"]}}
```
- Variants: `Active=Home` `7275:18748` and `Active=Orders` `7275:18769`. Ghost variants: `764:3408` and `764:3445`. Default variant: Active=Home.
- Description: "" and documentationLinks: [] (set and variants).
- **Matrix:** 2 of 5 destinations are modeled. Active=Products, Customers, More and none are missing.

### 7.2 Anatomy (Active=Home `7275:18748`)
```
COMPONENT 390×97  H gap0! pad 8!/8!/24!/8!  FILL×HUG  align center  fill{bg/surface}  stroke{border/subtle} top-only 1
├ FRAME "Home" 75×64  V gap4! pad 6!/0!/6!/0!  FILL  align center
│  ├ FRAME "Indicator" 52×28  H pad 4!/16!/4!/16!  r999!  fill{bg/brand-subtle}   (active only; inactive = no fill)
│  │  └ INSTANCE "Icon" → Icon/house (ghost 738:203) 20×20  stroke{icon/brand}  (inactive: {icon/secondary})
│  └ TEXT "Home" Grove/Label/M Strong {text/brand}   (inactive: Label/M {text/secondary})
├ FRAME "Orders"    → Icon/shopping-bag (738:323)
├ FRAME "Products"  → Icon/package (738:271)
├ FRAME "Customers" → Icon/users (738:415)
└ FRAME "More"      → Icon/ellipsis (738:166)
```
- **Token bindings:** colors and text styles are bound. **All padding, gaps and radii are raw.** The values sit on the scale (4, 6, 8, 16, 24, 999 = radius/full), except the 24 bottom padding, which is a safe-area value.
- **Reactions:** each variant has `ON_CLICK → CHANGE_TO` the other variant, SMART_ANIMATE 220 ms, cubic-bezier(0.2,0,0,1). The click is on the whole bar, not per tab, so it is only a prototype simplification.

### 7.3 Issues
- Instances use the ghost set `764:3482`, so the canonical set has 0 instances.
- Only Home and Orders are modeled. No hover, pressed or focus-visible states. No badge or count (the sidebar shows "Orders 12", the tab bar shows nothing). No "none active" option for pages under More.
- Tab items are detached FRAMEs. There is no "Tab Bar Item" component and the icon is not an INSTANCE_SWAP property.
- The active label switches from Label/M (Medium) to Label/M Strong (SemiBold), so its width jitters. Columns are equal-width FILL, which masks this here, but long labels will reflow.
- Labels are 14 px across 75 px columns. "Customers" barely fits, and longer locales will overflow. There is no 12 px caption style to fall back to (snapshot gap). A truncation rule is needed.
- Hit target: 75×64 ✓ (≥ 44).
- Contrast:
  - Active icon `icon/brand` on `bg/brand-subtle`: 5.6:1 (L) and 7.37:1 (D) ✓.
  - Inactive label `text/secondary` on surface: 6.48 / 6.87 ✓.
  - The indicator pill against the bar is 1.14 (L) and **1.03 (D)**, so the active state relies on color and weight. That is acceptable because the label is also bold and brand-colored, plus `aria-current`.
  - The top hairline `border/subtle` vs surface is 1.15 (L) and 1.10 (D), which is very faint.
- The 24 px bottom padding stands in for the home indicator. Code should use `padding-bottom: calc(var(--nz-space-2) + env(safe-area-inset-bottom))`.
- "More" implies an overflow **bottom sheet** (Marketing, Discounts, Analytics, Instagram, Settings, account), which isn't designed.

### 7.4 Proposed API
```tsx
// Driven by the same nav registry as Sidebar (see §12.3)
<MobileTabBar
  items={nav}                       // NavItem[]; items with mobile:'tab' render (max 4) + auto "More"
  activeId={activeId}               // or derived from pathname via <NavProvider pathname>
  moreLabel="More"
  onMoreOpen? / renderMore={(items) => <Sheet>…</Sheet>}   // overflow sheet slot
  linkComponent={NextLink}          // router adapter (inherited from <NizivoProvider>)
/>
// Compound escape hatch
<MobileTabBar.Root aria-label="Primary">
  <MobileTabBar.Item href="/" icon={<HomeIcon/>} label="Home" badge={3} active />
  …
  <MobileTabBar.More>…</MobileTabBar.More>
</MobileTabBar.Root>
```
- Figma → code: `Active=Home|Orders` becomes `activeId: string` (open set). Visual states (hover, pressed, focus) are CSS, not props.
- **A11y:** `<nav aria-label="Primary">` containing a list of links (not `tablist`, because these are page destinations). Use `aria-current="page"` on the active link and keep icons `aria-hidden`. A badge needs visually hidden text ("12 unfulfilled"). "More" is a `button` with `aria-haspopup="dialog"` and `aria-expanded`, opening a modal sheet (focus trap, Esc, return focus).
- **RSC: split.** The bar can be a server component when `activeId` comes from the server (route segment). Only the More sheet trigger and sheet are client. If the active state is derived from `usePathname`, wrap only the item links in a tiny client `NavLink`.
- **Tier:** composite. **Package:** `@nizivo/ui` (shell entry: `@nizivo/ui/shell`).

---

## 8. Ghost components introduced on this page (no canonical master anywhere)

### 8.1 Mobile Top Bar: ghost COMPONENT `764:3397` (instances `7275:18746`, `7275:18888`, `7275:18980`)
```json
{"Title#764:0":{"type":"TEXT","defaultValue":"Overview"}}
```
```
COMPONENT 390×57  H gap12! pad 12!/16!/12!/16!  align center  fill{bg/canvas}  stroke{border/subtle} bottom-only 1
├ FRAME "Store mark" 32×32  r8! fill{bg/brand} → TEXT "M" Label/M Strong {text/on-brand}   (8.51:1 L, 5.17:1 D)
├ TEXT "Overview" Heading/H4 {text/primary}  ← ref Title
├ INSTANCE Icon/search (738:314) 20×20 {icon/primary}     ← bare icon, no button
└ INSTANCE Icon/bell (738:87) 20×20 {icon/primary}        ← bare icon, no button, no unread dot (desktop has one)
```
- **Issues:**
  - Search and bell are **bare 20×20 icons**. They need IconButtons with at least a 44×44 hit area (they currently fail both 44 and control-sm 32).
  - No back-button variant for detail pages.
  - No avatar or account entry.
  - No unread dot, unlike the desktop bell.
  - No scrolled or elevated state.
  - The Store mark is a hand-built square avatar.
- **API:**

  ```tsx
  <MobileTopBar title="Orders" leading={<StoreMark/> | <BackButton/>} actions={<><IconButton label="Search"/>…</>} />
  ```

  Alternatively, a single `<TopBar>` with responsive parts: below 640 the search field collapses to an icon that opens a full-screen search or command dialog.
- **RSC:** server shell, with client islands for search and notifications.

### 8.2 Order List Item: ghost COMPONENT `764:3483` (8 instances; doc instance `7275:18791`)
```json
{"Customer#764:1":{"type":"TEXT","defaultValue":"Maya Lindqvist"},"Meta#764:2":{"type":"TEXT","defaultValue":"#1042 · 09:12"},"Total#764:3":{"type":"TEXT","defaultValue":"$112.00"}}
```
```
COMPONENT 358×78  H gap12! pad 14!/16!/14!/16!  align center  fill{bg/surface}  stroke{border/subtle} bottom-only
├ ELLIPSE "Avatar" 40×40 fill IMAGE                        ← no Avatar component; no initials fallback
├ FRAME "Text" V gap2!  → "Maya Lindqvist" Label/M Strong {text/primary} · "#1042 · 09:12" Mono/M {text/tertiary}
└ FRAME "Right" V gap4! align end → "$112.00" Numeric/M {text/primary} · INSTANCE Badge[Tone=Warning] "Unfulfilled"
```
- **Issues:**
  - The badge tone and label aren't properties (manual override).
  - No hover, pressed, selected or unread states. The desktop Order Row has a Hover reaction.
  - The meta text uses `text/tertiary`, which is 4.31:1 on white and **fails AA** for 14 px regular text.
  - Every item carries a bottom stroke. Whether the last item's stroke is suppressed in the composition was not read.
- **Role:** this is the **mobile presentation of Order Row**. Code should model one `OrderRow` data contract rendered by `<OrdersTable>` at wide container widths and `<OrderList>` at narrow ones (`@nizivo/commerce`).
- **A11y:** the whole item is a link to the order. Accessible name: "Order 1042, Maya Lindqvist, $112.00, Unfulfilled".
- **RSC:** server.

### 8.3 Drawer: ghost COMPONENT `756:1001` (instance `7275:16096` in Pattern 3) and Scrim `7275:16092`
```json
{"Title#756:0":{"type":"TEXT","defaultValue":"Order #1042"}}
```
```
COMPONENT 440×820  V  r:mixed (which corners not read)  fill{bg/surface}  effect Grove/Elevation/4 Modal ✓
├ Header H gap12! pad 20!/20!/20!/24!  border-bottom{border/subtle}
│  ├ Title V gap4 → "Order #1042" Heading/H3 ← ref Title · Badges H gap6 (Paid / Unfulfilled)
│  └ INSTANCE Icon/x 20×20 {icon/secondary}                     ← bare icon close, no button
├ Body V gap16 pad24  FILL → INSTANCE Order Summary (ghost 754:897) · "Ship to" block (Label/M Strong + Body/M ×2)
└ Footer H gap12 pad16/24  border-top → Button[Secondary] "Print label" · Button[Primary] "Fulfil order" (equal FILL widths)
Scrim: RECT 1440×972 {bg/inverse} opacity 0.32 (covers sidebar too)
```
- **Issues:**
  - The close control is a bare icon (fails the 44 hit area).
  - The width 440 is not a token, and there are no size or side variants.
  - The scrim is a page-level RECT bound to `bg/inverse`, which **inverts to white in dark mode** (veil #5c5f5d over the dark canvas). It needs `overlay/scrim`.
  - The component height (820) differs from the instance height (972).
  - Loading, error and long-content scrolling (sticky header and footer) are not shown.
- **API:**

  ```tsx
  <Drawer open onOpenChange side="right" size="md">
    <Drawer.Header title subtitle? meta={<Badges/>} />
    <Drawer.Body />
    <Drawer.Footer />
  </Drawer>
  ```

  It is built on a **Dialog primitive** (modal, focus trap, Esc, inert background, `aria-labelledby` = title, return focus to the triggering row). It becomes a bottom **Sheet** below 640. Motion: enter on `easing/spring` (a JS spring or a `linear()` approximation); exit 140 ms `easing/exit`; scrim fades only. Under reduced motion, use opacity only.
- **RSC:** client (overlay state). The contents can be server-rendered and passed as children (parallel or intercepting route pattern in Next).
- **Package:** `@nizivo/ui`.

---

## 9. Every distinct UI element in the compositions: does a component exist?

Buckets:
- **A** — a canonical Grove set exists (but instances use its ghost twin).
- **A′** — a canonical set exists but the compositions **bypass** it with raw frames.
- **B** — a ghost-only standalone COMPONENT, with no master on any page.
- **C** — no component at all (hand-built frames or shapes).
- **D** — implied by the UI but absent from the page.

| # | Element | Where | Bucket | Component (id) / note |
|---|---|---|---|---|
| 1 | App frame / shell (sidebar + main) | all 10 desktop/tablet frames | C | frames only: **AppShell** needed |
| 2 | Sidebar (expanded / rail) | all | A | Sidebar `7275:14732` (Expanded T/F); no off-canvas mode |
| 3 | Store switcher | sidebar | B | `755:663` |
| 4 | Nav item (+ count) | sidebar, settings menu | A | Nav Item `7275:14700` |
| 5 | Settings sub-nav (vertical nav list) | P7 | C | container ad hoc (Nav Item ×7) → `NavList` |
| 6 | Top bar (desktop) | all desktop/tablet | B | `755:1031` |
| 7 | Mobile top bar | mobile | B | `764:3397` |
| 8 | Mobile tab bar | mobile | A | **`7275:18747`** (this page) |
| 9 | Search field + ⌘K hint | top bar, toolbars, mobile | A + C | Search Field `7275:14764`; **Kbd** missing |
| 10 | Notification bell with unread dot | top bar | C | IconButton exists (`7275:11357`) but bell+dot is baked into Top Bar; **Indicator/Dot** missing |
| 11 | User avatar (account) | top bar | C | **Avatar** missing (image ellipse); account **Menu** missing |
| 12 | Page header (title + meta + actions) | every pattern | C | **PageHeader** missing |
| 13 | Breadcrumb | P2 | B | `755:998` |
| 14 | Segmented control (Range) | Overview, P6, tablet, mobile | A + C | Segment items `7275:14797`; **group container is ad hoc** (p3, r10 off-scale) → `SegmentedControl` |
| 15 | Button (Primary/Secondary/Accent, icons) | everywhere | A | Button `7275:11244` |
| 16 | Icon button | (only inside Banner/Alert/Drawer as bare icons) | A′ | Icon Button `7275:11357` exists but isn't used for close, search or bell |
| 17 | Promo banner (+ 3D media) | Overview desktop | A | Banner `7275:15120`; media slot faked by Live Render |
| 18 | KPI tile (+ Delta + Sparkline) | most pages | A | KPI Tile `7275:13780`, Delta `7275:13743`, Sparkline `7275:13323` |
| 19 | Revenue card (hero trend) | Overview desktop/tablet | B | `752:385` |
| 20 | Compact 7-day bar card | Overview mobile | C | hand-built "Sales" `7275:18915` → `BarChart` compact/spark-bars variant |
| 21 | Ranked list | Overview, P4, P6 | B | `752:444` |
| 22 | Goals (progress list) | Overview desktop | A′ + C | Card bypassed; Progress Bar `7275:13526` |
| 23 | Goals (ring grid) | P6 | C | Progress Ring `7275:13545` ×4 in ad hoc grid |
| 24 | Insight card (+ 3D media) | tablet, P4, P8 | A | Insight Card `7275:13829`; media faked by Live Render |
| 25 | **Card / section panel** (title + "View all" + body) | ~20 places | **A′** | Card `7275:13757` **never used**; every panel is a raw frame |
| 26 | Text link ("View all") | card headers | C | **Link** missing (plain text, 20 px tall) |
| 27 | Data table container (rounded, bordered) | Overview, P1, P3 | C | **Table** primitive missing |
| 28 | Table header row | P1, Overview, P3 | B | `753:410` and `753:599` (two near-duplicates) |
| 29 | Order row | Overview, P3, tablet | A | Order Row `7275:14091` |
| 30 | Product row (selectable) | P1 | A | Product Row `7275:14040` |
| 31 | Bulk-selection action bar | P1 (rows selected) | D | missing |
| 32 | Row actions "…" menu | P1 | D | Menu Item exists (`7275:11516`), **Menu surface/Dropdown** missing |
| 33 | Table toolbar (tabs + search + filters + sort) | P1, P3 | C | pattern frame → `DataTable.Toolbar` |
| 34 | Tabs strip (with baseline) | P1, P3, P4, P5 | A + C | Tab `7275:14781`; **TabList container ad hoc** |
| 35 | Pagination + "Showing 1–20 of 248" | P1, P3 | B + C | `755:1007`; footer ad hoc |
| 36 | Order list item (mobile) | mobile | B | `764:3483` |
| 37 | Grouped list (section label + card list) | Orders mobile | C | **List / ListGroup** missing |
| 38 | Filter chips (single-select) | Orders mobile | C | **FilterChip / ToggleGroup(chip)** missing |
| 39 | Badge (status) | everywhere | A | Badge `7275:11374` |
| 40 | Avatar (customer photo) | rows, cards, mobile | C | **Avatar** missing (ELLIPSE + IMAGE fill) |
| 41 | Product thumbnail | P1 rows | C | inside Product Row; **Thumbnail/Media** primitive missing |
| 42 | Media gallery (+ empty upload tile) | P2 | C | **MediaGallery** missing (`@nizivo/commerce`); Upload `7275:11548` exists |
| 43 | Text input (label + help) | P2 | A | Input `7275:11397` |
| 44 | Variant option (colour swatch / size) | P2 | A | Variant Option `7275:14018` |
| 45 | Switch | P2, P7 | A | Switch `7275:11494` |
| 46 | Checkbox | P2, P1 | A | Checkbox `7275:11456` |
| 47 | Progress bar | P2, Overview, P8 | A | Progress Bar `7275:13526` |
| 48 | Drawer + scrim | P3 | B + C | `756:1001`; scrim RECT |
| 49 | Order summary | Drawer | B | `754:897` |
| 50 | Customer card | P4 | B | `754:530` |
| 51 | Discount card | P5 | A | Discount Card `7275:14130` |
| 52 | Alert (info / warning, dismissible) | P5, mobile | A | Alert `7275:15091` |
| 53 | Funnel chart | P6 | B | `751:319` |
| 54 | Donut chart + legend table | P6 | A | Donut Chart `7275:13455` |
| 55 | Heatmap | P6 | B | `751:393` |
| 56 | Bar chart | P6 | A | Bar Chart `7275:13387` |
| 57 | Area chart + legend + period Select | Revenue Card | A (nested) | `7275:13336`, `7275:13291`, `7275:11438` |
| 58 | Plan card (tiers, "Popular") | P7, P8 | A | Plan Card `7275:14284` |
| 59 | Payment method (radio-like, "Default") | P7 | A | Payment Method `7275:14174` |
| 60 | Setup guide (checklist + progress + step actions) | P8 | C | **Checklist / SetupGuide** missing |
| 61 | Empty state (+ 3D media) | P8 | A | Empty State `7275:15168` |
| 62 | Live Render 3D media (raster) | 5 places | C | absolute RECTs → `media` slot + `@nizivo/motion` `<LiveRender>` |
| 63 | Store mark (square monogram) | mobile top bar, sidebar | C | **Avatar shape="square"** |
| 64 | Two-column layout (8/4, 232/864) | P2, P4, P7, P8, Overview | C | **Split / Columns** layout primitive |
| 65 | Tooltip | (icon-only rail, bell, chart hovers) | D | missing (Chart Tooltip `7275:13303` is chart-only) |
| 66 | Popover / Dropdown (store list, account, notifications) | implied by top bar and sidebar | D | missing |
| 67 | Command menu (⌘K) | implied by search hint | D | ghost `755:889` per 06; not on this page |
| 68 | Date-range picker | "Last 30 days" Select | D | Select used as a stand-in; a real picker is absent |
| 69 | Bottom sheet ("More", mobile drawer) | implied | D | missing |
| 70 | Toast (after Save / Fulfil) | implied | D | Toast exists on 07 (`7275:15071`) but isn't shown here |
| 71 | Skeleton / loading dashboard | — | D | Skeleton `7275:15181` exists; there are no loading, error or empty variants of these pages |
| 72 | Modal | — | D | Modal `7275:15139` exists; not used here |

---

## 10. Prototype reactions (196 nodes)

| Trigger → action | Destination | Transition | Count |
|---|---|---|---|
| ON_HOVER → CHANGE_TO | Nav Item → State=Hover | SMART_ANIMATE **160 ms** cubic(0.2,0,0,1) | 86 |
| ON_HOVER → CHANGE_TO | Button → Secondary/Primary/Accent Hover | 160 ms | 18 / 10 / 2 |
| ON_HOVER → CHANGE_TO | Order Row → Hover | 160 ms | 13 |
| ON_HOVER → CHANGE_TO | Tab → Hover | 160 ms | 13 |
| ON_HOVER → CHANGE_TO | Product Row → Hover | 160 ms | 6 |
| ON_HOVER → CHANGE_TO | Area / Donut / Bar Chart → Hover | 160 ms | 2 / 1 / 1 |
| ON_CLICK → CHANGE_TO | Search Field → State=Focus | **220 ms** | 13 |
| ON_CLICK → CHANGE_TO | Segment → Active | 220 ms | 13 |
| ON_CLICK → CHANGE_TO | Switch On↔Off; Checkbox → unchecked | 220 ms | 6; 1 |
| ON_CLICK → CHANGE_TO | Variant Option → Selected (Colour, Size) | 220 ms | 4 |
| ON_CLICK → CHANGE_TO | Product Row Selected → Default | 220 ms | 2 |
| ON_CLICK → CHANGE_TO | Payment Method → Selected | 220 ms | 1 |
| ON_CLICK → CHANGE_TO | Mobile Tab Bar Home ↔ Orders | 220 ms | 2 |

- The easing (0.2, 0, 0, 1) equals `easing/standard` ✓. 220 ms = `duration/base` ✓. **160 ms hover is off-token**: `duration/fast` is 140 and `duration/instant` is 80. Siblings flagged this too. Code should use `duration/fast` for hover.
- **No navigation reactions** connect the patterns. A row click doesn't open the drawer, and nav items don't link pages. The drawer has no open/close prototype.

---

## 11. Token-binding audit: hard-coded values

**Scope:** composition-level FRAME, TEXT and RECT nodes in all 12 compositions, the Mobile Tab Bar set and the three ghost components on this page. Instance internals are covered by the component pages.

| Property | Bound? | Raw values found → proposed token |
|---|---|---|
| Fills / strokes | **100 % bound** (Grove Color) | none raw. **No non-Grove collections referenced.** |
| Text | **100 % Grove text styles** | none raw |
| Effects | Drawer → `Elevation/4 Modal` ✓; cards have no effect | Scrim = raw RECT with node opacity 0.32 → needs `overlay/scrim` |
| itemSpacing / padding | **0 % bound** | 2 → space/0-5 · **3 → off-scale** (Range track; use 2 or 4) · 4 → space/1 · 6 → space/1-5 · 8 → space/2 · **10 → off-scale** (mobile value row) · 12 → space/3 · **14 → off-scale** (chips p8/14, Top Bar p14, Order List Item p14, Setup Step gap 14) · 16 → space/4 · 20 → space/5 · 24 → space/6 · 32 → space/8 (also grid/margin D) · 40 → space/10 |
| Content padding / gap | unbound but equal to tokens | left/right = `grid/margin`, vertical gap = `grid/gutter` (designers may want `section/gap`) |
| Corner radius | **0 % bound** | 8 → radius/sm · **10 → off-scale** (Range; use sm 8 or md 12) · 12 → radius/md · 16 → radius/lg · 20 → radius/xl (cards) · 28 → radius/2xl · **32 → off-scale** (mobile device frames: presentation only, not product) · 999 → radius/full |
| Widths | unbound | Sidebar 248/76 (vs `layout/sidebar` 264/72) · Drawer 440 (no token → `size/drawer-md`) · Settings menu 232 · aside 360 (= 4 columns) |
| Heights | unbound | Top Bar 71 (14 + 42 + 14 + 1 border) · Mobile Top Bar 57 · Tab Bar 97 (8 + 64 + 24 + 1). Propose `size/topbar` 64 and `size/tabbar` 64 (+ safe area). |

---

## 12. Architecture proposal for this page's scope (layout, shell, templates)

Goal (user request): everything **pluggable, swappable and changeable later**. These rules follow from the findings above.

### 12.1 Package layering (one-directional dependencies)
```
@nizivo/tokens        CSS vars (--nz-*), JS token objects, breakpoints {sm:640, lg:1280*}, Grove Responsive modes → media-query overrides
   ↓
@nizivo/ui            primitives + layout (Box, Stack, Inline, Grid, Container, Split, Section/Card, Divider, ScrollArea)
                      + behavior primitives (Dialog/Sheet/Drawer, Popover, Menu, Tooltip, Tabs, ToggleGroup)
                      + shell entry `@nizivo/ui/shell` (AppShell, Sidebar, TopBar, MobileTopBar, MobileTabBar, PageHeader, NavProvider)
   ↓
@nizivo/charts        Area/Bar/Donut/Funnel/Heatmap/Sparkline (03)
@nizivo/commerce      OrderRow/OrderList/OrdersTable, ProductRow, CustomerCard, OrderSummary, MediaGallery, PlanCard … (05)
@nizivo/dashboard*    KPI Tile, Revenue/Trend Card, Ranked List, Insight Card (04 calls it @nizivo/dashboard; normalize w/ orchestrator — could live in @nizivo/ui as "widgets")
@nizivo/motion        LiveRender (lazy 3D/shader media), count-up, spring presets
   ↓
templates (NOT a runtime dependency)  → shadcn-style **registry blocks** (`npx nizivo add overview-dashboard`)
                      copied into the app, owned by the app, built only from public components
```
*The breakpoint `lg` value and the dashboard package name are pending decisions.*

Templates are copied into the app rather than imported. Apps can then change any template without forking the library. The library keeps the stable primitives, and the registry keeps the opinionated recipes.

### 12.2 Layout primitives (all RSC-safe, CSS-only, token-driven)
| Primitive | API sketch | Notes |
|---|---|---|
| `Box` | `<Box as asChild p="6" bg="surface" radius="xl" …/>` | polymorphic base. Props map to tokens only, so raw numbers can't be passed. |
| `Stack` / `Inline` | `<Stack gap="6" align justify />`, `<Inline gap="2" wrap />` | gap accepts token keys or responsive objects `{base:'4', sm:'5', lg:'6'}` |
| `Container` | `<Container size="content" padding="margin" />` | `max-inline-size: var(--nz-layout-content-max)`; padding = `var(--nz-grid-margin)` (per breakpoint) |
| `Grid` / `Grid.Item` | `<Grid columns="auto" gap="gutter"><Grid.Item span={{base:4, sm:8, lg:8}} /></Grid>` | `--nz-grid-columns` 4/8/12 per breakpoint. `span="full"`. Also `<Grid minItemWidth="16rem">` (auto-fit) for KPI rows, so widget count is a plug-in detail. |
| `Split` | `<Split aside="360px" side="end" collapseBelow="lg" gap="gutter">` | the recurring 8/4 main + aside (Overview, P2, P4, P8) and the 232/864 Settings sub-nav |
| `Section` (= Card) | `<Section title actions={<Link>View all</Link>} footer padding="lg" flush>` | **the single surface primitive** replacing ~20 raw frames. `flush` gives full-bleed tables (tablet Recent orders). `tone="tinted|surface|inverse"`. |
| `ScrollArea` | `<ScrollArea axis="x">` | wraps tables under narrow containers |
| Visibility | `<Show above="lg">`, `<Hide below="sm">` | **CSS** (`display:none` in media or container queries), not JS, to keep hydration stable |

**Responsive engine:** the Grove Responsive variables become CSS custom properties redefined at `@media (min-width: 640px)` and `(min-width: 1280px)`. Widgets use **container queries** (`container-type: inline-size` on `Section` and `Grid.Item`). A KPI Tile or Orders block then adapts to its slot (4-up, 2-up, 1-up; table vs list) whether it sits in a dashboard, an aside or a drawer.

### 12.3 Shell and navigation (config-driven)
```ts
// app/nav.ts — the single source; drives Sidebar, Rail, MobileTabBar, More sheet, CommandMenu, Breadcrumb
export const nav: NavItem[] = [
  { id:'home', label:'Home', href:'/', icon: HomeIcon, mobile:'tab' },
  { id:'orders', label:'Orders', href:'/orders', icon: ShoppingBagIcon, badge: () => counts.unfulfilled, mobile:'tab' },
  { id:'products', …, mobile:'tab' }, { id:'customers', …, mobile:'tab' },
  { id:'analytics', …, mobile:'more' }, { id:'marketing', …, mobile:'more' }, { id:'discounts', …, mobile:'more' },
  { id:'instagram', …, icon: InstagramIcon /* brand icon via separate adapter */, mobile:'more' },
  { id:'settings', …, group:'footer', mobile:'more', children:[ {id:'general'}, {id:'billing', label:'Plan & billing'} … ] },
];
```
```tsx
<NizivoProvider linkComponent={NextLink} imageComponent={NextImage} icons={lucideAdapter} locale="en-GB">
  <AppShell
    nav={nav} activeId="orders"                // or <NavProvider pathname>
    sidebar={{ header:<StoreSwitcher/>, collapsible:{ sm:'icon', lg:'expanded' }, footer:'auto' }}
    topbar={<TopBar title="Orders" search={<CommandTrigger/>} actions={<><NotificationsButton/><AccountMenu/></>} />}
    mobileTopbar="auto"                         // derives from topbar: title + icon actions (≥44 hit area)
    mobileNav="tabs"                            // 'tabs' | 'drawer' | 'none'
    overlay={<DrawerOutlet/>}                   // portal root; scrim token
  >
    <Page>
      <PageHeader title="Orders" breadcrumb={…} meta={<Badge/>} actions={…} />
      <Page.Content>…</Page.Content>            // Container + Stack gap="section"
    </Page>
  </AppShell>
</NizivoProvider>
```
- **AppShell** is a CSS-grid layout (`grid-template-areas: "nav top" "nav main"`, collapsing to `"top" "main" "tabbar"` below 640) with semantic landmarks (`<nav>`, `<header>`, `<main id="main">`), a "Skip to content" link and focus-to-`<h1>` on route change.
- Sidebar modes: `expanded | icon (rail) | offcanvas | hidden`. The width comes from `layout/sidebar` once the drift is resolved. The state is stored in a cookie by `SidebarProvider` (client). Rail items need a **Tooltip** with the label.
- **Slots:** every region is a ReactNode slot with a sensible default, so a team can unplug the TopBar, swap the store switcher, or drop the tab bar for a drawer without touching internals.
- **Adapters (plug points):** link and router, image, icons (Lucide default; brand icons separate), number, currency and date formatting (Intl), media (`<LiveRender>` or static `<img>`).
- **RSC:** AppShell, Page, PageHeader and Section are server components. Client islands: `SidebarProvider` and its toggle, `CommandTrigger`, Notifications popover, Account menu, More sheet, Drawer.

### 12.4 Dashboard composition (widgets are plug-in or plug-out)
```tsx
<DashboardGrid>
  <DashboardGrid.Item span={{ base:'full', sm:4, lg:3 }}><KpiTile …/></DashboardGrid.Item>
  <DashboardGrid.Item span={{ base:'full', lg:8 }}><TrendCard compactBelow="sm" …/></DashboardGrid.Item>   // Revenue ↔ 7-day bars
  <DashboardGrid.Item span={{ base:'full', lg:4 }} hideBelow="lg"><GoalsCard/></DashboardGrid.Item>
</DashboardGrid>
// or data-driven: <DashboardGrid widgets={[{id:'sales', span, render}]} />  → enables a future user-customizable dashboard (@nizivo/lab)
```

### 12.5 Page templates (registry blocks) derived from the 12 frames
| Block | Source | Recipe |
|---|---|---|
| `overview-dashboard` | `7275:15337`, `7275:18792`, `7275:18887` | PageHeader (greeting + SegmentedControl range + Export) → Banner (dismissible, `media`) → KPI grid → Split(TrendCard \| Stack(RankedList, Goals or Insight)) → Section(Recent orders: OrdersTable ↔ OrderList) |
| `resource-index-table` | P1 `7275:15757`, P3 `7275:15971` | PageHeader(actions) → [KPI grid] → Section(flush){ DataTable.Toolbar(Tabs + Search + Filters/Sort) · DataTable(selectable, row menu, bulk bar) · DataTable.Footer(range text + Pagination) } |
| `resource-index-with-drawer` | P3 | resource-index-table + row → `<Drawer>` (URL-addressable, e.g. `?order=1042` or an intercepting route), Sheet below 640 |
| `resource-detail-form` | P2 `7275:15860` | Breadcrumb · PageHeader(status Badge, Preview, Save) · Split(main: Media/Details/Variants/Pricing sections \| aside: Status/KPI/Inventory) · sticky save bar on mobile (**not designed**) |
| `card-grid-index` | P4 `7275:16097`, P5 `7275:16204` | PageHeader → [Alert] → KPI grid → Tabs → Grid(auto-fit cards) [+ aside] |
| `analytics-report` | P6 `7275:16296` | PageHeader(range + export) → KPI grid → DashboardGrid of chart Sections (spans **must** snap to 12 columns: fix 798/314 etc.) |
| `settings-with-subnav` | P7 `7275:16412` | PageHeader → Split(aside 232: NavList \| main: Sections); the sub-nav becomes a Select or list page below 640 (**not designed**) |
| `onboarding-home` | P8 `7275:16478` | PageHeader → Split(main: SetupGuide checklist + EmptyState \| aside: InsightCard + PlanCard) |
| `mobile-overview`, `mobile-list` | `7275:18887`, `7275:18979` | the same blocks at < 640; the Orders list adds FilterChips + grouped ListGroup + sticky Create (FAB or top button) |

### 12.6 Missing building blocks this page needs from `@nizivo/ui`
Avatar (image, initials, square store mark; sizes 28/32/40/52), Link, Kbd, Indicator dot, SegmentedControl (wraps Segment), FilterChip + ChipGroup (single and multi; ToggleGroup semantics), TabList container, Table / DataTable (head, row, cell, selection, sort, sticky header, bulk bar, row menu, responsive list presentation), ListGroup, PageHeader, Section/Card adoption, Split, Grid, Container, Stack, Drawer and Sheet on the Dialog primitive, Popover, Menu (dropdown surface for Menu Item), Tooltip, Checklist/SetupGuide, DateRangePicker (to replace the Select stand-in), `overlay/scrim` token, `size/topbar`, `size/tabbar`, `size/drawer-*` tokens.

---

## 13. Accessibility notes (this page)

- **Contrast** (from snapshot hexes):
  - `text/tertiary` on white is **4.31:1 (L)** and **4.03:1 (D)**. It fails AA for 14 px text and is used for "Last 7 days", the Order List Item meta and axis labels. Use `text/secondary` (6.48 / 6.87) or darken the token.
  - `text/brand` "View all" is 8.51 (L) and 7.58 (D) ✓.
  - The active filter chip (inverse) is 17.36 ✓.
  - Inactive chip border `border/default` vs white is 1.27:1. The chip boundary is weak, but the text identifies it.
  - Card boundaries: `border/subtle` vs white 1.15, and surface vs canvas 1.08. These are decorative, which is acceptable.
- **Hit targets vs `size/touch-min` 44 on mobile:**
  - Bare icons in Mobile Top Bar (search, bell), the Drawer close, and the Banner/Alert dismiss are 20×20 ✗.
  - Segments 32 h ✗. Filter chips 36–38 h ✗. Search Field 39 h ✗. Button Md 40 ✗ (marginal).
  - The "View all" link is about 20 px tall ✗.
  - Tab bar items 75×64 ✓. Order List Item 78 h ✓.
- **Semantics:**
  - Page titles: mobile uses an H2 style for the page title. Code must still render `<h1>`.
  - The greeting "Good morning, Maya" acts as the page `<h1>` on Overview, while the Top Bar title "Overview" is a second visible title, so they must not both be h1s.
  - Tables need `<table>` with a `<caption>` or `aria-labelledby` ("Recent orders"), `scope="col"`, and `aria-sort` on sortable columns. A selection column needs a "Select all" checkbox with an indeterminate state.
  - The Range group is a radio group (SegmentedControl, `role="radiogroup"` or a ToggleGroup with single selection), and changing it must announce the updated data (`aria-live="polite"` on the KPI region, or focus management).
  - Chips: the single-select status filter is a `radiogroup` (or a tablist if it switches views).
  - Drawer: modal dialog semantics (see §8.3).
  - The tablet rail needs tooltips plus `aria-label`s.
- **Motion:** honor `prefers-reduced-motion` with the Motion "Reduced" mode tokens (durations become 0 or 120, easing linear). That covers count-up KPIs, chart draws and drawer springs.

---

## 14. Design gaps and questions for the design team

1. Relink all page-08 instances to the canonical `7275:*` sets, including the page's own Mobile Tab Bar. Promote Top Bar, Mobile Top Bar, Order List Item, Drawer, Breadcrumb, Pagination, Table Header (merge the two), Revenue Card and Ranked List to real sets with properties.
2. Use `Card` for every panel, or retire it.
3. Bind all spacing and radius to Grove Space. Fix the off-scale values 3, 10, 14 and 32.
4. Confirm breakpoints: `sm 640` (documented) vs 768 (01 proposal), and define the rail→expanded threshold (proposed 1280).
5. Reconcile `layout/sidebar` (264/72) with the frames (248/76). Decide whether `section/gap` or `grid/gutter` sets vertical rhythm. Fix the tablet `content-max` (rail-aware: 900?). Bind type/h1 and type/kpi responsively.
6. Make KPI rows and Analytics rows snap to the column spans, or explicitly allow auto-fit for KPI rows.
7. Range: tablet shows 3 options and mobile shows 5. Pick a rule.
8. Add an `overlay/scrim` token with light and dark values. Add dark-mode elevation.
9. Mobile Tab Bar: add all 5 Active values (or an item component with an Active boolean), a badge/count, a pressed state, a "More" sheet and a long-label rule.
10. Missing screens and states:
    - Mobile versions of Patterns 1–8 (detail form, settings sub-nav, analytics, drawer → sheet).
    - Loading, skeleton, error and empty states for dashboard widgets.
    - The bulk-action bar.
    - Row menu, account menu, store-switcher list, notifications popover and command menu.
    - Date-range picker.
    - Toast after Save or Fulfil.
    - Sticky mobile save bar.
    - Sidebar off-canvas mode for tablet portrait.
11. Replace the "Live Render" overlays with a proper `media` property or slot on Banner, Insight Card and Empty State, and specify the 3D/shader fallback (static image, reduced motion, low-power).
12. Use IconButton (≥ 44 on touch) for every icon-only control (search, bell, close, dismiss, row "…").
13. Hover duration 160 ms → `duration/fast` (140).
14. Write component descriptions (all empty on this page).

---

## 15. Extraction gaps

- Instance internals (Top Bar, Sidebar, Store Switcher, KPI Tile, Revenue Card, Ranked List, Customer Card, Discount Card, Plan Card, Order Summary, Drawer "Badges", Pattern 7 "Tiers", Pattern 2 "Gallery") were not traversed. They are covered by reports 04, 05, 06 and 07, or summarized from the screenshots.
- The image contents of the "Live Render" RECTs were identified visually from the screenshots only (3D box, sphere and shop box). Image hashes and sources were not inspected.
- No separate high-resolution screenshot was taken of Mobile Tab Bar or individual patterns. The 3000 px section shots were sufficient for the visual language. The Patterns shot is at about 0.48× scale, so small text in Patterns was read from data rather than pixels.
- Ghost-component origins (another file, or deleted pages) can't be resolved through the Plugin API: the parent chain is empty and `removed=false`.
- Token audit scope: composition-level nodes to depth 3–4 below Content, plus the Mobile Tab Bar set and the three ghost components. Nodes deeper inside instances were not scanned for non-Grove variable references.
- The Responsive "Stage" frames' dashed borders seen in the screenshot (doc chrome) were not read for bindings.
