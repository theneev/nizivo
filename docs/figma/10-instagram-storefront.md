# Page 10 · Instagram Storefront: architecture analysis (Grove UI file, ships as Nizivo UI)

- File: `BIzJFf1wm8KP0YG2AVI1tP` (Grove UI Library). Page `7275:19790` "Grove · 10 Instagram Storefront".
- Read on 2026-10-14. Read-only extraction: 9 `use_figma` reads (8 succeeded; 1 failed because its output was too large and was re-run as smaller reads) and 7 screenshots.
- Screenshots are in `scratchpad/figma/shots/`:
  - `10-section.png`: the whole section
  - `10-shoppable-post.png`
  - `10-mobile-post-view.png`
  - `10-desktop-post-view.png`
  - `10-mobile-storefront.png`
  - `10-merchant-tag-post.png`
  - `10-hero-shader.png`
- Token names follow `00-tokens-and-styles.md`. The `--grove-*` prefix must become configurable (for example `--nz-*`).

---

## 0. TL;DR (read this first)

1. **The component sets on this page do not drive the screens.** 0 of 373 instances in section `7275:19791` reference the on-page sets (`7275:19802 / 19815 / 19846 / 19862 / 19889`).
   - Every instance points at a *different* master, for example `772:4320` Collection Circle, `772:4373` Shoppable Post, `772:4390` Product Tag, `772:4414` Tagged Product, `772:4457` Storefront Bar, `772:4419` Post Badge, `772:4302` Social/Instagram, `738:*` Icon/*, `744:263` Button, `755:*` Sidebar/Nav/Search Field.
   - Every one of those masters returns `parent === null` and `removed === false`. They live on no page: they are orphaned or hidden masters, most likely left behind when the pages were duplicated.
   - Their property keys and variant counts are identical to the on-page sets (verified), so the API is the same. But editing the visible sets on this page changes nothing in the screens.
   - **This is file-wide.** Button, Input, Sidebar, Nav Item and Search Field instances show the same pattern. Code Connect and the "source of truth" must be decided before mapping.
   - The prototype reactions on screen instances (99 of them) do point at the **on-page** variant IDs (`7275:19807`, `7275:19820`, …), which makes this even more confusing.
2. **Only colours are tokenised.** Not one float variable is bound anywhere on the page: padding, gap, radius, size, strokeWeight and opacity are all raw numbers.
   - Off-scale values: Shoppable Post `r6`, Product Tag chip `r10`, Follow/Share `r10`, ring stroke `2`, icons at 18 and 22 px, cover 72.
3. **Dark mode is broken for everything that sits on a photo.** These elements use raw fills together with mode-switching text tokens:
   - Shop badge and hint chips: `#141714@62` with `text/inverse`. Contrast falls to **1.12–3.43:1** in dark mode.
   - Pager chip: `#ffffff@80` with `text/primary`. Contrast falls to **1.08–1.49:1** in dark mode.
   - The kit needs a mode-invariant **on-media** token family.
4. **Global contrast failure.** `text/tertiary` (neutral/500) is **4.03–4.31:1** on every surface in both modes, which fails AA for 14 px text. It is used for prices and variant text here.
   - The "Seen" ring (`border/default`) is **1.18–1.39:1**. It is the only new/seen signal.
5. **Hit targets below `size/touch-min` 44:**
   - Product Tag dot 24×24 (clickable)
   - Tagged Product add button 40×40
   - Storefront Bar bag 40×40
   - Mobile search: a bare 20×20 icon (`7275:19905`)
   - Mobile post header back chevron: a bare 22×22 icon (`7275:20911`)
6. **Generic vs domain split:**
   - Media tile, image hotspot, avatar/story ring, sticky action bar, page indicator and app bar are **generic**. They go in `@nizivo/ui`.
   - Collection Circle, Shoppable Post, Product Tag, Tagged Product, Storefront Bar and Post Badge are **domain composites**. They go in **one opt-in package, `@nizivo/social`**, which depends on `@nizivo/commerce` for money/product primitives.
   - The animated shader hero goes in `@nizivo/lab` (later `@nizivo/motion`).
7. **Pluggability is in the contracts.** Components take normalised data (`Post`, `Product`, `Tag`, `MediaSource`, `Money`), never Instagram API shapes. `Image`, `Link`, formatters, messages and the live-region announcer are injected through `NizivoProvider`, and an `InstagramAdapter` lives outside the components. That is the plug-in/plug-out story.

---

## 1. Page inventory

Top level of page `7275:19790`:

| Node | Type | Name | Pos | Size |
|---|---|---|---|---|
| 7275:19791 | SECTION | Grove · 12 Instagram Storefront | -3141,-4639 | 6280×9277 |
| 7279:1476 | FRAME | Hero | -3785,3731 | 390×470 |

Hero `7279:1476` sits outside the section. It has **no children**: it is a bare background experiment, a copy of the Connect-Instagram hero `7275:21477` (details in §4.8).

### 1.1 Documentation frames

All doc frames: `bg/surface`, r28 (= radius/2xl), padding 48 (= space/12), gap 32 (= space/8). All of these are raw numbers. Each has a Header (H2 + Body/M in text/secondary) and a Stage with a dashed black `#000000` stroke (presentation chrome).

| Doc frame | Node | Contains | Header copy (verbatim) |
|---|---|---|---|
| Doc/Instagram glyph | 7275:19792 | Stage 7275:19796 → INSTANCE `Social/Instagram` 7275:19797 | "Instagram glyph". "Used only where an action actually goes to Instagram." |
| Doc/Collection circle | 7275:19798 | COMPONENT_SET 7275:19802 | "Collection circle". "A creator’s collections, read like story highlights. Ring = new picks." |
| Doc/Shoppable post | 7275:19811 | COMPONENT_SET 7275:19815 | "Shoppable post". "An Instagram post with its tagged products. Hover reveals the shop action." |
| Doc/Product tag | 7275:19842 | COMPONENT_SET 7275:19846 | "Product tag". "Pinned on a photo at the product. Tap a dot to open its name and price." |
| Doc/Tagged product | 7275:19858 | COMPONENT_SET 7275:19862 | "Tagged product". "Products in a post, listed beside or under the photo." |
| Doc/Post badge | 7275:19879 | Stage 7275:19883 → INSTANCE `Post Badge` 7275:19884 (no local master) | "Post badge". "Tells shoppers a product is in the store’s own posts." |
| Doc/Storefront bar | 7275:19885 | COMPONENT_SET 7275:19889 | "Storefront bar". "Top of every creator store. Handle left, search, bag." |

### 1.2 Component and master descriptions (verbatim)

- **Shoppable Post** (7275:19815 and orphan 772:4373): "Feed tile, 4:5. Override the fill with the post image; badge count = tagged products."
- **Post Badge** (orphan 772:4419): "Shows a product appears in the store’s Instagram posts."
- **Social/Instagram** (orphan 772:4302): "Instagram glyph (Simple Icons). Only for “Connect / Follow on Instagram” links — never as Grove decoration."
- **Brand/Logo** (orphan 739:64): "Grove brand lockup: sprout mark on bg/brand + Geist SemiBold wordmark. Min clear space = mark height / 2."
- **Icon/\*** (orphans 738:*): "Lucide "<name>" · 20px, 1.6 stroke · recolour via icon/* tokens."
- Collection Circle, Product Tag, Tagged Product and Storefront Bar have **empty descriptions**. No set or component on the page has `documentationLinks`.
- Masters used here that carry useful behaviour notes:
  - **Button** 744:263: "Variants: Primary · Secondary · Tertiary · Critical · Accent (AI only). Motion: hover 140ms standard, press scale 0.98 (scale/press), focus ring F…" (truncated)
  - **Input** 745:187: "Focus: border/focus + Focus/Ring (140ms). Error: border/critical + Focus/Ring Critical, help text turns text/critical."
  - **Switch** 745:286: "Knob travels with easing/spring (duration/fast in Reduced mode = 0, colour cross-fades only)."
  - **Sparkline** 747:288: "Inline trend, 112×36. Line draws in duration/chart-draw on reveal."
  - **KPI Tile** 752:380: "Metric with sparkline + delta. Use Tinted for a pastel KPI row (moodboard: iBanko tiles)."
  - **Badge** 744:315: "Order, payment and fulfilment status. Tone maps 1:1 to semantic tokens."

### 1.3 Composed screens (in section 7275:19791)

Row labels (TEXT, raw `#000000` fill, not tokenised):
- "Shopper · Desktop" 7275:21861
- "Shopper · Mobile" 7275:21862
- "Merchant · Desktop" 7275:21863
- "Merchant · Mobile" 7275:21864

| Screen | Node | Size | Key content |
|---|---|---|---|
| Shopper · Desktop · Storefront | 7275:19910 | 1440×3266 | Soft-light gradient band, Storefront Bar instance 7275:19919, profile header, collections rail, Posts / Shop all / Collections tabs, 3-col post grid, footer: "Sold and shipped by Moss & Kiln · Free returns for 30 days", "Powered by" + Brand/Logo |
| Shopper · Desktop · Post view | 7275:20191 | 1440×960 | Storefront underneath + Scrim 7275:20276 + Post modal 7275:20283 (1080×780, r20, Elevation/4 Modal): Media 624×780 with hotspots/pulses/pager + Shop panel 456 (Header / Body / Footer). Close 7275:20364 and prev/next Nav 7275:20372 and 7275:20380 sit **outside** the modal (40×40). Copy: "Oct 12 · on Instagram", "In this post", "Add both to bag · $56.00", "Ships from Moss & Kiln in 2 days" |
| Shopper · Desktop · Product | 7275:20382 | 1440×1464 | "Back to @mossandkiln", gallery thumbs, PDP (Variant Option ×N, qty stepper, Add to bag / Buy now), "Seen on our Instagram" post strip |
| Shopper · Desktop · Checkout | 7275:20512 | 1440×1139 | "Secure checkout", Express pay / Pay later, contact, delivery, shipping radios, Payment Method, summary with "INSTA10 applied", "Follower code −$6.20" |
| Shopper · Desktop · Order placed | 7275:21759 | 1440×919 | Parcel 3D render, "Thank you, Maya", Shipment Tracker, order lines, Track order / Back actions |
| Shopper · Mobile · Storefront | 7275:20696 | 390×1241 | Storefront Bar (mobile), Profile 7275:20706 (avatar ring 94, stats, bio, Follow/Share), Collections rail 7275:20748, icon Tabs 7275:20790, Grid 7275:20803 (3-col, gap 2), Sticky bar 7275:20898 ("2 items / $62.00" + "View bag") |
| Shopper · Mobile · Post view | 7275:20903 | 390×992 | Header 7275:20910 (back, avatar, handle, date, IG glyph), Media 7275:20923 (2 Product Tags + 2 Pulse + Hint "Tap dots to shop"), caption, "In this post" Tagged Products, Sticky bar 7275:21000 ("Add both · $56.00") |
| Shopper · Mobile · Product | 7275:21002 | 390×1192 | Media 7275:21009 (floating Back/Bag 40×40, Pager chip "1 / 4"), body, Sticky bar 7275:21089 (Buy now Secondary + Add to bag Primary) |
| Shopper · Mobile · Checkout | 7275:21092 | 390×963 | Collapsible order summary ("2 items · Show details · $55.80"), INSTA10, sticky Pay |
| Shopper · Mobile · Order placed | 7275:21809 | 390×800 | Parcel render, "Packing · ships tomorrow" |
| Merchant · Desktop · Instagram store | 7275:21184 | 1440×1232 | Sidebar instance, "Your Instagram store", onboarding checklist "Go live on Instagram" (Connect @mossandkiln / Sync 132 products / Claim grove.shop/mossandkiln / Tag your 6 latest posts / Put your store link in bio) with Progress Bar, recent posts with tag counts ("3 products", "Tag products"), store link card ("1,240 visits this week"), KPI Tile + Sparkline + Delta, Switches |
| Merchant · Desktop · Tag a post | 7275:21370 | 1440×900 | Top bar (Cancel / Save tags), Stage 7275:21385 → Media 7275:21392 (560×700 r16) with Product Tags, Pulse, **Placing** reticle 7275:21412 (44×44, white@30, white stroke 2), Hint "Click anywhere on the photo to tag". Products panel 7275:21417: Search Field, "Tagged · 2", Tagged Product ×2 (Added) + "Often bought together" (Icon/sparkles, text/brand) + 1 Default, Switch "Show this post on grove.shop" |
| Merchant app · Mobile · Connect Instagram | 7275:21476 | 390×844 | Hero 7275:21477 (SHADER + white@60, Brand/Logo, 3 render images), "Your Instagram, now a store", "Connect once. Every post becomes shoppable at grove.shop/you.", "Continue with Instagram", "We only read your posts. We never post for you." |
| Merchant app · Mobile · Home | 7275:21556 | 390×821 | "Good morning", "Sales from Instagram · today $412.80", checklist "Finish going live", recent posts ("3 tagged", "Untagged"), custom Tab bar 7275:21675 (Home / Orders / Posts / Products) |
| Merchant app · Mobile · Tag a post | 7275:21692 | 390×802 | Media 7275:21709 (Product Tag Open + Hint "Tap the photo to add a tag"), bottom Sheet 7275:21714 (Search Field, "Tagged · 1", Tagged Product Added), Tab bar 7275:21742 |

**Instance inventory** (section + hero, 373 instances, by master name):

| Group | Instances |
|---|---|
| Icons | Icon/shopping-bag 78, Icon/layers 15, Icon/search 9, Icon/tag 9, Icon/plus 8, Icon/check 8, Icon/chevron-right 6, Icon/package 6, Icon/link 5, Icon/chevron-left 5, Icon/arrow-right 4, Icon/truck 4, Icon/x 4, Icon/house 4, Icon/layout-grid 3, Icon/star 2, Icon/repeat 2, Icon/circle-check 2, Icon/zap 2, Icon/credit-card 2, Icon/store 2, Icon/bell 2, Icon/image 2, plus 1 each of minus, wallet, chevrons-up-down, users, chart-column, megaphone, percent, settings, arrow-up-right, eye, trending-up, sparkles, receipt |
| Kit (this page) | Shoppable Post 52, Collection Circle 17, Tagged Product 8, Product Tag 7, Storefront Bar 4, Post Badge 3 |
| Brand | Social/Instagram 11, Brand/Logo 3 |
| Other pages | Button 21, Variant Option 14, Input 9, Nav Item 9, Search Field 3, Switch 3, Payment Method 2, Badge 2, Sidebar 1, Store Switcher 1, Top Bar 1, Progress Bar 1, KPI Tile 1, Sparkline 1, Delta 1, Shipment Tracker 1 |

**Not used: Mobile Tab Bar (7275:18747).** The merchant Tab bars are custom frames. The profile tabs and Follow/Share are also custom frames, not Tab, Segment or Button.

---

## 2. Raw `componentPropertyDefinitions` (as read from the COMPONENT_SET nodes)

```json
{
  "Collection Circle 7275:19802 (defaultVariant: State=New)": {
    "Label#772:0": { "type": "TEXT", "defaultValue": "Slow mornings" },
    "State": { "type": "VARIANT", "defaultValue": "New", "variantOptions": ["New", "Seen"] }
  },
  "Shoppable Post 7275:19815 (defaultVariant: Type=Photo, State=Default)": {
    "Type": { "type": "VARIANT", "defaultValue": "Photo", "variantOptions": ["Photo", "Carousel"] },
    "State": { "type": "VARIANT", "defaultValue": "Default", "variantOptions": ["Default", "Hover"] }
  },
  "Product Tag 7275:19846 (defaultVariant: State=Dot)": {
    "Name#772:3": { "type": "TEXT", "defaultValue": "Stoneware mug" },
    "Price#772:6": { "type": "TEXT", "defaultValue": "$28.00" },
    "State": { "type": "VARIANT", "defaultValue": "Dot", "variantOptions": ["Dot", "Open"] }
  },
  "Tagged Product 7275:19862 (defaultVariant: State=Default)": {
    "Name#772:9": { "type": "TEXT", "defaultValue": "Stoneware mug" },
    "Price#772:12": { "type": "TEXT", "defaultValue": "$28.00" },
    "Variant#772:15": { "type": "TEXT", "defaultValue": "Moss · 350 ml" },
    "State": { "type": "VARIANT", "defaultValue": "Default", "variantOptions": ["Default", "Added"] }
  },
  "Storefront Bar 7275:19889 (defaultVariant: Platform=Desktop)": {
    "Platform": { "type": "VARIANT", "defaultValue": "Desktop", "variantOptions": ["Desktop", "Mobile"] }
  },
  "Post Badge (orphan COMPONENT 772:4419, no on-page master)": {
    "Label#772:18": { "type": "TEXT", "defaultValue": "Seen in 6 posts" }
  }
}
```

- No set on this page has BOOLEAN or INSTANCE_SWAP properties.
- All five orphan masters have identical property keys and variant counts (checked key-by-key).

### Variant matrix

| Set | Variants (id, size) | Matrix complete? |
|---|---|---|
| Collection Circle | `State=New` 7275:19803 98×110; `State=Seen` 7275:19807 98×108 | 2/2. Sizes differ by 2 px (see issues). |
| Shoppable Post | Photo/Default 7275:19816; Photo/Hover 7275:19820; Carousel/Default 7275:19828; Carousel/Hover 7275:19833 (all 300×375) | 4/4. No Video/Reel type; no Focus, Pressed or Loading state. |
| Product Tag | `State=Dot` 7275:19847 24×24; `State=Open` 7275:19850 183×52 | 2/2. No placement variants (always opens to the right). |
| Tagged Product | `State=Default` 7275:19863 380×90; `State=Added` 7275:19871 380×90 | 2/2. No pending, sold-out or disabled state. |
| Storefront Bar | `Platform=Desktop` 7275:19890 1440×69; `Platform=Mobile` 7275:19901 390×69 | 2/2. No scrolled, elevated or search-open state. |

---

## 3. Anatomy, token bindings and hard-coded values per component

Legend: `{token}` = bound variable, `RAW` = unbound literal. Every padding, gap, radius, size and stroke width below is RAW unless stated otherwise: the page has **zero float-variable bindings**.

### 3.1 Collection Circle: 7275:19802

```
State=New 7275:19803  COMPONENT  AL vertical, gap 8, align MIN/CENTER, hug×hug
├─ Ring 7275:19804  FRAME 82×82  AL H, padding 3, r999, stroke {border/brand} w2 INSIDE
│   └─ Cover 7275:19805  ELLIPSE 72×72  fill IMAGE(FILL)
└─ Label 7275:19806  TEXT  {text/primary}  Grove/Label/M  WIDTH_AND_HEIGHT  ← Label#772:0
State=Seen 7275:19807  (same) Ring 7275:19808 80×80 stroke {border/default} w1
```

- Reaction on `State=New`: ON_CLICK → CHANGE_TO `State=Seen`, SMART_ANIMATE 220 ms, custom cubic bezier. Instances on screens carry the same reaction.
- Hard-coded values:
  - gap 8 (= space/2)
  - padding 3 (no token)
  - r999 (= radius/full)
  - stroke 2 and 1 (border-width/focus and default would bind, but "focus" is semantically wrong for a ring; needs `border-width/ring`)
  - cover 72 (no size token)
- Ring colour is a solid brand ring, **not** the Instagram gradient (a good, brand-neutral choice).

**Issues**
- **Layout shift.** The stroke is INSIDE and the frame hugs, so the ring is 82 px when New and 80 px when Seen. The tile height changes 110 → 108. In the mobile rail the items jump (7275:20755 is 82×110, 7275:20769 is 80×108). In code, use a fixed ring box and draw the ring with `box-shadow`/`outline` or a padding-compensated border.
- **Seen ring contrast** `border/default` vs `bg/canvas`: 1.18:1 light, 1.39:1 dark. This is **< 3:1** non-text contrast, and the ring is the *only* new/seen signal. Expose the state textually: add a visually hidden "New" to the accessible name, or `aria-describedby`.
- New ring `border/brand` on canvas: 5.92:1 light, 5.73:1 dark. OK.
- The Label has no max width or truncation; long collection names overflow. Needs `max-inline-size` + ellipsis, with the full name kept in the accessible name.
- No focus, hover, pressed or skeleton state. No size variants: the profile avatar ring 7275:20714 is 94 px and re-draws the same pattern by hand.

### 3.2 Shoppable Post: 7275:19815

```
Type=Photo, State=Default 7275:19816  COMPONENT 300×375 (4:5)  r6  fill IMAGE(FILL)   (no auto-layout; constraints)
└─ Shop badge 7275:19817  FRAME 47×30  AL H p5/10/5/8 g4  r999 clip  fill RAW #141714 @62%  constraints MIN/MAX @12,333
    ├─ Icon 7275:19818  INSTANCE Icon/shopping-bag 16×16 (local, Lucide)
    └─ Count 7275:19819  TEXT "3" {text/inverse} Grove/Label/M Strong   ← NOT a component property
Type=Photo, State=Hover 7275:19820
├─ Scrim 7275:19821  RECT 300×375  fill RAW #0f120f, layer opacity 0.38  constraints SCALE
├─ Shop badge 7275:19822  HIDDEN
└─ Shop CTA 7275:19825  FRAME 142×40  AL H p10/16 g6 r999  fill {bg/surface}  constraints CENTER/CENTER
    ├─ "Shop 3 items" 7275:19826  TEXT {text/primary} Grove/Label/M Strong   ← static text
    └─ Icon 7275:19827  Icon/arrow-right 16
Type=Carousel, State=Default 7275:19828  adds  Carousel 7275:19829  INSTANCE Icon/layers 20×20  constraints MAX/MIN @268,12
Type=Carousel, State=Hover 7275:19833  (Scrim 7275:19834, Carousel icon 7275:19835, badge hidden 7275:19836, CTA 7275:19839)
```

- Reactions: Default → Hover on ON_HOVER, SMART_ANIMATE **160 ms**, `cubic-bezier(0.2,0,0,1)` (= `easing/standard`). 160 is off-token: snap it to `duration/fast` 140.
- Hard-coded values:
  - r6 (no radius token between xs 4 and sm 8)
  - `#141714@62` (not a palette value; nearest is neutral/950 `#101311`)
  - Scrim `#0f120f` @38 opacity (no overlay or scrim token exists)
  - badge padding 5/10/5/8, gap 4, CTA padding 10/16, gap 6, badge 30 tall, CTA 40 tall

**Issues**
- **Count is not a property.** The count is a raw text layer and "Shop 3 items" is static, so instances must dig into layers to edit them. In code use `tagCount` with an ICU plural ("Shop {count, plural, one {# item} other {# items}}").
- **Dark-mode bug.** Text/icon `text/inverse` flips to `#181b19` on the badge's dark translucent `#141714@62`. Contrast: 1.12:1 over a dark photo, 3.43:1 over a white photo. In light mode, white over the badge is 5.07:1 on a white photo and 19.4:1 on black.
- **Hover-only affordance.** The Shop CTA appears only on hover; there is no focus-visible equivalent and no touch equivalent. Hover also **hides** the count badge (information loss).
- The `Icon/layers` carousel indicator is white with no backing, shadow or scrim, so it is invisible on light photos (it would need the on-media treatment).
- `Type` only adds an indicator. It should be **derived** from `media.length > 1` (or `media.kind === 'video'`), not set as a prop.
- Missing variants: Video/Reel (play glyph + duration), Pinned, Sold-out, Skeleton/loading, Focus, Pressed. Only 4:5 is shown, but desktop grid tiles and the "Seen on our Instagram" strip use other sizes.

### 3.3 Product Tag: 7275:19846

```
State=Dot 7275:19847  COMPONENT 24×24  AL H gap 8
└─ Dot 7275:19848  FRAME 24×24  r999  fill {bg/surface}  effect STYLE Grove/Elevation/2 Raised
    └─ Ellipse 7275:19849  10×10  fill {bg/brand}
State=Open 7275:19850  COMPONENT 183×52  AL H gap 8
├─ Dot 7275:19851 (as above)
└─ Chip 7275:19853  FRAME  AL H p6/8/6/12 g10  r10  fill {bg/inverse}  effect STYLE Grove/Elevation/3 Popover
    ├─ Text 7275:19854  AL V gap 0
    │   ├─ Name 7275:19855  {text/inverse}  Grove/Label/M Strong   ← Name#772:3
    │   └─ Price 7275:19856 {text/tertiary} Grove/Label/M          ← Price#772:6
    └─ Icon 7275:19857  Icon/chevron-right 16 (local master 738:120)
```

- Reactions: Dot → Open (ON_CLICK, SMART_ANIMATE 240 ms) and Open → Dot (ON_CLICK, 220 ms), both custom bezier. 240 is off-token: map it to `duration/base` 220.
- Screens add separate **Pulse** ellipses (24×24, RAW white @35 fill + RAW white stroke 1.5): 7275:20936, 7275:20949, 7275:20297, 7275:20310, 7275:21405. They are a halo animation keyframe that is **not part of the component**.
- The merchant editor adds **Placing** 7275:21412 (44×44 reticle, white@30 fill + white stroke 2, dashed in the screenshot) and Hint chips 7275:20952 / 7275:21711 / 7275:21414 ("Tap dots to shop", "Tap the photo to add a tag", "Click anywhere on the photo to tag"). The hints use RAW `#141714@62`, `text/inverse`, Label/M and Icon/tag 16.

**Issues**
- **Hit target**: the dot is 24×24 against `size/touch-min` 44. It needs an invisible 44 px hit area (pseudo-element) without changing the visual.
- **Price contrast**: `text/tertiary` on `bg/inverse` is 4.03:1 light and 4.31:1 dark. This fails AA (14 px). Use `text/inverse` at reduced emphasis via a token such as `text/inverse-secondary`, or a lighter neutral.
- The chip uses `bg/inverse`, which flips to white in dark mode. It reads OK, but chips over photos should arguably keep one appearance in both modes (on-media family).
- **Placement is fixed to the right.** Tags near the right edge (Fig & cedar candle 7275:20950 sits at x≈208 of 390) need collision-aware flipping (left/top/bottom) and a max width.
- Prices use `Label/M` here but `Numeric/M` (tabular) in Tagged Product: inconsistent.
- The chevron implies navigation (to the PDP), but tapping the Open chip in the prototype closes it. Decide: chip = link to product, dot = toggle.
- r10 and padding 6/8/6/12 are off-scale. The chip has no max width or truncation for long names.
- No hover, focus, out-of-stock or "added" state. No pulse property. No reduced-motion note.

### 3.4 Tagged Product: 7275:19862

```
State=Default 7275:19863  COMPONENT 380×90  AL H p12 g14  fill×hug  r16  fill {bg/surface}  stroke {border/subtle} 1 INSIDE
├─ Thumbnail 7275:19864  RECT 64×64 r12 IMAGE(FILL)
├─ Text 7275:19865  AL V gap 2  fill
│   ├─ Name 7275:19866     {text/primary}  Grove/Label/M Strong  ← Name#772:9
│   ├─ Variant 7275:19867  {text/tertiary} Grove/Body/M          ← Variant#772:15
│   └─ Price 7275:19868    {text/primary}  Grove/Numeric/M       ← Price#772:12
└─ Add 7275:19869  FRAME 40×40 r999 fill {bg/surface} stroke {border/default} 1
    └─ Icon 7275:19870  Icon/plus 18×18
State=Added 7275:19871  … Add 7275:19877 fill {bg/brand}  → Icon 7275:19878 Icon/check 18×18
```

- Reactions: Default → Added (ON_CLICK, 280 ms) and Added → Default (220 ms), SMART_ANIMATE. 280 is off-token: use `duration/base`.
- Hard-coded values: padding 12, gap 14 (no space token: space/3 is 12, space/4 is 16), gap 2, r16 (= radius/lg), thumb 64 and r12 (= radius/md), action 40 (= control-md), icon 18 (off the 16/20/24 scale).

**Issues**
- **Hit target**: the action is 40×40 (< 44).
- **Variant contrast**: `text/tertiary` is 4.31:1 on white and 4.03:1 on dark surface. Fails AA.
- Default action border `border/default` vs surface is 1.27:1, so the button boundary is barely visible (the icon carries it).
- **Two semantics, one visual.** Shopper uses it as "Add to bag" (mobile post view 7275:20903). Merchant uses it as "tag/untag product" with "Moss · 124 in stock" (7275:21438 etc.). Code needs a configurable action label and handler.
- Added is shown only by an icon swap and fill change; there is no textual confirmation. Needs `aria-pressed` + live announcement.
- No pending/adding, sold-out/disabled or quantity state. No skeleton. Fill-width only.
- **Overlap**: this row is near-identical to Product Row (05 Commerce, 7275:14040). Build Tagged Product as a composition of the commerce `ProductRow` + an action slot.

### 3.5 Storefront Bar: 7275:19889

```
Platform=Desktop 7275:19890  1440×69  AL H p14/48 g16  fill {bg/canvas}  stroke {border/subtle} bottom-only 1
├─ Identity 7275:19891  AL H g10 fill-width clip
│   ├─ Avatar 7275:19892  ELLIPSE 32×32 IMAGE
│   └─ Handle 7275:19893  "mossandkiln" {text/primary} Grove/Label/L       ← static text, no prop
├─ Search 7275:19894  FRAME 360×40  AL H p10/14 g10 r999 fill {bg/subtle}
│   ├─ Icon 7275:19895  Icon/search 18
│   └─ 7275:19896 "Search Moss & Kiln" {text/tertiary} Grove/Body/M
└─ Bag 7275:19897  40×40 r999 stroke {border/default} 1
    ├─ Icon 7275:19898  Icon/shopping-bag 20
    └─ Count 7275:19899  ABS @24,-4  19×20  p0/5 r999 fill {bg/brand}  → "2" {text/on-brand} Label/M Strong
Platform=Mobile 7275:19901  390×69  p14/16 g16   Identity 7275:19902 | Icon/search 7275:19905 (bare 20×20 instance) | Bag 7275:19906 (+ Count 7275:19908)
```

No reactions.

**Issues**
- **Duplication.** No TEXT, BOOLEAN or INSTANCE_SWAP props: handle, avatar, search placeholder and count are all locked. The bar duplicates existing components:
  - Search Field (06 Navigation, 7275:14764)
  - Icon Button (02, 7275:11357)
  - Badge (02, 7275:11374)
  - Top Bar (orphan 755:1031)
- `Platform` is a layout concern. Use CSS container queries, not a prop.
- Mobile search is a **bare 20×20 icon** with no button, no hit target and no semantics. The Bag is 40×40.
- Count badge: `text/on-brand` on `bg/brand` is 8.51:1 light and 5.17:1 dark (OK). There is no 0, 99+ or overflow rule, and the badge is not announced.
- Search placeholder `text/tertiary` on `bg/subtle` is 4.16:1 light and 4.03:1 dark. Fails AA.
- No scrolled/elevated, search-expanded or loading state. Desktop padding 48 matches `grid/margin` only on Desktop, and the value is raw.

### 3.6 Post Badge: orphan master 772:4419 (no on-page master)

```
Post Badge 7275:19884 (instance)  151×28  AL H p4/12/4/10 g8  r999  fill {bg/brand-subtle}
├─ Glyph  INSTANCE Social/Instagram 20×20  → Vector fill {icon/brand}
└─ Label  TEXT "Seen in 6 posts"  {text/brand}  Grove/Label/M   ← Label#772:18
```

- Contrast: `text/brand` on `bg/brand-subtle` is 7.49:1 light and 7.37:1 dark. OK.

**Issues**
- **Breaks its glyph's own rule.** The Instagram glyph is used **decoratively**, but its description says "Only for “Connect / Follow on Instagram” links — never as Grove decoration." Swap it for `Icon/layers` or `Icon/image`, or make the badge a real link to the posts.
- The master is missing from the page: it cannot be edited here.
- Label is free text. In code: `count` + plural message.
- Height 28: fine if non-interactive. If it becomes a link, it needs a 44 hit area.
- Effectively a `Badge` (02) with a leading icon and a brand tone. Do not create a new primitive.

### 3.7 Instagram glyph: Social/Instagram (orphan master 772:4302, 20×20)

- Single vector. Colour comes from the instance: `{icon/primary}` in the doc stage and post header, `{icon/brand}` in Post Badge.
- Sourced from Simple Icons, with a usage rule in its description.
- Used 11 times: post headers (link to Instagram, OK), the Follow button, the Connect CTA, and Post Badge (violates the rule).

### 3.8 Hero (top-level) 7279:1476 and Connect hero 7275:21477

- 7279:1476 fills:
  - **SHADER** paint with id `d4f1b93f0f6afdb57ab2f3555611afc78bc1e215/60962437ab10e7a266ac1568bbd2e27aedd8e47c`. Parameters: `ground` #edf2e8, `ray1` #216b48 (≈ green/600), `ray2` #c5e162 (≈ lime/300), `ray3` #f5a63f (amber, not in palette), `speed` 0.35, `angle` -10, `intensity` 0.8, `width` 1.3, `grain` 0.015.
  - **GRADIENT_LINEAR** `#f6f7f4` (= neutral/50, RAW, unbound) from 41% alpha at 0 to 100% at 100. It fades the rays into the canvas.
  - clipsContent, no children, no reactions.
- Visual: soft, grass-like curved light strands in green, lime and amber, fading to off-white at the bottom (see `10-hero-shader.png`).
- 7275:21477 has fills SHADER + RAW `#ffffff@60`. Children: Brand/Logo 7275:21481 (wordmark "Grove", RAW Geist SemiBold 16.25, not a text style; mark r8.125) and three 3D render images ("Render · Store" 260, "Render · Bag" 110, "Render · Tag" 90).
- Shader colours are raw, not bound to variables. `speed` and `grain` imply an **animated** WebGL background.

---

## 4. Non-componentised patterns on screens (candidates to extract)

| Pattern | Evidence (node IDs) | Notes |
|---|---|---|
| **Sticky action bar** | 7275:20898, 7275:21000, 7275:21089, 7275:21182 | AL H, padding 12/16/**28**/16 (28 ≈ home-indicator inset), gap 12 or 10 (inconsistent), `bg/surface`, top border `border/subtle`. Holds a summary ("2 items" Label/M text/secondary + "$62.00" Numeric/M) and 1–2 Button Lg instances. |
| **Image hotspot stage** | 7275:20923, 7275:20284, 7275:21392, 7275:21709 | Image fill + absolutely placed Product Tag / Pulse / Hint / Placing. Coordinates are absolute pixels, so code needs **relative (0–1) coordinates** to survive any aspect ratio. |
| **Media pager: dots** | 7275:20313 (30×6, 3 ellipses, white @100/50/50) | Desktop post modal. Mobile post view shows dots under the media (green active): two different treatments. |
| **Media pager: fraction chip** | 7275:21014 ("1 / 4", RAW `#ffffff@80`, `text/primary`, Label/M, r999) | Dark-mode contrast 1.08–1.49:1 (text/primary flips). |
| **Floating media buttons** | Back 7275:21010, Bag 7275:21012 (40×40 r999 `bg/surface`) | Under 44. Over a photo they need on-media treatment and a shadow. |
| **Profile header** | 7275:20706: Avatar ring 7275:20714 (94, padding 3, border/brand w2); Stats 7275:20716 (Numeric/M + Body/M text/secondary ×3); Bio; Follow/Share 7275:20742/20745 (175×40, r10, `bg/subtle`, custom frames) | Follow/Share are not Button instances (r10 vs Button r12). The stats frame is named "picks" but its label says "products". |
| **Icon tabs** | 7275:20790: 3× Tab 130×48 with 2 px indicator `bg/inverse` + icons (layout-grid `icon/primary`, shopping-bag and layers `icon/secondary`) | Custom, not the Tab component (06, 7275:14781). Icon-only, so needs aria-labels. Inactive icon `icon/secondary` on canvas is 4.01:1 (passes 3:1 non-text). |
| **Collections rail** | 7275:20748: AL H, padding 8/0/12/16, gap 14, 5 Collection Circles | Horizontal scroll; the right padding is 0 so the last item bleeds off-edge. |
| **Post grid** | 7275:20803: AL V gap 2 → rows AL H gap 2, 3 × Shoppable Post 129×161 | 3-col 4:5 grid, 2 px gutters (no token: space/0-5 is 2, but unbound). |
| **Post viewer modal** | 7275:20191: Scrim 7275:20276 + Post 7275:20283 (r20 = radius/xl, Elevation/4 Modal) + Close / Nav buttons outside | Dialog with gallery navigation. On mobile it is a full page (7275:20903). |
| **Bottom sheet** | 7275:21714 (padding 16/16/24/16, gap 12, `bg/surface`) | Holds Search Field + Tagged Product list. No grabber, no snap points shown. |
| **Hotspot editor** | 7275:21384 / 7275:21709 | Click or tap to place, Placing reticle, side or sheet product picker, AI suggestion row ("Often bought together", Icon/sparkles, `text/brand`), publish Switch. |
| **Onboarding checklist** | 7275:21184, 7275:21556 | "Go live on Instagram" steps + Progress Bar. Generic (`Checklist`), belongs with patterns. |

**Hygiene audit across the section** (2032 nodes):

- **Non-Grove variables: 0.** No Clario, Pipkin or other leftover collections are referenced (good).
- **Raw paints:**

| Value | Count | Where |
|---|---|---|
| `#141714@62` fills | 57 | Shop badges + hints |
| `#0f120f` fills | 4 | Scrims |
| `#ffffff@35` fills | 5 | Pulses |
| `#ffffff` strokes | 6 | Pulse/Placing |
| `#ffffff@100/50` | — | Pager dots |
| `#ffffff@80` | 1 | Pager chip |
| `#ffffff@30` | 1 | Placing |
| `#ffffff@60` | 1 | Connect hero |
| `#f6f7f4` | 1 | Connect screen bg: equals neutral/50 but unbound |
| `#000000` | 4 | Row labels |
| `#000000` | 7 | Doc stage/set dashed strokes |
| `#4f6b4a`, `#edebe4`, `#b8775a`, `#2b2d33` | 2 each | Product colour swatches inside Variant Option: legit data colours that must come from product data, not tokens |

- **Raw effects:** 13 Button instances (INNER_SHADOW + DROP_SHADOW, not bound to an effect style; a Button-page issue) and 3 Switch knobs (DROP_SHADOW).
- **Raw text:** Brand/Logo wordmark Geist SemiBold 12.5 and 16.25, scaled instances (Brand/Logo issue).
- **Text-style usage:**

| Style | Uses |
|---|---|
| Label/M Strong | 128 |
| Label/M | 116 |
| Body/M | 76 |
| Numeric/M | 36 |
| Label/L | 27 |
| Heading/H4 | 16 |
| Body/L | 14 |
| Heading/H2 | 10 |
| Heading/H1 | 6 |
| Numeric/L | 5 |
| Display/M | 4 |
| Heading/H3 | 3 |
| Mono/M Strong | 3 |
| Mono/M, Numeric/KPI, Numeric/Display | 1 each |

- **Effect-style usage:** Elevation/2 Raised 9, Elevation/3 Popover 5, Elevation/4 Modal 1. Glass and Liquid Glass are **not** used on this page.

---

## 5. Icons

- **Icon set: Lucide**, local copies (`remote=false`, masters `738:*` orphaned with parent null). The description says 20 px, 1.6 stroke, recolour via `icon/*`.
- Instances are resized to 16, 18, 20 and 22 px. Scaling changes the stroke: the 22 px chevron-left 7275:20911 has stroke 1.76. Tokens are only `size/icon-sm` 16, `md` 20 and `lg` 24.
- Icons used on this page: shopping-bag, arrow-right, layers, chevron-right/left, plus, check, search, link, layout-grid, truck, x, star, minus, repeat, package, circle-check, zap, wallet, credit-card, tag, store, chevrons-up-down, house, users, chart-column, megaphone, percent, settings, bell, arrow-up-right, eye, trending-up, sparkles, image, receipt.
- **Brand glyphs:** Social/Instagram (Simple Icons, 772:4302). Brand/Logo (739:64) is a Grove lockup and must become a Nizivo/tenant-configurable logo slot.
- **Recommendation:**
  - Make `lucide-react` (pinned) an optional peer through an `IconProvider`/`icon` prop that accepts any component. Do not re-export SVGs.
  - Keep strokes non-scaling (`vector-effect: non-scaling-stroke` or `absoluteStrokeWidth`) so 16/24 px icons keep 1.6.
  - Ship brand glyphs from a separate entry `@nizivo/social/brand-icons`, with the usage rule in JSDoc and docs, and `aria-hidden` by default.

---

## 6. Visual language (from screenshots)

- **Mood.** Warm, editorial and calm. An off-white canvas (`bg/canvas` neutral/50) with a soft green-lime "soft light" gradient band at the top of storefronts. Deep forest green (`bg/brand` green/700) is used only for primary actions, count badges, the New ring and dots. Photography carries the colour: warm, moody, natural light.
- **Density.** Mobile-first and comfortable: 16 px gutters, 12–16 px card padding, 48 px primary buttons in sticky bars. The desktop storefront is centred at 1040 px.
- **Shape.**

| Element | Radius |
|---|---|
| Pills (badges, search, CTA, count, hints) | r999 |
| Cards | r16 |
| Thumbs | r12 |
| Product Tag chip | r10 |
| Post tiles | r6 |
| Modal | r20 |
| Doc cards | r28 |

  Pill-heavy, but tiles are almost square-cornered, as Instagram tiles are.
- **Elevation.** Mostly flat with hairline `border/subtle` (1 px). Shadows only on floating things: the tag dot uses Elevation/2, the chip Elevation/3, the post modal Elevation/4. No glass or blur, even though the snapshot defines Surface/Glass. The dark translucent pills on photos act as a pseudo-glass and are a candidate for `Surface/Glass` (backdrop-blur) in code.
- **Motion cues.** Smart-animate state swaps (140–280 ms, standard easing), a pulse halo on hotspots, a hover scrim + CTA reveal, and an animated shader hero.
- **Colour use on photos.** Dark translucent chips (`#141714@62`), white rings, white surfaces: an implicit "on-media" theme that has no tokens.

---

## 7. Proposed architecture

### 7.1 Package placement (generic vs domain)

| Piece | Generic? | Package | Why |
|---|---|---|---|
| `Media` (image/video, aspect-ratio, lazy, injected Image) | Generic | `@nizivo/ui` | Used by product cards, galleries, posts, heroes |
| `MediaTile` (Media + overlay/badge/indicator slots + hover/focus reveal) | Generic | `@nizivo/ui` | Shoppable Post, Product Card and gallery thumbs share it |
| `Hotspot` (headless + styled: Root/Marker/Content/Pulse) | Generic | `@nizivo/ui` | Image annotations, product tags, floor plans, onboarding hints |
| `AvatarRing` / `StoryRing` (status ring: new / seen / none / live) | Generic | `@nizivo/ui` | Profile avatar (94) and collection circle (72) share it |
| `PageIndicator` (dots and fraction) | Generic | `@nizivo/ui` | Carousels, onboarding |
| `Carousel` (scroll-snap, aria-roledescription) | Generic, heavier | `@nizivo/ui` (separate entry `@nizivo/ui/carousel`) | Post media and PDP gallery |
| `StickyActionBar` | Generic | `@nizivo/ui` (pattern) | Mobile PDP, cart, checkout, post |
| `AppBar` (identity / center / actions slots) | Generic | `@nizivo/ui` (pattern) | Storefront Bar, Top Bar, checkout bar |
| `Checklist` (onboarding steps + progress) | Generic | `@nizivo/ui` (pattern) | Merchant dashboards |
| `Money`/`Price`, `ProductRow`, `ProductThumb` | Commerce-generic | `@nizivo/commerce` | Shared with page 05 |
| **CollectionCircle, ShoppablePost, ProductTag, TaggedProduct, StorefrontBar, PostBadge, PostViewer, ProfileHeader, HotspotEditor, SocialGlyph** | Domain (creator / social commerce) | **`@nizivo/social`** (peer-depends on `@nizivo/ui` + `@nizivo/commerce`) | All five sets ship together. Platform-neutral names. Instagram specifics live only in `/brand-icons` and an optional `/adapters/instagram` |
| `RaysBackground` shader hero | Experimental, heavy (WebGL) | `@nizivo/lab` → later `@nizivo/motion` | Lazy, opt-in, needs a static fallback |

### 7.2 Pluggability contracts (cross-cutting, design these first)

```ts
// @nizivo/ui
type MediaSource =
  | { kind: 'image'; src: string; alt: string; width?: number; height?: number; srcSet?: string; sizes?: string; placeholder?: string /* blurDataURL or color */ }
  | { kind: 'video'; src: string | { src: string; type: string }[]; poster?: string; alt: string; width?: number; height?: number; durationSec?: number };

interface NizivoProviderProps {
  components?: {
    Image?: React.ComponentType<NzImageProps>;   // pass next/image here; default <img loading="lazy" decoding="async">
    Link?: React.ComponentType<NzLinkProps>;     // pass next/link / react-router Link; default <a>
    Icon?: IconResolver;                         // lucide-react or custom
  };
  locale?: string;
  formatters?: { money?: (m: Money) => string; compact?: (n: number) => string; date?: (d: Date) => string };
  messages?: Partial<NizivoMessages>;            // ICU plurals: shop_items, seen_in_posts, bag_items...
  announce?: (msg: string, politeness?: 'polite' | 'assertive') => void; // live-region announcer (default internal)
  motion?: 'system' | 'reduced' | 'full';
  brand?: { name: string; logo?: React.ReactNode; storeHost?: string }; // replaces hard-coded "Grove", "grove.shop"
}

// @nizivo/commerce
type Money = { amount: number; currency: string };   // minor units or decimal: pick one, document it
type ProductSummary = { id: string; name: string; href?: string; image?: MediaSource; price: Money; compareAt?: Money; attributes?: string[]; availability?: 'in_stock' | 'low' | 'sold_out' };

// @nizivo/social
type ProductTagData = { id: string; product: ProductSummary; x: number; y: number }; // x/y normalised 0..1
type SocialPost = { id: string; href?: string; media: MediaSource[]; caption?: string; publishedAt?: string; tags: ProductTagData[]; source?: { platform: string; url?: string } };
```

- **next/image interop without depending on Next.** `components.Image` receives `{src, alt, width, height, sizes, priority, fill, className, style}`. An adapter in user land is one line, `Image={NextImage}`. Every media-rendering component also accepts `asChild`/`renderImage` for one-off overrides.
- **Lazy loading.**
  - Default `loading="lazy"`, `decoding="async"`, and an intrinsic `width`/`height` or CSS `aspect-ratio` to avoid CLS.
  - `priority` maps to `loading="eager"` + `fetchpriority="high"`. Use it for the first grid row and the post viewer media.
  - Video: `preload="none"`, `muted playsInline`, autoplay only in view (IntersectionObserver) and never under reduced motion.
- **Data adapters** (`@nizivo/social/adapters/instagram`): map Instagram Graph media and product-tag payloads to `SocialPost`. Components never see platform payloads, so TikTok, Pinterest or a manual CMS can plug in.
- **Slots and compound parts** everywhere (Radix-style `asChild` via a `Slot` primitive). Variants are expressed with a class-variance map over CSS variables, so themes and tokens can be swapped without touching components.

### 7.3 Per-component API (Figma prop → code prop)

#### CollectionCircle (`@nizivo/social`) on top of `StoryRing` (`@nizivo/ui`)

| Figma | Code |
|---|---|
| `Label#772:0` (TEXT) | `label: ReactNode` (or `children`) |
| `State=New/Seen` | `seen?: boolean` (default false). The ring style comes from the `StoryRing status="new" \| "seen" \| "none"` primitive |
| cover image fill | `image: MediaSource` (rendered through `Media`) |
| (implied link) | `href` → injected `Link`; or `onSelect` → `<button>` |
| — | `size?: 'md' (72 cover) \| 'lg' (94, profile)`; `ringWidth` via token `border-width/ring` |

- Example: `<CollectionCircle href="/c/mornings" image={img} label="Mornings" seen={false} />`
- Rail: `<CollectionRail>` is a `<ul>` with scroll-snap and an edge fade; native Tab order.
- **A11y:** a link with name `"Mornings, new picks"` when not seen (visually hidden suffix from `messages`).
- **RSC: server.** It is just a link. Marking it seen is app state; if done client-side, wrap it in a tiny client island.

#### ShoppablePost (`@nizivo/social`) on `MediaTile` (`@nizivo/ui`)

| Figma | Code |
|---|---|
| `Type=Photo/Carousel` | Derived: `post.media.length > 1` shows the carousel indicator; `kind === 'video'` shows the play indicator (new) |
| `State=Default/Hover` | **Not a prop.** CSS `:hover`, `:focus-visible` and `:focus-within`; `@media (hover: none)` hides the CTA |
| badge text "3" | `tagCount` (default `post.tags.length`) |
| "Shop 3 items" | `messages.shopItems({count})`; override with `ctaLabel` |
| image fill | `post.media[0]` via `Media`, `aspectRatio="4/5"` (prop: `'4/5' \| '1/1' \| '9/16' \| number`) |

- Example: `<ShoppablePost post={post} href={`/p/${post.id}`} priority={i < 3} onOpen={openViewer} />`
- Compound parts for custom layouts: `ShoppablePost.Root / .Media / .Badge / .Indicator / .Overlay / .Cta`.
- **A11y:** the tile is **one** link, named for example "Post from Oct 12 · 3 tagged products". The CTA is visual only (`aria-hidden`) inside the link: no nested interactive elements. The focus-visible ring is `Focus/Ring` on the tile.
- **RSC: server.** The hover reveal is pure CSS. `onOpen` (intercepting navigation) makes a client wrapper, so the link-only default stays server.
- Grid: `<PostGrid columns={{base:3, md:3}} gap="0-5">` is a server component.

#### ProductTag (`@nizivo/social`) on `Hotspot` (`@nizivo/ui`)

| Figma | Code |
|---|---|
| `Name#772:3` | `product.name` |
| `Price#772:6` | `product.price: Money` formatted by the provider (tabular nums) |
| `State=Dot/Open` | `open`, `defaultOpen`, `onOpenChange` (controlled + uncontrolled) |
| (position on photo) | `x`, `y` (0–1) from `ProductTagData` |
| Pulse (screens only) | `pulse?: boolean` (`Hotspot.Pulse`, CSS keyframes, off under reduced motion) |
| chevron | the chip is a link when `product.href` is set (`Hotspot.Content asChild`) |

- Container example:
  ```tsx
  <ProductHotspots media={post.media[0]} tags={post.tags} type="single" hint="Tap dots to shop" />
  ```
  It exposes `renderTag`, `value`/`onValueChange` (which tag is open), `showHint` and `aspectRatio`.
- **Behaviour (headless `useHotspotGroup`):**
  - Markers are `<button aria-expanded aria-controls>` with a 44 px hit area and accessible name "Show Stoneware mug, $28.00".
  - The content is a **non-modal popover** (disclosure pattern). Prefer the CSS anchor positioning / `popover` attribute where supported, with a floating-ui fallback for flip/shift collision. Max-width plus truncation.
  - Escape closes. Outside click closes. Single-open by default.
  - DOM order is sorted by (y, x) so Tab order follows reading order.
  - The group has `role="group"` with `aria-label="Products tagged in photo"`. The "In this post" list (TaggedProduct) is the equivalent accessible path, and should be rendered and associated via `aria-describedby`.
- **RSC: client** (state + positioning). The image itself stays server-rendered; only the overlay layer hydrates.

#### HotspotEditor (`@nizivo/social/editor`, heavy, client)

- `value: ProductTagData[]`, `onChange`, `onPlace(x, y)`, `renderPicker`, `maxTags`.
- Click or tap to place shows a placing reticle (44 px), then the picker (side panel on desktop, sheet on mobile).
- Markers can be dragged; arrow keys nudge (Shift = 10×); Delete removes.
- Announce "Tag placed at 42%, 61%. Choose a product."
- Out of core because of pointer math, drag and picker coupling.

#### TaggedProduct (`@nizivo/social`) = `ProductRow` (`@nizivo/commerce`) + `ToggleAction`

| Figma | Code |
|---|---|
| `Name#772:9` / `Price#772:12` / `Variant#772:15` | `product: ProductSummary` (`attributes` joined with " · " by `messages.attrSeparator`) |
| `State=Default/Added` | `selected`, `defaultSelected`, `onSelectedChange` (controlled + uncontrolled; the name is neutral so it works for "added to bag" and "tagged") |
| — | `pending?: boolean` (optimistic spinner), `disabled`, `availability` (sold out turns the action off and shows a label) |
| — | `actionLabel?: { off: string; on: string }`, defaulting to messages "Add {name} to bag" / "Remove {name} from bag" |
| thumbnail | `product.image` via `Media` 64 px, r = radius/md |

- Compound parts: `TaggedProduct.Root / .Thumbnail / .Info / .Action` (an `Action` slot lets merchants put a menu there).
- **A11y:**
  - The row is a `<li>` in a `<ul aria-label="In this post">`. The name links to the PDP.
  - The action is a toggle `<button aria-pressed>` with a 44 px hit area.
  - On change, `announce("Added Stoneware mug to bag")` (polite).
- **RSC: split.** Server row with a client `ToggleAction` island.

#### StorefrontBar (`@nizivo/social`) on `AppBar` (`@nizivo/ui`)

| Figma | Code |
|---|---|
| `Platform=Desktop/Mobile` | **Not a prop.** Container query: at ≥ 640 px container width the search shows inline (`SearchField`); below that it collapses to `IconButton` → `SearchDialog` or an expanding field |
| avatar + handle | `<StorefrontBar.Identity avatar={media} name="mossandkiln" href="/" verified? />` |
| search pill | `<StorefrontBar.Search placeholder action="/search" onSubmit />` reusing `SearchField` |
| bag + count | `<StorefrontBar.Cart count={2} href="/bag" />` (`Badge` with `max={99}`, hidden at 0, `aria-label="Bag, 2 items"`, the visual count `aria-hidden`) |
| — | `sticky?: boolean`, `elevateOnScroll?: boolean` (client hook), `actions` slot |

- **A11y:** a `<header>` landmark, a `role="search"` form, and an IconButton with a 44 px target.
- **RSC: split.** Server shell; client islands for the search dialog, a live cart count (from the provider/store) and elevate-on-scroll.

#### PostBadge (`@nizivo/social`) = `Badge` (`@nizivo/ui`, tone "brand", leading icon)

- `<PostBadge count={6} href? icon? />` renders the label `messages.seenInPosts({count})`.
- The default icon is **not** the Instagram glyph (per its usage rule). `icon` stays overridable.
- **RSC: server.**

#### SocialGlyph / InstagramIcon (`@nizivo/social/brand-icons`)

- `<InstagramIcon size="md" />` is `aria-hidden` by default and inherits `currentColor` (icon/* tokens).
- JSDoc and lint docs carry the usage rule. Trademark and brand-guideline notes go in docs.
- **RSC: server.**

#### StickyActionBar (`@nizivo/ui`)

- `<StickyActionBar summary={<><Text>2 items</Text><Price …/></>}>{buttons}</StickyActionBar>`
- Position sticky, bottom 0. `padding-block-end: calc(var(--nz-space-3) + env(safe-area-inset-bottom))`. This replaces the hard-coded 28.
- Top border `border/subtle`; gap is token space/3 (unify the 12 vs 10).
- Optional `hideOnScroll`.
- **RSC: server** (CSS only). Content may be client.

#### PostViewer (`@nizivo/social`, pattern)

- `open` / `onOpenChange`, `post`, `onPrev` / `onNext` (or `posts` + `index`), `layout="auto" | "dialog" | "page"`.
- Desktop: modal Dialog (`@nizivo/ui` Dialog: focus trap, Escape, scrim token, `Elevation/4`, r = radius/xl). Prev/next IconButtons sit outside the panel. Left/Right arrow keys navigate. The live region announces "Post 3 of 18".
- Mobile: full page.
- Router-agnostic. For Next intercepting routes, document the pattern rather than depend on it.
- **RSC: client** for the dialog; the inner `PostDetail` can be server.

#### ProfileHeader (`@nizivo/social`, pattern)

- Slots: `avatar` (StoryRing lg), `stats` (array of `{value, label}` with compact formatting), `name`, `bio`, `actions` (use the real Button, not custom r10 frames).
- **RSC: server.**

#### ProfileTabs

- Uses `@nizivo/ui` Tabs (WAI-ARIA Tabs pattern, roving tabindex, arrow keys) with icon-only triggers, each with `aria-label` (Posts / Shop / Collections).
- **RSC: client** (or a link-based "nav tabs" as a server component when each tab is a route).

#### RaysBackground (`@nizivo/lab`)

- Props: `ground`, `rays: [c1, c2, c3]` (default to tokens: green/600, lime/300 + a new amber token), `speed`, `angle`, `intensity`, `width`, `grain`, `fallback` (static image or CSS gradient), `paused`.
- Lazy-loads WebGL in `useEffect`.
- Respects `prefers-reduced-motion` (render one static frame) and pauses offscreen or when the tab is hidden.
- **RSC: split.** The server renders the fallback; the client upgrades it.

### 7.4 Motion mapping

| Figma reaction | Duration | Easing | Token mapping |
|---|---|---|---|
| Shoppable Post hover (ON_HOVER → Hover) | 160 ms | `cubic-bezier(0.2,0,0,1)` | `duration/fast` (140) + `easing/standard`; opacity + scale/hover 1.02 on the image is optional |
| Collection Circle New → Seen | 220 ms | custom bezier (not read) | `duration/base` + `easing/standard` |
| Product Tag Dot → Open | 240 ms | custom bezier | `duration/base` + `easing/enter` (chip scale 0.96 → 1, opacity, origin = dot) |
| Product Tag Open → Dot | 220 ms | custom bezier | `duration/base` (or fast) + `easing/exit` |
| Tagged Product Default → Added | 280 ms | custom bezier | `duration/base` + `easing/spring` (needs a `linear()` approximation) |
| Tagged Product Added → Default | 220 ms | custom bezier | `duration/base` |
| Hotspot pulse (static in Figma) | — | — | New token `duration/pulse` (≈ 1600 ms loop); disabled in Reduced mode |

All of these are covered by the Motion collection's Reduced mode (durations go to 0 or 120). The pulse must be removed entirely under reduced motion.

---

## 8. Issues summary (ranked)

1. **Orphaned masters / disconnected sets** (file-wide). Fix in Figma: move the 772:* / 738:* / 744:* / 755:* masters onto their pages or swap instances to the on-page sets, then delete the duplicates. Until then, Code Connect should target the on-page sets but treat both IDs as aliases.
2. **No float-token bindings.** Bind padding, gap, radius, size and border-width to Grove Space. Off-scale values to resolve: r6, r10, padding 3, padding 5, gap 14, gap 10, icon 18/22, cover 72, bottom inset 28.
3. **No on-media tokens → dark-mode contrast failures.**
   - Shop badge and hints: 1.12–3.43:1 in dark mode.
   - Pager chip: 1.08–1.49:1 in dark mode.
4. **`text/tertiary` fails AA** (4.03–4.31:1) for Product Tag price, Tagged Product variant, search placeholder and post date.
5. **Seen ring contrast** 1.18–1.39:1, and it is the only state signal.
6. **Touch targets under 44:** Product Tag dot 24; Tagged Product action 40; bag 40; floating back/bag 40; nav and close 40; mobile search 20 (no button); post-header back 22 (no button).
7. **Hover-only shop CTA.** No keyboard or touch parity, and the badge is hidden on hover.
8. **Static strings that should be props:** badge count, "Shop N items", handle, search placeholder, bag count, Post Badge label.
9. **Collection Circle layout shift** (ring stroke 2 vs 1 with a hugging frame).
10. **Product Tag always opens to the right.** No collision handling, no max width.
11. **Post Badge breaks the Instagram glyph usage rule.**
12. **Duplication of existing components:** Storefront Bar vs Search Field / Icon Button / Badge / Top Bar; Tagged Product vs Product Row; Follow/Share vs Button; icon tabs vs Tab; merchant tab bars vs Mobile Tab Bar.
13. **Missing states:**
    - Every set: focus-visible, disabled, skeleton/loading, error.
    - Shoppable Post: video/reel, pressed.
    - Product Tag: hover, sold-out.
    - Tagged Product: pending, sold-out.
    - Storefront Bar: scrolled, search-open, cart 0 / 99+.
    - Collection Circle: size variants.
14. **Off-token durations:** 160, 240 and 280 ms.
15. **Docs gaps.** Empty descriptions on 4 of 5 sets, no documentationLinks, no a11y or motion annotations on the page. Brand copy is hard-coded to "Grove" / "grove.shop" / "Powered by Grove".
16. **Price typography inconsistent:** Label/M in the tag vs Numeric/M in the row.
17. **Hero shader colours are raw.** `ray3` amber `#f5a63f` is not in the palette, and the fade gradient `#f6f7f4` is unbound.

---

## 9. Extraction gaps

- Hero 7279:1476 has no children. Only the shader parameters are readable; the shader source and code cannot be read through the plugin API (paint id only).
- Easing curves for Collection Circle, Product Tag and Tagged Product reactions were seen only as `CUSTOM_CUBIC_BEZIER`; their control points were not read. Shoppable Post's is (0.2,0,0,1).
- Which copy is canonical (on-page 7275:* set vs orphan 772:* master) cannot be verified from the API. Both have matching property keys and variant counts, but visual parity of every child was not diffed.
- Screen subtrees were sampled (media stages, sticky bars, tabs, profile, rail, sheet, editor, modal). Checkout, order-placed and merchant dashboard internals were reviewed from screenshots and text only, because they compose components from other pages (05/06/07).
- Not every icon vector's colour binding inside variants was read. For example, the Icon/check colour in Tagged Product Added is assumed to be on-brand white.
- There is no video or reel media anywhere in the file, so video behaviour is a recommendation, not an extraction.
- Overlap claims against Product Row / Search Field / Top Bar / Mobile Tab Bar are based on names and the snapshot. Those sets were not read on this page.
