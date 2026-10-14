# Grove · 05 Commerce — architecture analysis for Nizivo UI

- Figma file: `BIzJFf1wm8KP0YG2AVI1tP` (Grove UI Library), page **05 Commerce** `7275:13983`, section **Grove · 05 Commerce** `7275:13984` (4000×3229).
- Read 2026-10-14, read-only: 8 `use_figma` scripts (the first exceeded the 20KB return limit and returned no data) plus 4 `get_screenshot` calls, 12 Figma calls in total. No writes.
- Screenshots: `scratchpad/figma/shots/05-commerce-section.png` (whole section), `05-commerce-product-card.png`, `05-commerce-plan-card.png`, `05-commerce-shipment-tracker.png`.
- Token names refer to `00-tokens-and-styles.md`. `{token}` means bound to a variable. `RAW n` means a hard-coded value.

---

## 0. TL;DR

1. **There are 8 live component sets, and 2 more "components" exist only as orphans.** Customer Card (`754:530`) and Order Summary (`754:897`) appear on the page only as instances of main components with `parent=null`, so no live master exists for either.
2. **The biggest file-hygiene bug is orphaned masters.** Every nested instance on this page points to orphaned main components with `parent=null`, `remote=false` and `removed=false`. These are components kept alive only by their instances and sitting on no page. The affected masters are:
   - Badge `744:315` (variants `744:293/296/299/302/305/308`), not the live Grove Badge `7275:11374`
   - Button `744:263` (`744:105`, `744:210`, hover targets `744:112`, `744:217`), not Grove Button `7275:11244`
   - all icons `Icon/*` `738:*`
   - Table Header `753:410` and Order Table Header `753:599`
   - **Product Row `753:476`** and **Order Row `753:644`**: the example tables use these, *not* the live sets `7275:14040` / `7275:14091` on the same page.

   Editing the Grove Badge, Button or rows will not propagate here. This must be fixed in Figma before Code Connect mapping.
3. **Token hygiene is good on colour and partial on space.** All bindings resolve to **Grove Color (1096)** and **Grove Space (247)**: no Clario/Pipkin/Merit/etc. references, no unstyled text, and all text uses `Grove/*` styles. However, most `itemSpacing` and roughly half of the paddings are RAW. Every pill uses `RAW 999` instead of `{radius/full}`, all stroke weights are RAW, and several values are off-scale (3, 5, 6, 10, 14).
4. **Primitives are redrawn instead of composed.** The Product Row checkbox is a hand-drawn frame and the Payment Method radio is a raw ellipse with a 5px stroke. The Discount usage meter is a raw track (Progress Bar `7275:13526` exists), and "More" is a bare 20px icon with no Icon Button. All of these are below the 44px touch-min.
5. **Selection causes layout shift.** The stroke width grows on select: Variant Option goes from 90×40 to 92×42, and Payment Method from 73 to 74px tall.
6. **`text/tertiary` fails AA for body text.** It measures 4.31:1 on white, 4.16 on bg/subtle and 4.03 on bg/inverse, and this page uses it for SKU, inventory, dates, expiry and plan taglines. The Expired discount uses `opacity: 0.70`, which drops tertiary text to 2.57:1.
7. **Architecture verdict:** almost everything on this page is a **composition** of core primitives plus formatting. Put the *behaviour primitives* in `@nizivo/ui`:
   - `ChoiceGroup` with `ChoiceChip` / `ChoiceCard` (native radios)
   - `Steps`
   - `Table` with row selection
   - `Meter`
   - `Media` / `AspectRatio`
   - `Avatar`
   - `Badge`

   Put the thin domain compositions in `@nizivo/commerce`, with subpath exports and a copy-paste registry. Only `Money`/`Price`, `Quantity`, the status→tone maps and `OrderTotals` are genuinely new commerce primitives.

---

## 1. Page inventory (section children)

| Doc frame | id | Contents | Notes |
|---|---|---|---|
| Doc/Product card | `7275:13985` | Header `7275:13986`, **Product Card** set `7275:13989` | |
| Doc/Variant option | `7275:14014` | Header `7275:14015`, **Variant Option** set `7275:14018` | |
| Doc/Product table | `7275:14034` | Header `7275:14035`, Stage `7275:14038` (Table Header instance → orphan `753:410`), **Product Row** set `7275:14040`, Example · Products table `7275:14078` | Example rows are instances of orphan Product Row `753:476` |
| Doc/Order row | `7275:14085` | Header `7275:14086`, Stage `7275:14089` (Order Table Header → orphan `753:599`), **Order Row** set `7275:14091`, Example · Orders table `7275:14114` | Example rows are instances of orphan Order Row `753:644` |
| Doc/Customer card | `7275:14120` | Header `7275:14121`, Stage `7275:14124` → instance of orphan **Customer Card** `754:530` | No live component |
| Doc/Discount | `7275:14126` | Header `7275:14127`, **Discount Card** set `7275:14130` | |
| Doc/Payment method | `7275:14170` | Header `7275:14171`, **Payment Method** set `7275:14174` | |
| Doc/Shipment tracker | `7275:14191` | Header `7275:14192`, **Shipment Tracker** set `7275:14195` | |
| Doc/Plan card | `7275:14280` | Header `7275:14281`, **Plan Card** set `7275:14284` | |
| Doc/Order summary | `7275:14346` | Header `7275:14347`, Stage `7275:14350` → instance of orphan **Order Summary** `754:897` | No live component |

Every component set frame itself has a dashed `{border/brand}` 1px stroke, `RAW 16` radius and 24px padding. These are Figma presentation chrome, not part of any component.

### 1.1 Documentation text (verbatim; Header titles use `Grove/Heading/H2`, body uses `Grove/Body/M`)

| Text id | Title | Guidance |
|---|---|---|
| `7275:13987/13988` | Product card | "Catalogue tile. Photo first, then name, price and status." |
| `7275:14016/14017` | Variant option | "Colour swatches and size chips for product options." |
| `7275:14036/14037` | Product table | "Bulk-editable catalogue. Rows hover to subtle, select to brand tint." |
| `7275:14087/14088` | Order row | "Order list. Payment and fulfilment read as two separate badges." |
| `7275:14122/14123` | Customer card | "Who they are, what they are worth, how to reach them." |
| `7275:14128/14129` | Discount | "A code, what it gives, how much of it is used." |
| `7275:14172/14173` | Payment method | "Saved methods as a radio list. The default carries a badge." |
| `7275:14193/14194` | Shipment tracker | "Four steps, one line. The current step carries the date." |
| `7275:14282/14283` | Plan card | "Subscription tiers. The recommended tier is the only dark card." |
| `7275:14348/14349` | Order summary | "Line items and the maths, totals right-aligned." |

No `description` or `documentationLinks` are set on any COMPONENT_SET or variant: all are empty. There are no a11y notes, motion specs or do/don't guidance on the page.

Sample content in the examples, useful for fixtures and stories:
- **Products:** Stoneware mug GRV-MUG-014 Active 124 in stock $28.00; Fig & cedar candle GRV-CND-002 Draft 36 $34.00; Studio headphones GRV-AUD-101 (selected) 18 $189.00; Night serum GRV-SKN-207 **Low stock** 4 in stock $52.00; Market tote GRV-BAG-031 Sold out 0 $46.00.
- **Orders:** #1042 Oct 14, 09:12 Maya Lindqvist Paid / Unfulfilled $112.00; #1041 Jonah Okafor Paid / Fulfilled $64.00; #1040 Priya Raman Pending / On hold $238.50; #1039 Leo Marchetti Refunded / Fulfilled $46.00.
- **Customer:** Jonah Okafor, jonah@okafor.studio, Orders 14, Lifetime $1,284, Avg. order $91.70, VIP, Subscriber.
- **Order summary:** Order #1042: Stoneware mug "Moss · 350 ml" ×2 $56.00; Fig & cedar candle "220 g" ×1 $34.00; Ceramic planter "Small" ×1 $22.00; Subtotal $112.00; Shipping Free; Tax $9.24; Total $121.24.

### 1.2 Prototype reactions (all `SMART_ANIMATE`, `cubic-bezier(0.2, 0, 0, 1)` = `easing/standard`)

| Node | Trigger | → Destination | Duration |
|---|---|---|---|
| Variant Option `7275:14019` (Colour/Default) | ON_CLICK | `7275:14022` Selected | 220ms (= `duration/base`) |
| Variant Option `7275:14028` (Size/Default) | ON_CLICK | `7275:14030` Selected | 220ms |
| Product Row `7275:14041` Default | ON_HOVER | `7275:14053` Hover | **160ms (no token; `duration/fast`=140)** |
| Product Row `7275:14053` Hover | ON_CLICK | `7275:14065` Selected | 220ms |
| Product Row `7275:14065` Selected | ON_CLICK | `7275:14041` Default | 220ms |
| Example product rows `7275:14080/81/83/84` | ON_HOVER | `7275:14053` | 160ms |
| Example product row `7275:14082` | ON_CLICK | `7275:14041` | 220ms |
| Order Row `7275:14092` Default and example rows `7275:14116–14119` | ON_HOVER | `7275:14103` Hover | 160ms |
| Payment Method `7275:14175` Default | ON_CLICK | `7275:14183` Selected | 220ms |
| Plan Card buttons `7275:14302`, `7275:14345` | ON_HOVER | orphan `744:112` (Secondary/Hover) | 160ms |
| Plan Card button `7275:14324` | ON_HOVER | orphan `744:217` (Accent/Hover) | 160ms |

Selection prototypes are one-way (Default→Selected) except Product Row, which toggles. The example rows hover-swap into the *live* set variant `7275:14053`, while their own main component is the orphan `753:476`, so the set references are mixed.

---

## 2. Visual language (from screenshots)

- **Canvas and surfaces:** warm off-white canvas (`bg/canvas` #f6f7f4) with white cards (`bg/surface`) and hairline `border/subtle` outlines. Cards are flat: no elevation except the featured Plan Card (`Grove/Elevation/3 Popover`).
- **Radius:** generous. Cards use `radius/xl` 20, Plan Card `radius/2xl` 28, Payment rows `radius/lg` 16, and chips and nodes are pills/circles. Inner media use 14 (Product Card), 8/10 (thumbnails) and 6 (card-brand mark).
- **Colour:** restrained. Forest green `bg/brand` #1a573a is reserved for selected/current/brand badge/checkbox fill, and lime `bg/accent` #c6e06a appears only on the featured plan CTA. Status uses tinted badges with a leading dot (success/warning/critical/info/neutral/brand).
- **Typography:** Geist for UI, with **Geist Mono** for codes (order #, SKU, discount code, card PAN, quantities "×2"). Money uses the `Numeric/*` styles (tabular-nums per style description), right-aligned in tables and summaries.
- **Density:** medium. Table rows are 57px (orders) and 65px (products) with 24px column gaps and 20px row inset. Cards have 24px padding (Discount/Plan/Customer/Summary) or 12px (Product Card).
- **No glass, gradients or spring motion on this page.** Motion is limited to hover tint and selection swap.
- **Photography:** warm, natural, square-ish crops: Product Card media is 238×220 (≈1.08:1). Thumbnails are 40px (row) and 48px (summary), and avatars are 28px (row) and 52px (customer card).
- **Featured-plan treatment:** the dark inverse card is raised and taller with a "Popular" brand badge and lime CTA. In **dark mode** `bg/inverse` resolves to `neutral/0` (white), so the "only dark card" becomes the only *light* card. This needs an explicit design decision; it was not visually verified.

---

## 3. Components

Common legend for anatomy lines: `AL:H/V pad=t/r/b/l gap=` describes auto-layout, and `sz=` gives horizontal/vertical sizing (F=fixed/fill, H=hug).

### 3.1 Product Card — `7275:13989` (906×361)

**Raw componentPropertyDefinitions (read on the COMPONENT_SET)**
```
Status :: VARIANT default="Active" options=[Active,Draft,Sold out]
```
**Variant matrix:** 3/3 exist, each 264×311.
- `7275:13990` Status=Active (default)
- `7275:13998` Status=Draft
- `7275:14006` Status=Sold out

**Anatomy (default variant `7275:13990`)**
```
Status=Active  COMPONENT AL:V pad={space/3}/{space/3}/{space/4}/{space/3} gap=RAW 14  sz=Fill/Hug 264x311
               r={radius/xl} fill={bg/surface} stroke={border/subtle} w=RAW1 INSIDE
  Media        FRAME (no auto-layout) 238x220 FIXED height, r=RAW 14, fill=IMAGE scaleMode FILL (=object-fit:cover), clip
    Badge      INSTANCE orphan Badge/Tone=Success#744:296 {Dot=true, Label=Active, Tone=Success}, positioned x=10,y=10 (constraints MIN/MIN), 74x26
  Meta         FRAME AL:V pad=0/RAW4/0/RAW4 gap=RAW4
    Row        FRAME AL:H SPACE_BETWEEN/CENTER
      name     TEXT Grove/Label/L {text/primary} "Stoneware mug" (auto-width, no truncation)
      price    TEXT Grove/Numeric/M {text/primary} "$28.00"
    stock      TEXT Grove/Body/M {text/tertiary} "124 in stock"
```
**Variant diffs**
- **Draft:** Badge becomes Neutral `744:293` "Draft" `{bg/muted}`; meta line "Not published" `{text/tertiary}`.
- **Sold out:** Badge becomes Critical `744:302` "Sold out" `{bg/critical-subtle}`; meta line "0 in stock" `{text/critical}`.
- Sample copy (name and price) also changes per variant, so the variants mix content with state.

**Hard-coded values**
- gap 14 (off-scale)
- Media radius 14 (off-scale and not concentric: `radius/xl` 20 − `space/3` 12 = 8)
- Badge inset 10 (off-scale)
- Meta padding and gap 4 (`space/1` unbound)
- stroke width 1 (`border-width/default` unbound)
- Media height fixed at 220 rather than an aspect ratio

**States:** none beyond status. No hover/pressed/focus (the card is presumably clickable), no loading/skeleton, no image-missing fallback.

**Issues**
- The `Status` axis conflates **publication status** (Active/Draft) with **inventory status** (Sold out). These are orthogonal, since an Active product can be sold out. The Example table also shows a 4th state, **Low stock** (warning badge + `text/warning` count), which has no Product Card variant.
- There are no TEXT or INSTANCE_SWAP properties: name, price and stock are raw overrides, so Figma cannot hide the badge or the stock line.
- Long product names have no truncation (`WIDTH_AND_HEIGHT`) and will collide with the price in the `SPACE_BETWEEN` row.
- "124 in stock" uses `text/tertiary` at 4.31:1 on white, which fails AA at 14px.
- This is an *admin* catalogue tile. A storefront card needs compare-at/sale price, price ranges ("From $28"), swatches, rating, quick-add and wishlist. Coordinate with page 10 (Shoppable Post / Tagged Product), which also presents products.
- The Badge is an orphan instance, not Grove Badge `7275:11374`.

**Proposed API** (`@nizivo/commerce/product`): compound parts plus a convenience preset.
```tsx
<ProductCard.Root href? asChild? orientation="vertical">   // <article>; whole card link via stretched-link pattern
  <ProductCard.Media ratio="1/1" fit="cover" src alt badge={<StatusBadge …/>} />  // Media wraps core <Media>; image component injectable
  <ProductCard.Body>
    <ProductCard.Title lines={2}>Stoneware mug</ProductCard.Title>
    <ProductCard.Price><Price value={money} compareAt? /></ProductCard.Price>
    <ProductCard.Meta>{inventory}</ProductCard.Meta>
  </ProductCard.Body>
  <ProductCard.Actions>{/* optional quick-add, wishlist */}</ProductCard.Actions>
</ProductCard.Root>
// preset
<ProductCard product={{ title, image, price, status: 'active'|'draft'|'archived', inventory: { quantity, lowStockThreshold } }}
             statusMap? renderImage? href? />
```
Map `Status` to a derived badge: `publication status + inventory → { tone, label }` through an overridable `productStatusMap`.

- **RSC:** server. There is no state, the link is plain `<a>`, and quick-add actions are passed in as client islands.
- **Tier:** pattern (composition). **Package:** `@nizivo/commerce` (also in the copy-paste registry).
- **A11y:** `<article>` with the heading as the link target, and `alt` required (or `alt=""` with an adjacent title). The badge text must not rely on dot colour.

---

### 3.2 Variant Option — `7275:14018` (640×92)

**Raw componentPropertyDefinitions**
```
Type  :: VARIANT default="Colour" options=[Colour,Size]
State :: VARIANT default="Default" options=[Default,Selected,Disabled]
```
**Variant matrix:** 6/6 exist.

| Type | Default | Selected | Disabled |
|---|---|---|---|
| Colour | `7275:14019` (90×40) | `7275:14022` (92×42) | `7275:14025` |
| Size | `7275:14028` (48×40) | `7275:14030` (49×40) | `7275:14032` |

**Anatomy (default `7275:14019`)**
```
Type=Colour,State=Default  COMPONENT AL:H pad=RAW 6/12/6/6 gap=RAW 8 align CENTER  minHeight=RAW 40
                           r=RAW 999 fill={bg/surface} stroke={border/default} w=RAW1 INSIDE
  Swatch  ELLIPSE 26x26 fill={chart/primary}
  Moss    TEXT Grove/Label/M {text/primary}
Type=Size: pad=RAW 6/16/6/16 minWidth=RAW 48 minHeight=40; label "M" Grove/Label/M Strong
```
**Diffs**
- **Selected:** stroke becomes `{border/brand}` at width RAW 2, which grows the chip to **92×42** (Colour) and **49×40** (Size), so selection shifts the layout. `strokeAlign` is INSIDE; the likely mechanism is stroke-included-in-layout, but `strokesIncludedInLayout` was not read.
- **Disabled:** fill `{bg/disabled}`, swatch `{chart/neutral}` (the real colour is lost), text `{text/disabled}`.
- **Reactions:** Default→Selected on click, 220ms.

**Hard-coded values:** radius 999 (`radius/full` exists, unbound), padding 6/12/16, gap 8, min sizes 40/48 (`size/control-md` unbound), stroke widths 1/2 (`border-width/default` and `border-width/focus` unbound), swatch 26.

**Issues**
- The swatch colour is bound to a **chart token**. A product colour is *data* and must come from the variant (hex, or an image/pattern swatch). Light colours such as white or cream need an inner ring.
- Disabled (out of stock) replaces the colour with grey. Common practice keeps the colour and adds a diagonal strike or reduced opacity, plus "Sold out" in the accessible name.
- There is no hover, focus-visible or pressed state.
- The 40px height is below the 44px touch-min.
- Selected differs from Default only by border colour and width. That is a non-colour cue, but it is subtle; a check mark or a thicker inset ring would help.
- `Colour` is British spelling, so the code prop should be `color`.
- There is no group component (label "Colour: Moss", legend, wrapping).

**Proposed API**
- In `@nizivo/ui` (primitive): `ChoiceGroup` (radio semantics, `type="single"`; `multiple` uses checkboxes) with `ChoiceChip`.
- In `@nizivo/commerce`: `VariantPicker` presets.
```tsx
<ChoiceGroup name="color" value? defaultValue? onValueChange? legend="Colour" orientation="horizontal" wrap>
  <ChoiceChip value="moss" disabled? leading={<ColorSwatch color="#2e5a3c" />}>Moss</ChoiceChip>
</ChoiceGroup>
<VariantPicker option={{ name: 'Size', values: [{ value: 'M', available: true }] }} display="chip"|"swatch"|"select" />
```
- **Behaviour:** native `<input type="radio">` (visually hidden) inside a `<label>`, styled with `:has(:checked)` and `:has(:focus-visible)`. Arrow-key roving and form submission come for free, so no headless library is needed.
- **Unavailable values:** keep them focusable using `aria-disabled` plus visible "Sold out" text, rather than `disabled`, so screen-reader users learn the value exists.
- **RSC:** split. The markup is server-safe and works inside a `<form>` with no JS; `onValueChange` or controlled mode requires a client wrapper.
- **Tier:** primitive (ChoiceChip) plus composite (VariantPicker). **Package:** `@nizivo/ui` + `@nizivo/commerce`.

---

### 3.3 Product Row — `7275:14040` (968×269)

**Raw componentPropertyDefinitions**
```
State :: VARIANT default="Default" options=[Default,Hover,Selected]
```
**Variant matrix:** `7275:14041` Default, `7275:14053` Hover, `7275:14065` Selected (all 918×65).

**Anatomy (default)**
```
State=Default  COMPONENT AL:H pad=RAW 12/20/12/20 gap=RAW 24 counter=CENTER fill={bg/surface}
               stroke={border/subtle} bottom-only 0/0/1/0 INSIDE
  Checkbox     FRAME 18x18 r=RAW 5 fill={bg/surface} stroke={border/strong} w=RAW 1.5   ← hand-drawn, NOT Grove Checkbox 7275:11456
  Product      FRAME 340 fixed, AL:H gap=RAW 12
    Thumbnail  RECTANGLE 40x40 r=RAW 8 IMAGE/FILL
    Name       AL:V gap=RAW 2: "Stoneware mug" Grove/Label/M Strong {text/primary}; "GRV-MUG-014" Grove/Mono/M {text/tertiary}
  Status       FRAME 120 fixed → Badge orphan 744:296 "Active"
  inventory    TEXT 160 fixed Grove/Body/M {text/secondary} "124 in stock"
  price        TEXT 100 fixed Grove/Numeric/M {text/primary} right-aligned "$28.00"
  More         INSTANCE Icon/ellipsis (orphan 738:166) 20x20 {icon/secondary}   ← no button wrapper
```
**Diffs**
- **Hover:** fill `{bg/hover}`, which is 1.08:1 against white.
- **Selected:** fill `{bg/brand-subtle}`; the checkbox becomes `{bg/brand}` with `Icon/check` 14px `{icon/inverse}`.

**Header:** Stage `7275:14038` uses the orphan "Table Header" `753:410`, with fill `{bg/subtle}`, columns Product/Status/Inventory/Price and its own checkbox (no indeterminate state shown).

**Hard-coded values**
- paddings 12/20, gap 24, column widths 340/120/160/100
- radii 5 and 8 (`radius/sm` unbound)
- stroke 1.5 (`border-width/strong` unbound)

**Issues**
- The checkbox (18px) and More (20px) are far below the 44px touch-min and are not Grove primitives.
- `border/strong` gives the checkbox boundary only 1.57:1, failing WCAG 1.4.11.
- There is no Status property: the badge tone is baked in. The example rows show Active/Draft/Low stock/Sold out by overriding the orphan badge.
- No focus-visible, disabled, or header "select all"/indeterminate state, and no bulk-action bar (the doc says "Bulk-editable").
- Fixed pixel columns mean the header and row must share a grid template.
- Row padding (12) differs from Order Row (14), and row heights differ (65 vs 57).

**Proposed architecture:** treat this as a *recipe* on core table primitives rather than a bespoke component.
```tsx
// @nizivo/ui
<Table columns="auto minmax(240px,2fr) 120px 1fr 100px 44px" density="comfortable">  // CSS grid + subgrid rows, or a native <table>
  <Table.Header><Table.Row>…<Table.HeaderCell align="end">Price</Table.HeaderCell></Table.Row></Table.Header>
  <Table.Body>
    <Table.Row selected={isSelected} interactive>   // hover = CSS; selected → aria-selected + bg/brand-subtle
      <Table.Cell><Checkbox aria-label="Select Stoneware mug" checked onCheckedChange/></Table.Cell>
      …<Table.Cell><IconButton icon="ellipsis" aria-label="Actions for Stoneware mug" /> + <Menu/></Table.Cell>
    </Table.Row>
  </Table.Body>
</Table>
useRowSelection({ rows, getRowId, selected?, defaultSelected?, onSelectedChange })  // header checkbox tri-state
// @nizivo/commerce recipe
<ProductTable products columns? onSelectionChange renderActions statusMap />
```
- **A11y:** a native `<table>` (not `role=grid`) unless cell-level keyboard navigation is needed. The checkboxes carry row-specific `aria-label`s, and selection count is announced in a polite live region ("3 selected").
- **RSC:** split. The table shell and cells are server components, while the checkbox/selection hook and the action menu are client islands.
- **Tier:** pattern (recipe over primitives). **Package:** `@nizivo/ui` (Table, useRowSelection) + `@nizivo/commerce` (ProductTable recipe).

---

### 3.4 Order Row — `7275:14091` (940×176)

**Raw componentPropertyDefinitions**
```
State :: VARIANT default="Default" options=[Default,Hover]
```
**Variant matrix:** `7275:14092` Default, `7275:14103` Hover (890×57).

**Anatomy (default)**
```
State=Default COMPONENT AL:H pad=RAW 14/20/14/20 gap=RAW 24 fill={bg/surface} stroke={border/subtle} bottom-only 1 INSIDE
  "#1042"          TEXT 90 fixed Grove/Mono/M Strong {text/primary}
  "Oct 14, 09:12"  TEXT 110 fixed Grove/Body/M {text/secondary}
  Customer         FRAME 200 fixed AL:H gap=RAW 10: Avatar ELLIPSE 28 IMAGE/FILL; name Grove/Label/M {text/primary}
  Payment          FRAME 110 fixed → Badge orphan Success "Paid"
  Fulfilment       FRAME 130 fixed → Badge orphan Warning "Unfulfilled"
  "$112.00"        TEXT 90 fixed Grove/Numeric/M right-aligned
```
**Diff:** Hover changes fill to `{bg/hover}`.

**Header:** Stage `7275:14089` uses the orphan "Order Table Header" `753:599`, with columns Order/Date/Customer/Payment/Fulfilment/Total.

**Example status pairs:** Paid/Unfulfilled, Paid/Fulfilled, Pending (warning)/On hold (neutral), Refunded (neutral)/Fulfilled.

**Issues**
- There is no Selected state, unlike Product Row, so bulk actions are inconsistent.
- No focus state. Rows imply navigation to the order detail, but no affordance is shown.
- The avatar is a raw ellipse, not an Avatar primitive, so there is no initials fallback.
- The date format is hard-coded English 24h.
- Padding 14 and gap 10 are off-scale, and there is a separate header component per table.

**Proposed architecture:** a recipe on the same `Table`. The row link uses a *stretched link* (the anchor lives in the Order # cell and `::after` covers the row), never `role="link"` on `<tr>`.
```tsx
<OrderTable orders columns? rowHref={(o) => `/orders/${o.id}`} paymentStatusMap fulfillmentStatusMap />
<OrderStatusBadge kind="payment"|"fulfillment" status="paid" />   // tone + label from overridable maps
```
- **RSC:** server (static rows plus links). It becomes split if selection is added.
- **Tier:** pattern. **Package:** `@nizivo/commerce` (recipe) using `@nizivo/ui` Table/Avatar/Badge.

---

### 3.5 Discount Card — `7275:14130` (1014×228)

**Raw componentPropertyDefinitions**
```
Status :: VARIANT default="Active" options=[Active,Scheduled,Expired]
```
**Variant matrix:** `7275:14131` Active, `7275:14144` Scheduled, `7275:14157` Expired (each 300×178).

**Anatomy (default)**
```
Status=Active COMPONENT AL:V pad={space/6}×4 gap=RAW 16 r={radius/xl} fill={bg/surface} stroke={border/subtle} w=RAW1
  Top     AL:H SPACE_BETWEEN
    Code  FRAME AL:H pad=RAW 6/10/6/10 gap=RAW 8 r=RAW 8 fill={bg/brand-subtle} stroke={border/brand} w=RAW1 DASHED 4,3
      Icon  Icon/tag (orphan 738:366) 16 {icon/brand}
      "AUTUMN20"  Grove/Mono/M Strong {text/brand}
    Badge orphan Success "Active"
  "20% off all orders"  Grove/Heading/H3 {text/primary}
  Usage   AL:V gap=RAW 8
    Top   SPACE_BETWEEN: "Used" Grove/Label/M {text/secondary}; "310 / 500" Grove/Numeric/M {text/primary}
    Track FRAME 250x6 r=RAW 3 {chart/track} clip
      Rectangle 156.24 wide (62.5%) r=RAW 3 {chart/primary}
```
**Diffs**
- **Scheduled:** Badge Info `744:305` "Scheduled"; "0 / 500"; fill width 0.
- **Expired:** root `opacity 0.70`; Badge Neutral "Expired"; "500 / 500"; fill `{chart/neutral}` width **252 inside a 250 track** (clipped, so harmless visually, but the data is wrong).

**Issues**
- The usage meter is hand-built instead of using Grove Progress Bar `7275:13526`.
- The Expired opacity drops `text/secondary` to 3.25:1 and `text/tertiary` to 2.57:1 (fail). Use disabled tokens, or keep the text at full contrast and dim only decoration.
- The dashed code chip looks copyable but has no copy affordance or feedback state.
- Scheduled lacks a start date and Expired an end date.
- There is no "unlimited uses" variant, no Disabled/Draft state, and no applies-to/minimum-spend line.
- Radius 3/8 and padding 6/10 are off-scale.

**Proposed API**
```tsx
<DiscountCard.Root status="active"|"scheduled"|"expired"|"disabled" statusMap?>
  <DiscountCard.Code copyable onCopy?>AUTUMN20</DiscountCard.Code>        // client island: CopyButton + live region "Copied"
  <DiscountCard.Title>20% off all orders</DiscountCard.Title>
  <DiscountCard.Usage used={310} limit={500 | null} label="Used" />       // core <Meter> (role="meter"/<meter>), aria-valuetext "310 of 500 uses"
  <DiscountCard.Schedule startsAt endsAt />                                // <DateTime/>
</DiscountCard.Root>
```
- **RSC:** split (server card, client copy button).
- **Tier:** composite. **Package:** `@nizivo/commerce`; the `CopyButton` and `Meter` primitives go in `@nizivo/ui`.

---

### 3.6 Payment Method — `7275:14174` (430×209)

**Raw componentPropertyDefinitions**
```
Show default#754:2 :: BOOLEAN default=true
State :: VARIANT default="Default" options=[Default,Selected]
```
The BOOLEAN's property-ID suffix `754:2` shows it was created on the orphan-era component.

**Variant matrix:** `7275:14175` Default (380×73), `7275:14183` Selected (380×**74**).

**Anatomy (default)**
```
State=Default COMPONENT AL:H pad=RAW 14/16/14/16 gap=RAW 14 counter=CENTER r={radius/lg} fill={bg/surface} stroke={border/default} w=RAW1
  Radio   ELLIPSE 18x18 fill={bg/surface} stroke={border/strong} w=RAW1.5    ← not Grove Radio 7275:11479
  Mark    FRAME 44x30 r=RAW 6 fill={bg/inverse}; Icon/credit-card (orphan 738:156) 18 {icon/inverse}
  Text    AL:V gap=RAW 2: "•••• 4242" Grove/Mono/M Strong {text/primary}; "Expires 08/28" Grove/Body/M {text/tertiary}
  Default badge  orphan Badge Neutral {Dot=false, Label=Default}  (visibility ← "Show default")
```
**Diff:** Selected changes the root to `{bg/brand-subtle}` with `{border/brand}` at width RAW 1.5, and the height grows from 73 to 74px. The stroke is INSIDE; the likely cause is stroke-included-in-layout, but `strokesIncludedInLayout` was not read. The radio stroke becomes `{border/brand}` at **width 5**, faking the dot with a thick stroke.

**Issues**
- The radio is not the Grove Radio (it is a fake dot) and has a 1.57:1 boundary.
- Selection causes layout shift.
- There is no hover, focus, disabled or error state (expired card, declined, needs re-auth).
- There are no card-brand marks (Visa/Mastercard/Amex/PayPal/Apple Pay), only a generic icon on `bg/inverse`. Brand marks have trademark rules and fixed brand colours, so they need a pluggable `brandMark` slot or registry, not core icons.
- There is no "Add payment method" row.
- "Expires 08/28" uses `text/tertiary` at 4.31:1.

**Proposed API:** core `ChoiceCard` (label-wrapped native radio) plus a commerce preset.
```tsx
<ChoiceGroup name="paymentMethod" value? defaultValue? onValueChange? legend="Payment method">
  <PaymentMethodOption value="pm_1" brand="visa" last4="4242" expMonth={8} expYear={2028} isDefault
                       brandMark={<VisaMark/>} status?="expired"|"requires_action" />
</ChoiceGroup>
```
- **A11y:** a `<fieldset>`/`<legend>` radio group with arrow keys from native radios. Each option's accessible name is "Visa ending in 4242, expires August 2028, default"; the bullets are `aria-hidden` and the accessible text is spelled out.
- **RSC:** split (works in a form without JS; client only when controlled).
- **Tier:** composite on a primitive. **Package:** `@nizivo/ui` (ChoiceCard) + `@nizivo/commerce` (PaymentMethodOption; brand marks in an opt-in `@nizivo/commerce/payment-marks`).

---

### 3.7 Shipment Tracker — `7275:14195` (650×405)

**Raw componentPropertyDefinitions**
```
Step :: VARIANT default="Packed" options=[Packed,Shipped,Delivered]
```
**Variant matrix:** `7275:14196` Step=Packed, `7275:14224` Step=Shipped, `7275:14252` Step=Delivered (each 600×97).

**Anatomy (default)**
```
Step=Packed COMPONENT AL:H pad=0 gap=0 (4 columns, each FILL 150 wide)
  <Step>    FRAME AL:V gap=RAW 10
    Rail    AL:H counter=CENTER: Node FRAME 36x36 r=RAW 999 (icon 18) + Line RECTANGLE 114x2 (absent on last step)
    label   TEXT Grove/Label/M
    date    TEXT Grove/Body/M {text/tertiary}  ("—" when upcoming)
Per-step state encoding:
  complete: Node {bg/brand-subtle} + icon {icon/brand}; label Label/M {text/primary}; line {bg/brand}
  current : Node {bg/brand} + icon {icon/inverse}; label Label/M Strong {text/primary}; line {border/default}
  upcoming: Node {bg/subtle} + icon {icon/secondary}; label Label/M {text/tertiary}; line {border/default}
Icons (orphans): Icon/receipt 738:298 (Ordered), Icon/package 738:271 (Packed), Icon/truck 738:398 (Shipped), Icon/house 738:203 (Delivered)
```
**Diffs:** state moves along the steps exactly as encoded above. Shipped makes Packed complete and Shipped current; Delivered makes all complete and Delivered current.

**Issues**
- The doc says "Four steps" but the `Step` axis has only 3 options: there is no Ordered-current state. There are no exception states (delayed, failed delivery attempt, returned, cancelled, out for delivery).
- The doc says "The current step carries the date", but completed steps carry dates too and upcoming steps show "—". The doc text is inaccurate.
- The upcoming node `bg/subtle` is 1.04:1 on white (effectively invisible). The state relies on label weight and colour; there is no `aria-current` equivalent visually beyond weight.
- The completed connector uses `bg/brand` on a rectangle; a `border/brand` or dedicated "progress" token would be clearer.
- It is horizontal only, with fixed 150px columns. At the 358px mobile content width it will not fit, and longer locales (German) will overflow, so it needs `orientation="vertical"`.
- The radius 999 pill is unbound.

**Proposed API:** a generic core `Steps` primitive plus a commerce preset.
```tsx
// @nizivo/ui
<Steps orientation="horizontal"|"vertical"|"responsive" current={1}>   // <ol>; current step aria-current="step"
  <Steps.Item status?="complete"|"current"|"upcoming"|"error" icon={<Icon name="package"/>} title="Packed" description={<DateTime value/>} />
</Steps>
// @nizivo/commerce
<ShipmentTracker events={[{ type:'ordered', at }, { type:'packed', at }, …]} status="in_transit"|"exception"
                 steps?={DEFAULT_SHIPMENT_STEPS} carrier? trackingUrl? />
```
- **A11y:** an `<ol>` with visually-hidden status text per item ("completed", "current", "not started"), and decorative icons/lines marked `aria-hidden`. No live region is needed unless the tracker updates live; if it does, use `aria-live="polite"` on a summary line.
- **RSC:** server.
- **Tier:** primitive (Steps) plus composite (ShipmentTracker). **Package:** `@nizivo/ui` + `@nizivo/commerce`.

---

### 3.8 Plan Card — `7275:14284` (1014×423)

**Raw componentPropertyDefinitions**
```
Tier :: VARIANT default="Basic" options=[Basic,Grow,Scale]
```
**Variant matrix:** `7275:14285` Basic (300×342), `7275:14303` Grow (300×371), `7275:14325` Scale (300×373).

**Anatomy (default)**
```
Tier=Basic COMPONENT AL:V pad={space/6}×4 gap=RAW 20 r={radius/2xl} fill={bg/surface} stroke={border/subtle} w=RAW1
  Header    AL:H SPACE_BETWEEN: "Basic" Grove/Heading/H3
  Price     AL:H gap=RAW 4 counter=BASELINE: "$29" Grove/Numeric/Display; "/ month" Grove/Body/M {text/secondary}
  tagline   Grove/Body/M {text/secondary} "Everything to open a store"
  Features  AL:V gap=RAW 10; Feature AL:H gap=RAW 10: Icon/check (orphan 738:111) 16 {icon/brand} + Grove/Body/M {text/primary}
  Button    orphan Button/Variant=Secondary, Size=Md, State=Default#744:105 (props: Label, Leading icon=false, Trailing icon=false), FILL width, 40 tall
```
**Diffs**
- **Grow:**
  - Root becomes `{bg/inverse}` with `Grove/Elevation/3 Popover` and no stroke.
  - Text becomes `{text/inverse}`; "/ month" and the tagline become `{text/tertiary}`; the check icon becomes `{icon/inverse}`.
  - A Badge Brand "Popular" (Dot=false) is added.
  - The Button becomes the orphan Accent `744:210` "Start with Grow" `{bg/accent}`.
- **Scale:** identical to Basic, but with 4 features.
- **Hover reactions** go to the orphan Button hover variants.

**Issues**
- `Tier` is **content**, not a variant. The only structural difference is *featured* vs *default*, so the code prop is `featured`/`emphasis`, with the tier name as data.
- `Elevation/3 Popover` is semantically wrong for a static card (`Elevation/2 Raised` fits).
- `text/tertiary` on `bg/inverse` is 4.03:1 (fail), and the "Popular" `bg/brand` badge vs the `bg/inverse` card has 2.04:1 shape contrast.
- In dark mode `bg/inverse` becomes white (inversion intent unverified).
- There is no billing-interval toggle (monthly/annual) and no "Current plan" or disabled/downgrade state. There are no excluded-feature rows (the × icon), no price-per-seat or "billed annually" footnote, and no currency.
- The CTA is 40px (below 44 on touch).
- Gaps 20/10/4 are unbound.

**Proposed API**
```tsx
<PlanCard.Root featured? current? asChild?>          // <article aria-labelledby>
  <PlanCard.Header title="Grow" badge={<Badge tone="brand">Popular</Badge>} />
  <PlanCard.Price value={money} interval="month"|"year" footnote? />   // <Price> + messages "{price} / {interval}"
  <PlanCard.Description>For brands selling every day</PlanCard.Description>
  <PlanCard.Features items={[{ label, included: true }]} />            // <ul>; check/× icons aria-hidden, "Not included" sr text
  <PlanCard.Action><Button variant={featured ? 'accent' : 'secondary'}>Start with Grow</Button></PlanCard.Action>
</PlanCard.Root>
<PlanGrid interval onIntervalChange plans />   // optional; if plans are *selectable* use ChoiceGroup + ChoiceCard semantics
```
- **RSC:** server (the CTA is a link or form action). The interval toggle is a client island.
- **Tier:** composite. **Package:** `@nizivo/commerce` (subpath `@nizivo/commerce/pricing`). It could move to a marketing/blocks package later; keeping it behind a subpath makes that move cheap.

---

### 3.9 Customer Card: no live component, instance of orphan `754:530` (in Stage `7275:14124`)

The orphan main has **TEXT props `Name`, `Email`**, the only TEXT props seen on this page.

**Anatomy**
```
Customer Card INST AL:V pad={space/6}×4 gap=RAW 20 r={radius/xl} fill={bg/surface} stroke={border/subtle} 340x229
  Identity AL:H gap=RAW 14: Avatar ELLIPSE 52 IMAGE/FILL; Name AL:V gap=2: "Jonah Okafor" Grove/Heading/H4; "jonah@okafor.studio" Grove/Body/M {text/secondary}
  Stats    AL:H gap=RAW 12: 3× tile AL:V pad=RAW 10/12/10/12 gap=2 r=RAW 12 fill={bg/subtle}: label Grove/Label/M {text/tertiary}; value Grove/Numeric/M
  Tags     AL:H gap=RAW 6: Badge Brand "VIP" (Dot=false); Badge Neutral "Subscriber"
```
**Issues**
- It has no master on any page, so it must be promoted to a component in Figma or demoted to a documented recipe.
- The doc promises "how to reach them", but there are no contact actions (email/phone/message buttons).
- The stat labels (`text/tertiary` on `bg/subtle`) are 4.16:1 (fail).
- Radius 12 is unbound (`radius/md` exists), and padding 10 and gap 14 are off-scale.
- There is no avatar fallback.

**Proposed:** recipe `CustomerCard` composed of `Avatar`, `Stat` (shared with page-04 KPI Tile at a smaller size), `Badge` and optional `actions` slot.
```tsx
<CustomerCard customer={{ name, email, avatarUrl, ordersCount, totalSpent, averageOrder, tags }} actions? statLabels? />
```
- **RSC:** server. **Tier:** pattern. **Package:** `@nizivo/commerce` (registry recipe).

### 3.10 Order Summary: no live component, instance of orphan `754:897` (in Stage `7275:14350`)

**Anatomy**
```
Order Summary INST AL:V pad={space/6}×4 gap=RAW 16 r={radius/xl} fill={bg/surface} stroke={border/subtle} 380x453
  "Order #1042" Grove/Heading/H4
  Line item ×3 AL:H gap=RAW 12 counter=CENTER: Thumbnail RECT 48 r=RAW 10 IMAGE/FILL; Text AL:V gap=2 (name Label/M Strong; variant Body/M {text/tertiary} "Moss · 350 ml"); qty "×2" Grove/Mono/M {text/tertiary}; line price Grove/Numeric/M
  Divider RECTANGLE 330x1 {border/subtle}
  Subtotal / Shipping / Tax rows AL:H SPACE_BETWEEN: label Body/M {text/secondary}; value Numeric/M ("Free" also in Numeric/M)
  Divider
  Total: "Total" Grove/Label/L; "$121.24" Grove/Numeric/L
```
**Issues**
- It has no master (orphan).
- The line price is the *line total* (×2 → $56.00) with no unit price shown, which is ambiguous.
- There is no discount row (negative amount), no tax-inclusive/rate label, no currency code, no gift card/store credit, and no editable quantity (cart mode) or remove action. Empty and loading states are also missing.
- Dividers are rectangles; in code use `<hr>` or a border token.
- Thumbnail radius 10 is off-scale.

**Proposed API**
```tsx
<OrderSummary.Root title="Order #1042">
  <OrderSummary.LineItems>
    <OrderSummary.LineItem image title variant quantity={2} unitPrice? total={money} />
  </OrderSummary.LineItems>
  <OrderSummary.Totals>                              // <dl>; values right/end aligned, tabular-nums
    <OrderSummary.Row label="Subtotal" value={money} />
    <OrderSummary.Row label="Discount" value={negMoney} tone="success" />
    <OrderSummary.Row label="Shipping" value={money} freeLabel="Free" />
    <OrderSummary.Row label="Tax" value={money} hint="incl. 8.25%" />
    <OrderSummary.Total value={money} currencyDisplay="code"? />
  </OrderSummary.Totals>
</OrderSummary.Root>
```
- **RSC:** server. A cart variant with quantity steppers would be split, using a `QuantityInput` client island.
- **Tier:** composite. **Package:** `@nizivo/commerce`.

---

## 4. Token-binding audit (whole section, 691 nodes scanned)

- **Variable collections referenced:** `Grove Color` (1096 bindings), `Grove Space` (247 bindings). **No non-Grove collections** (Clario/Pipkin/Merit/Ashgrove/Noema/Praxa/Pogo/Halden/Ardenfield) and no `Grove Motion` / `Grove Responsive` bindings.
- **Styles referenced:** `Grove/Body/M`, `Grove/Heading/H2|H3|H4`, `Grove/Label/L|M|M Strong`, `Grove/Mono/M|M Strong`, `Grove/Numeric/Display|L|M`, `Grove/Elevation/3 Popover`. There are no non-Grove styles and **no unstyled TEXT nodes**.
- **Bound well:** all fills and strokes (colour); card paddings in Product Card (`space/3`, `space/4`), Discount, Plan, Customer and Summary (`space/6`); card radii (`radius/xl`, `radius/lg`, `radius/2xl`); and Badge pills (`radius/full`, inside the orphan Badge).
- **Hard-coded (design debt):**

| Category | Values / where | Suggested handling |
|---|---|---|
| Pill radius | `999` on Variant Option and tracker nodes | bind `radius/full` |
| Off-scale radius | 14 (Product media), 10 (summary thumb), 6 (payment mark), 5 (checkbox), 3 (meter) | concentric rule `calc(var(--nz-radius-xl) - var(--nz-space-3))`, or add `radius/2xs`=2/`radius/inner` tokens; use primitives (Checkbox, Meter) that own their radius |
| On-scale but unbound radius | 8 (code chip, row thumb), 12 (customer stats) | bind `radius/sm`, `radius/md` |
| Gap (itemSpacing) | 2, 4, 6, 8, 10, 12, 14, 16, 20, 24 almost everywhere | bind `space/*`; decide **10** and **14** (add `space/2-5`=10 and `space/3-5`=14, or snap to 8/12/16) |
| Padding | 3/10 badge, 6/12 chip, 12/20 and 14/20 rows, 14/16 payment, 10/12 stat tile, 6/10 code chip | bind or snap; unify row padding (12 vs 14) |
| Stroke width | 1, 1.5, 2, 5 | `border-width/default`, `/strong`, `/focus`; 5 disappears with a real Radio |
| Sizes | 18 (checkbox/radio), 26 (swatch), 36 (tracker node), 40/48 min sizes, 44×30 card mark, 40/48 thumbnails, 28/52 avatars, 6 meter | primitive-level size scales (Avatar `xs/sm/md/lg`, Thumbnail sizes); bind min sizes to `size/control-*` |
| Offsets | badge inset 10/10 in Product Card media | Media `overlay` slot with padding `space/2` or `space/3` |
| Motion | hover 160ms (no token) | use `duration/fast` (140) or add a token; select 220ms = `duration/base`; easing = `easing/standard` |

---

## 5. Icons

All icons are **local orphan components** (`remote=false`, `parent=null`, IDs `738:*`), not from a subscribed library.

| Icon | Main ID | Size | Stroke width |
|---|---|---|---|
| `Icon/ellipsis` | `738:166` | 20 | 1.6 |
| `Icon/check` | `738:111` | 14 / 16 | 1.12 / 1.28 |
| `Icon/tag` | `738:366` | 16 | |
| `Icon/credit-card` | `738:156` | 18 | |
| `Icon/receipt` | `738:298` | 18 | |
| `Icon/package` | `738:271` | 18 | |
| `Icon/truck` | `738:398` | 18 | |
| `Icon/house` | `738:203` | 18 | 1.44 |

- The stroke width scales as **0.08 × size**, so these are scaled instances of one stroke master.
- Icon colour is bound to `icon/*` tokens on the vector stroke (`icon/secondary`, `icon/brand`, `icon/inverse`).
- The naming (`house`, `receipt`, `package`, `truck`, `credit-card`, `ellipsis`) is consistent with Lucide (and close to Phosphor). Defer to the page-02 icon audit to confirm the source set; do not hard-depend on it.
- **Code:** use an icon *registry/adapter* (`<Icon name="truck" size="sm" />`, with `IconProvider` / `createIconSet`) so the icon library is swappable. Add a `strokeWidth` prop, defaulting to `size × 0.08` to match Figma. Commerce components take icons via props or slots with registry defaults.

---

## 6. Accessibility and contrast (computed from snapshot hexes, Light mode unless noted)

| Pair | Ratio | Verdict |
|---|---|---|
| `text/tertiary` #747c73 on `bg/surface` #fff (inventory, SKU, dates, expiry, "Not published") | **4.31** | Fails AA (14px) |
| `text/tertiary` on `bg/subtle` #fbfbf9 (customer stat labels) | **4.16** | Fails |
| `text/tertiary` on `bg/inverse` #181b19 (Grow "/ month", tagline) | **4.03** | Fails |
| `text/tertiary` on `bg/surface` (Dark, #181b19) | **4.03** | Fails |
| Expired discount @ opacity .70: `text/secondary` / `text/tertiary` / neutral badge text | **3.25 / 2.57 / 3.15** | Fails |
| `border/strong` #cbd0c8 on white (checkbox/radio boundary) | **1.57** | Fails 1.4.11 (3:1) |
| `border/default` #e2e5df on white (chip boundary, upcoming connector) | 1.27 | Chip identified by text (OK); connector decorative |
| `bg/subtle` upcoming tracker node on white | **1.04** | Node invisible; state must be conveyed by text and SR text |
| `bg/brand` "Popular" badge vs `bg/inverse` card | 2.04 | Shape low; badge text is 8.51 (OK) |
| `text/disabled` on `bg/disabled` | 2.20 | Exempt (disabled), but out-of-stock values should *not* use disabled styling if still focusable |
| `text/secondary` on white | 6.48 | OK |
| `text/critical` on white ("0 in stock") | 5.69 | OK |
| `text/warning` on white ("4 in stock") | 6.58 | OK |
| `text/brand` on `bg/brand-subtle` (discount code) | 7.49 | OK |
| `text/on-accent` on `bg/accent` (Grow CTA) | 11.46 | OK |
| `border/brand` on white / on `bg/brand-subtle` (selected rings) | 6.36 / 5.60 | OK |
| `chart/primary` vs `chart/track` (meter fill) | 5.55 | OK (track vs white 1.15; add the numeric label, which is present) |
| Badge text on tints (assumed Grove Badge tokens; orphan internals not read) | success 5.60, warning 6.11, critical 5.14, info 6.01, neutral 5.65 | OK |

**Hit targets vs `size/touch-min` 44:**

| Element | Size | Verdict |
|---|---|---|
| Variant chips | 40 tall | Fail |
| Size chip | 48×40 | Fail on height |
| Row checkbox | 18 | Fail; make the whole cell the label, ≥44 |
| Row "More" | 20 | Fail; needs an IconButton ≥32 visual / 44 hit |
| Payment row | 73 | OK |
| Plan CTA | 40 | Fail on touch; add `@media (pointer: coarse)` min-block-size 44, or use `control-lg` |
| Discount code chip | 34 | Fail if copyable |

**Focus:** no focus-visible state exists for any component on the page. Use the `Focus/Ring` effect style (0 0 0 4 green/500 @28%) as an `outline`/`box-shadow` token, never a border-width change.

---

## 7. Architecture recommendations ("plug in / plug out")

### 7.1 Layering
```
@nizivo/tokens        CSS vars (--nz-*), prefix configurable; motion/easing incl. linear() spring approximations
@nizivo/ui            primitives: Badge, Button, IconButton, Checkbox, ChoiceGroup + ChoiceChip + ChoiceCard, Table (+ useRowSelection),
                      Steps, Meter/ProgressBar, Media/AspectRatio, Avatar, Stat, CopyButton, Icon (registry), Menu, VisuallyHidden
@nizivo/commerce      subpath exports, each tree-shakeable and individually copy-pasteable via registry:
  /money              Money, Price (compareAt, range, interval), formatMoney, createMoneyFormatter, Quantity, QuantityInput (client)
  /status             productStatusMap, paymentStatusMap, fulfillmentStatusMap, discountStatusMap, <StatusBadge kind status/>
  /product            ProductCard (+parts), VariantPicker, ColorSwatch, ProductTable (recipe)
  /orders             OrderTable (recipe), OrderStatusBadge, OrderSummary (+parts), CustomerCard (recipe)
  /fulfillment        ShipmentTracker (Steps preset), DEFAULT_SHIPMENT_STEPS
  /checkout           PaymentMethodOption, DiscountCard, (later) AddressCard, CheckoutSteps (Steps preset)
  /pricing            PlanCard (+parts), PlanGrid, BillingIntervalToggle (client)
  /payment-marks      opt-in brand logos (Visa, Mastercard…) kept out of core for licence and size reasons
```

### 7.2 Contracts that keep pieces swappable
- **Compound parts plus a data preset for every commerce component.** For example, `ProductCard.Root/Media/Title/Price/Meta/Actions` alongside `<ProductCard product={…}/>`. The preset is a 20-line composition of the parts, so teams can fork it via the registry without forking the parts.
- **Slots over booleans.** Use `badge`, `media`, `actions`, `brandMark`, `icon` and `footer` as ReactNode slots. Use booleans only for genuine structure (`featured`, `copyable`).
- **Injection points:**
  - `asChild`/`render` for links (Next `Link`).
  - `renderImage` or an `ImageComponent` for `next/image` and CDN loaders.
  - Icon registry.
  - Status maps (`{ [status]: { tone, label } }`) merged with defaults.
  - `messages` for every string.
- **Data shapes:** follow the commerce-API conventions so adapters are trivial.
  - `Money = { amount: string; currencyCode: string }` (decimal string, never float math), with an optional minor-units adapter.
  - `Image = { url, alt, width?, height? }`.
  - Statuses are lowercase string unions (`'sold_out'`, not `'Sold out'`).
- **RSC-safe configuration:** React context is unavailable in Server Components, so locale, currency and messages must not live *only* in a provider.
  - Provide `createCommerce({ locale, currency, messages, statusMaps, icons })`. It returns pre-bound server-safe components and formatters (or plain props with defaults).
  - Add a thin client `CommerceProvider` only for client islands (QuantityInput, VariantPicker controlled mode, CopyButton).
- **Behaviour on native HTML first:** native radios for ChoiceGroup and PaymentMethod (forms work without JS), `<table>` for tables, `<ol>` for Steps, `<meter>`/`role="meter"` for usage, `<dl>` for totals. A headless library is needed only for the row action **Menu** (menu button pattern) and possibly the Popover.

### 7.3 Formatting and i18n requirements surfaced by this page
- **Money:** `Intl.NumberFormat(locale, { style: 'currency', currency })` for "$28.00", "$1,284" (fraction digits vary) and "$121.24".
  - Zero becomes a `freeLabel` ("Free"), and negative amounts render as discounts.
  - Ranges ("From $28") and zero-decimal currencies (JPY) must work.
  - Keep `font-variant-numeric: tabular-nums` (the Numeric styles say so).
  - Fixed 90–100px money columns overflow for long currencies, so use min-content/fr columns.
- **Interval:** "/ month" comes from an ICU message `"{price} / {interval}"`; never concatenate strings.
- **Counts:** ICU plurals for "124 in stock" and "×2" (`quantity` message). "0 in stock" maps to a dedicated "Out of stock" message, and "310 / 500" maps to a "{used} of {limit}" message for screen readers.
- **Dates:**
  - `Intl.DateTimeFormat` for "Oct 14, 09:12" (12h vs 24h follows locale; timezone is explicit).
  - Card expiry "08/28" stays MM/YY, but its label is localized and its spoken form is "expires August 2028".
  - Relative dates are optional.
- **Spelling:** the Figma uses British spelling (Colour, Fulfilment, Catalogue). The code API uses `color` and `fulfillment`, while visible labels come from messages.
- **RTL:** use logical properties throughout. `text-align: end` handles money columns, the tracker rail direction flips, the stretched link is unaffected, and the truck icon is not mirrored.
- **Text expansion:** tracker step labels and table headers need wrapping or truncation rules; Product Card titles get a `lines` clamp prop.

### 7.4 Images
- Figma uses `IMAGE` fills with `scaleMode FILL` everywhere, which maps to `object-fit: cover`. Product media is a fixed 238×220 (≈1.08:1).
- **Recommendation:** a core `Media` with an `aspect-ratio` prop (default `1/1`; offer `4/5`, `3/4`, `16/9`), `fit="cover"|"contain"`, an `overlay` slot for badges, `placeholder` (Skeleton/blur) and a `fallback` (no-image icon on `bg/muted`).
- The inner radius is concentric: `calc(outer radius - padding)`.
- Thumbnails (40, 48) and Avatars (28, 52) become size scales on the `Thumbnail` and `Avatar` primitives, with initials fallback and `alt` required.

---

## 8. Figma-side fixes to request (design team)

1. **Relink all orphan instances to the live Grove sets.** Badge goes to `7275:11374`, Button to `7275:11244`, the example rows to `7275:14040` / `7275:14091`, and the table headers to a single generic `Table Header`. Promote Customer Card and Order Summary to real components (or document them as recipes), and publish the `Icon/*` masters on a page.
2. **Replace the hand-drawn checkbox and radio** with the Grove Checkbox `7275:11456` and Radio `7275:11479`, the raw meter with Progress Bar `7275:13526`, and "More" with Icon Button `7275:11357`.
3. **Add Focus states everywhere, plus the missing states.** These are Hover for Product/Payment/Plan/Discount cards, and Disabled/Error for Payment Method. Out-of-stock chips need a visual distinct from disabled, and Order Row needs a Selected state.
4. **Remove selection layout shift** by keeping the stroke width constant, or using an inner shadow or ring.
5. **Split Product Card `Status`** into publication and inventory, add Low stock, and use TEXT/BOOLEAN props for name, price, stock and badge visibility.
6. **Rename Plan Card `Tier`** to `Featured` (boolean). Use Elevation/2, and decide the dark-mode behaviour of `bg/inverse`.
7. **Add Shipment Tracker states:** Ordered-current, exceptions and a vertical orientation. Correct the doc sentence.
8. **Bind radius, gap, stroke widths and min sizes**, and decide the off-scale 10/14 values.
9. **Fix the `text/tertiary` contrast** at the token level: `neutral/600`-ish for light, or restrict tertiary to ≥18px or non-essential text.
10. **Swatch colours must not use chart tokens.** Model the colour as instance data, with an inner ring for light colours.

---

## 9. Extraction gaps
- Internals of orphan Badge/Button/Icon/Table Header masters were not traversed (badge text colours are assumed from Grove tokens).
- Dark mode was not visually checked (no explicit mode switch on screenshots); inversion issues are inferred from token values.
- No focus state is prototyped, and no motion beyond smart-animate exists, so motion specs are inferred from reactions only.
- `preferredValues` for INSTANCE_SWAP: none exist on this page's sets.
- The icon source library is not confirmed (all icons are local orphans; naming is Lucide-like).
- The Customer Card / Order Summary instance node IDs (the first child of Stage `7275:14124` / `7275:14350`) were not individually recorded.

- `strokesIncludedInLayout` was not read; the selection size change is measured, and its mechanism is inferred.
