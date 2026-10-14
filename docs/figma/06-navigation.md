# Grove · 06 Navigation — component architecture report (Nizivo UI)

- File: `BIzJFf1wm8KP0YG2AVI1tP` ("Grove UI Library" when read, now "Nizivo UI Library" → ships as **Nizivo UI**, `@nizivo/*`)
- Page: **Grove · 06 Navigation** `7275:14694` → single SECTION `7275:14695` (4000×1710)
- Read: 2026-10-14, read-only. **14 Figma calls**: 11 `use_figma` (2 of them exceeded the 20 KB return cap, returned nothing and were re-run as smaller reads) + 3 `get_screenshot`. There were no rate-limit or 429 errors.
- Screenshots: `scratchpad/figma/shots/06-navigation-section.png` (whole section @3000), `06-doc-tabs.png` (Doc/Tabs 7275:14777), `06-doc-nav-item.png` (Doc/Nav item 7275:14696).
- Token names refer to `00-tokens-and-styles.md`. CSS prefix `--grove-*` must become configurable (`--nz-*`).

---

## 0. TL;DR — the ten things downstream agents must know

1. **The page has two copies of every component set. The copy on this page has no instances.** The five sets on this page (7275:*) are duplicates of "live" sets (755:*) that are **not on any page**: their parent chain ends at the set, `removed=false`, and they still have instances. Every instance in the file, including the ones on this page (the Sidebar's Nav Items, the tab-bar and segmented examples, and the Top Bar's search field), points at the 755:* copy. The two copies are structurally identical today (same property IDs `#755:N`, sizes and fills), but **editing the page copy changes nothing downstream**. Map Code Connect to the live IDs, or have design relink the instances first (§1).
2. **Store Switcher, Command Menu, Top Bar, Breadcrumb and Pagination are standalone COMPONENTs that are not on any page either** (755:663 / 755:889 / 755:1031 / 755:998 / 755:1007). The page only shows instances of them. The **Lucide icon components (738:\*) and Social/Instagram (772:4302) are orphaned the same way.** The icon library is not documented on any page.
3. **Colour and type are 100% tokenized** (no hard-coded hex values and no unstyled text on the page). **Spacing is 0% tokenized**: not one padding, gap or stroke weight is bound to a `space/*` or `border-width/*` variable. Several values are off the scale: 9, 10, 14, 3, 1/7, 1/6. Radius is only partly bound (§9).
4. **Tabs and Segment have different semantics, and the design says so.** Doc text 7275:14780 reads *"Underline tabs switch views; the segmented control switches ranges."* So Tabs map to the WAI-ARIA **Tabs** pattern (or link-nav when the views are routes), and Segment maps to a **Radio Group** (single-select, always one value).
5. **No container components exist** for Tabs or for the Segmented Control. Only the item parts exist. The containers live as "Example" frames, so code must define the container API (§5, §6).
6. **"Active" means three different ARIA states.** NavItem uses `aria-current="page"`, Tab uses `aria-selected`, and Segment uses `aria-checked`. Rename to `current`, `selected` and `value` in code. "State=Hover/Active" are CSS concerns, not props.
7. **Nav Item hover is invisible in light mode.** `bg/hover` and the sidebar's `bg/canvas` both resolve to neutral/50 #f6f7f4, a contrast of 1.00:1. **In dark mode the Segment's active thumb is invisible:** `bg/surface` and `bg/subtle` are both neutral/900 (1.00:1), and Elevation/1 is black at 3–4%.
8. **`text/tertiary` fails AA for 14 px Regular text on every light surface:** 4.16 on bg/subtle, 4.01 on bg/hover, 4.31 on bg/surface, and 4.03 in dark. This affects the search placeholder, Command Menu row meta and the store domain. It is a token problem.
9. **No Focus state on Nav Item, Tab or Segment.** Only Search Field has one. **No Disabled, Pressed or Loading state anywhere, and no Size axis.** Hit targets are 32–40 px, below `size/touch-min` (44).
10. **Sidebar widths drift from the tokens.** Figma is 248 / 76; `layout/sidebar` is 264 / 72 / 0. The doc says "collapsed to icons at tablet" and the token says mobile = 0, so there are **three** states: expanded, rail and off-canvas. Figma models two and **has no collapse toggle**. In the rail, all eight collapsed items carry `Label=Orders`.

---

## 1. File-structure finding: page copies vs live (orphaned) components

| Component | Page copy (on 06 page) | Instances | **Live set / component** (no page) | Instances (live) | Drift |
|---|---|---|---|---|---|
| Nav Item | SET `7275:14700` | 0 | SET **`755:658`** (variants 755:619/627/635/643/648/653) | 43 (Default/exp 22, Active/exp 3, Default/coll 16, Active/coll 2, Hover 0) | none — defs keys, sizes, padding, fills identical |
| Sidebar | SET `7275:14732` | 0 | SET **`755:869`** | not counted | not fingerprinted (assumed identical; contains the same 18 Nav Item instances) |
| Search Field | SET `7275:14764` | 0 | SET **`755:888`** (Default 755:874) | 7 (all Default) | none |
| Tab | SET `7275:14781` | 0 | SET **`755:961`** (Active 755:958) | 22 (17 Default, 5 Active) | none |
| Segment | SET `7275:14797` | 0 | SET **`755:982`** (Default 755:978) | 27 (21 Default, 6 Active) | none |
| Store Switcher | — (instances only) | — | COMPONENT **`755:663`** | 3 (2 on 06, 1 in live Sidebar) | n/a |
| Command Menu | — | — | COMPONENT **`755:889`** | 1 (06) | n/a |
| Top Bar | — | — | COMPONENT **`755:1031`** | 13 (Overview Dashboard 10, Instagram Storefront 1, Foundations 1, Navigation 1) | n/a |
| Breadcrumb | — | — | COMPONENT **`755:998`** | 2 | n/a |
| Pagination | — | — | COMPONENT **`755:1007`** | 3 | n/a |
| Icons (Lucide) | — | — | e.g. `738:323` Icon/shopping-bag (43 inst), `738:314` Icon/search (38 inst) | — | n/a |
| Social/Instagram | — | — | COMPONENT `772:4302` | — | n/a |

**Caveat on the counts:** they come from `getInstancesAsync()`, which counts **direct** instances only. Instances nested inside other instances are excluded. Evidence: Top Bar has 13 instances, each containing a Search Field, yet Search Field reports only 7. Real usage is therefore higher, but the key fact still holds: **the page copies have 0 direct instances.**

Evidence: `getNodeByIdAsync(id)` returns the node with `removed=false`, `remote=false`, a parent chain of `COMPONENT < COMPONENT_SET` (or just `COMPONENT`) with no PAGE, and a positive `getInstancesAsync()` count. The page copies' property keys carry `#755:N` suffixes (`Label#755:0`, `Icon#755:21`, …), which shows they were duplicated from the 755 sets. Pages in the file are Cover, `----` (356:1000), 01–10, `---` (7275:23025) and `----` (356:1001). None of them hold the 755/738/772 nodes.

Further symptom: the Nav Item instances embedded in the page-copy Sidebar (7275:14736–14759) have their **main component in the live 755 set**, but their prototype hover reactions target **page-copy** variants 7275:14706 / 7275:14718. In the prototype, hovering swaps an item to a different component set.

Also: the 43 direct Nav Item instances break down as 18 in live Sidebar 755:869, 18 in page-copy Sidebar 7275:14732, and **7 sitting loose on 08 Overview Dashboard** (outside any Sidebar instance). Whether 08 also uses Sidebar instances was not checked (nested instances are not counted).

**Action for the code pipeline:** treat the 755:* IDs as the canonical design source for Code Connect, and log a design request to (a) move the live components onto this page and delete the dead copies, or (b) swap all instances onto the 7275 copies.

---

## 2. Page inventory (section 7275:14695)

| Doc frame | ID | Contents |
|---|---|---|
| Doc/Nav item | 7275:14696 (916×346) | Header 7275:14697; **SET Nav Item 7275:14700** (820×160) |
| Doc/Store switcher | 7275:14722 (412×295) | Header 7275:14723; Stage 7275:14726 → INSTANCE Store Switcher 7275:14727 (→755:663) |
| Doc/Sidebar | 7275:14728 (502×1096) | Header 7275:14729; **SET Sidebar 7275:14732** (406×910) |
| Doc/Search & command | 7275:14760 (706×763) | Header 7275:14761; **SET Search Field 7275:14764** (410×151); Stage 7275:14775 → INSTANCE Command Menu 7275:14776 (→755:889) |
| Doc/Tabs | 7275:14777 (538×533) | Header 7275:14778; **SET Tab 7275:14781** (317×90); FRAME "Example · Tab bar" 7275:14791 (5 Tab instances 7275:14792–14796, →755:961); **SET Segment 7275:14797** (195×82); FRAME "Example · Segmented control" 7275:14802 (5 Segment instances 7275:14803–14807, →755:982) |
| Doc/Breadcrumb & pagination | 7275:14808 (786×374) | Header 7275:14809; Stage 7275:14812 → INSTANCE Breadcrumb 7275:14813 (→755:998); Stage 7275:14814 → INSTANCE Pagination 7275:14815 (→755:1007) |
| Doc/Top bar | 7275:14816 (1338×307) | Header 7275:14817; Stage 7275:14820 → INSTANCE Top Bar 7275:14821 (→755:1031) |

No nodes on the page sit outside the section. No Dev Mode annotations (`node.annotations` is empty everywhere).

---

## 3. Documentation text (verbatim; all of the page's non-component text)

| Node | Frame | Text |
|---|---|---|
| 7275:14698 | Doc/Nav item | **Nav item** |
| 7275:14699 | Doc/Nav item | Sidebar destination. Active is the only filled state. |
| 7275:14724 | Doc/Store switcher | **Store switcher** |
| 7275:14725 | Doc/Store switcher | Sits at the top of the sidebar. Opens the store list. |
| 7275:14730 | Doc/Sidebar | **Sidebar** |
| 7275:14731 | Doc/Sidebar | Expanded at desktop, collapsed to icons at tablet. |
| 7275:14762 | Doc/Search & command | **Search & command** |
| 7275:14763 | Doc/Search & command | Search lives in the top bar; ⌘K opens the command menu. |
| 7275:14779 | Doc/Tabs | **Tabs** |
| 7275:14780 | Doc/Tabs | Underline tabs switch views; the segmented control switches ranges. |
| 7275:14810 | Doc/Breadcrumb & pagination | **Breadcrumb & pagination** |
| 7275:14811 | Doc/Breadcrumb & pagination | Where you are, and how to move through long lists. |
| 7275:14818 | Doc/Top bar | **Top bar** |
| 7275:14819 | Doc/Top bar | Page title or breadcrumb left; search centre; alerts and account right. |

- `description` and `documentationLinks` are **empty** on all five component sets and all variants, and on all five standalone components.
- Icon component descriptions (the only descriptions found):
  - `738:323` Icon/shopping-bag: *"Lucide "shopping-bag" · 20px, 1.6 stroke · recolour via icon/\* tokens."*
  - `772:4302` Social/Instagram: *"Instagram glyph (Simple Icons). Only for "Connect / Follow on Instagram" links — never as Grove decoration."*
    - **Note:** the Sidebar uses it as a decorative nav icon for "Instagram", which **contradicts its own usage rule**.
- Demo content strings (inside instances): Moss & Kiln, mossandkiln.com, "Search orders, products, customers", ⌘K, esc, ⌘N, ⌘⇧D, ↑↓ Navigate, ↵ Open, All orders / Unfulfilled / Unpaid / Open / Archived, Today / 7D / 30D / 90D / 12M, Products › Mugs & cups › Stoneware mug, "Showing 1–20 of 248", 1 2 3 … 13, Overview.
- **Doc vs design contradictions:**
  - "Active is the only filled state", but Hover is filled with `bg/hover`. (That fill is invisible on the sidebar canvas anyway, §9.4.)
  - "search centre": in Top Bar the title fills the width and pushes search to the right.
  - "or breadcrumb left": Top Bar has no breadcrumb option.

---

## 4. Visual language (from screenshots)

- **Density:** a calm, airy admin UI. Rows are 38–40 px. 14 px Geist Label/M everywhere, with 16 px body only in the Command Menu input. Generous whitespace, and white doc cards on a warm off-white canvas.
- **Radius:** soft and friendly.
  - 12 (nav items)
  - 16 (search field, store switcher)
  - 20 (command menu)
  - 8 (segments, pagination pages, store mark)
  - 999 pills (count badge, notifications button)
  - Off-scale 6 (kbd) and 10 (segment track, command rows)
- **Colour use:** almost monochrome warm neutrals. The brand deep green (green/700 #1a573a) is reserved for:
  - the active nav item: pale green-50 fill, green text and icon, and a solid green count pill
  - the active tab underline
  - the store mark
  - the focus ring

  Pagination's current page uses **inverse black** (bg/inverse), not brand. That is a third "selected" language next to brand-subtle (nav) and white+shadow (segment).
- **Shadow:** nearly flat. Only the Segment thumb (Elevation/1 Card) and the Command Menu (Elevation/4 Modal) cast shadows. There is no glass on this page.
- **Borders:** 1 px hairlines using `border/subtle` (very low contrast) for the sidebar edge, top bar bottom, tab bar baseline, and search/store cards.
- **Iconography:** Lucide outline at a 0.08×size stroke (1.6 at 20, 1.44 at 18, 1.28 at 16). Neutral icons use `icon/secondary`; active ones use `icon/brand`.
- **Motion cues (prototype):** hover cross-fades over 160 ms, and click/focus transitions take 220 ms. Both use cubic-bezier(0.2,0,0,1) (= `easing/standard`). There is no motion on Segment.

---

## 5. Raw `componentPropertyDefinitions` (as read from the page-copy COMPONENT_SETs; live sets have identical keys/defaults)

```json
{
  "Nav Item (7275:14700 / live 755:658)": {"Label#755:0":{"type":"TEXT","defaultValue":"Orders"},"Show count#755:7":{"type":"BOOLEAN","defaultValue":true},"Count#755:14":{"type":"TEXT","defaultValue":"12"},"Icon#755:21":{"type":"INSTANCE_SWAP","defaultValue":"738:323","preferredValues":[]},"State":{"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover","Active"]},"Collapsed":{"type":"VARIANT","defaultValue":"False","variantOptions":["False","True"]}},
  "Sidebar (7275:14732 / live 755:869)": {"Expanded":{"type":"VARIANT","defaultValue":"True","variantOptions":["True","False"]}},
  "Search Field (7275:14764 / live 755:888)": {"State":{"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Focus"]}},
  "Tab (7275:14781 / live 755:961)": {"Label#755:29":{"type":"TEXT","defaultValue":"All orders"},"State":{"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Hover","Active"]}},
  "Segment (7275:14797 / live 755:982)": {"Label#755:33":{"type":"TEXT","defaultValue":"30D"},"State":{"type":"VARIANT","defaultValue":"Default","variantOptions":["Default","Active"]}},
  "Store Switcher (COMPONENT 755:663)": {"Store#755:28":{"type":"TEXT","defaultValue":"Moss & Kiln"}},
  "Command Menu (COMPONENT 755:889)": {},
  "Top Bar (COMPONENT 755:1031)": {"Title#755:39":{"type":"TEXT","defaultValue":"Overview"}},
  "Breadcrumb (COMPONENT 755:998)": {"Level 1#755:36":{"type":"TEXT","defaultValue":"Products"},"Level 2#755:37":{"type":"TEXT","defaultValue":"Mugs & cups"},"Current#755:38":{"type":"TEXT","defaultValue":"Stoneware mug"}},
  "Pagination (COMPONENT 755:1007)": {}
}
```
`Icon#755:21` default `738:323` = Icon/shopping-bag. `preferredValues` is empty, so there is no curated icon list for the swap.

---

## 6. Component deep-dives

Legend: `AL:H p9/12/9/12 g12` means horizontal auto-layout, padding T/R/B/L, gap. `sz:FH` means fill width, hug height. `{token}` is a bound variable. **UNBOUND** means a raw number with no variable.

### 6.1 Nav Item — SET 7275:14700 (live 755:658)

**Variant matrix (3 × 2, complete):**

| | Collapsed=False | Collapsed=True |
|---|---|---|
| State=Default | 7275:14701 216×40 (live 755:619) | 7275:14716 44×38 (755:643) |
| State=Hover | 7275:14706 216×40 (755:627) | 7275:14718 44×38 (755:648) |
| State=Active | 7275:14711 216×40 (755:635) | 7275:14720 44×38 (755:653) |

Missing states: **Focus, Pressed, Disabled**. There is no "has children / expandable" variant and no section header part.

**Anatomy (default 7275:14701):**
```
Nav Item  COMPONENT 216×40  AL:H p9/12/9/12 g12 MIN/CENTER  sz:FH  r12 {radius/md ×4}  fill: none
├─ Icon   INSTANCE 20×20  ← INSTANCE_SWAP Icon#755:21 (Icon/shopping-bag 738:323)  stroke {icon/secondary} 1.6
├─ Label  TEXT  FILL×HUG  textAutoResize=HEIGHT  "Orders" ← TEXT Label#755:0  {text/secondary} Grove/Label/M
└─ Count  FRAME 29×22  AL:H p1/7/1/7 g0  HUG  r999 UNBOUND  fill {bg/muted}  clip  visible ← BOOLEAN Show count#755:7
   └─ "12" TEXT ← TEXT Count#755:14  {text/secondary} Grove/Label/M Strong
```

**Per-state deltas:**

| Part | Default | Hover | Active |
|---|---|---|---|
| root fill | none | `bg/hover` | `bg/brand-subtle` |
| icon stroke | `icon/secondary` | `icon/secondary` | `icon/brand` |
| label | `text/secondary` Label/M | `text/secondary` Label/M (no change) | `text/brand` **Label/M Strong** |
| count pill | `bg/muted` + `text/secondary` | same | `bg/brand` + `text/on-brand` |

Collapsed variants have the Icon child only. Label and Count are **removed** (not hidden), so a collapsed item cannot show a count. Alignment is CENTER/CENTER with the same padding, giving 44×38.

**Reactions:** Default → Hover on hover (both Collapsed values), SMART_ANIMATE 160 ms, bezier(0.2,0,0,1).

**Hard-coded / design debt:**
- Padding 9/12, gap 12 and pill padding 1/7 are UNBOUND (9 and 7 are off the space scale).
- Pill radius 999 is UNBOUND (should be `radius/full`).
- **Height is content-driven.** It is 40 with the count pill and 38 without (sidebar instances: Home 38, Orders 40), so rows jitter. Use a fixed `min-height: var(--size-control-md)`.
- Collapsed is 44×38, not square and below touch-min.
- Expanded width in the sidebar is 215 vs 216 in the set.

**Proposed React API (`@nizivo/ui`, composite):**
```tsx
type NavItemProps = {
  href?: string;                    // renders the configured Link (router adapter) when present, else <button>
  current?: boolean | 'page' | 'location'; // Figma State=Active → aria-current; auto-derived from router adapter if omitted
  icon?: IconSlot;                  // Figma Icon (INSTANCE_SWAP) → ReactNode | IconComponent
  children: React.ReactNode;        // Figma Label (TEXT)
  badge?: React.ReactNode;          // Figma Count+Show count → any node; shorthand `count?: number | string`
  count?: number | string;          // renders <Badge tone={current ? 'brand' : 'neutral'}>; hidden when undefined (replaces Show count bool)
  disabled?: boolean;               // not in Figma — add
  asChild?: boolean;                // escape hatch (Radix Slot) for custom Link/anchor
  tooltip?: React.ReactNode | false;// shown automatically when parent Sidebar is collapsed; defaults to children
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'children'>;
// Collapsed is NOT a prop — read from SidebarContext (data-collapsed) so items don't need re-rendering by consumers.
```
- **Figma → code mapping:**
  - `Label` → `children`
  - `Icon` → `icon`
  - `Show count` + `Count` → `count` (undefined means hidden) or a generic `badge` slot
  - `State=Hover` → CSS `:hover` / `[data-hovered]`
  - `State=Active` → `current`
  - `Collapsed` → context-driven `[data-collapsed]` on the Sidebar root
- **Behavior and a11y:**
  - Render `<li><a aria-current="page">` inside `<nav><ul>`. The native link is enough; no headless primitive is needed except **Tooltip** in collapsed mode (side="right", `aria-describedby` is not needed because the label stays in the DOM, visually hidden, as the accessible name).
  - Never use `aria-label` built from translated strings when visible text can be kept sr-only.
  - In collapsed mode, render the count as a dot plus sr-only text ("12 new").
  - Focus-visible ring: `border/focus` + `Grove/Focus/Ring`.
  - Keyboard: Tab between items (default link behavior). Optional roving focus is not required for nav landmarks.
- **RSC: split.**
  - A pure server-renderable `<a>` when `current` is passed explicitly.
  - Client only for (a) auto-current via `usePathname`-style adapter hook, and (b) the collapsed-mode tooltip.
  - Ship a `NavItem` server shell plus a `NavItemTooltip` client island that mounts only when the sidebar is collapsed.

### 6.2 Sidebar — SET 7275:14732 (live 755:869)

| Variant | ID | Size |
|---|---|---|
| Expanded=True (default) | 7275:14733 | 248×860 |
| Expanded=False | 7275:14746 | 76×860 |

**Anatomy, Expanded=True:**
```
Sidebar  COMPONENT 248×860  AL:V p16/16/16/16 g4 (UNBOUND)  fill {bg/canvas}  stroke {border/subtle} right 1px inside
├─ Store Switcher  INSTANCE (755:663) 216×59  props{Store=Moss & Kiln}
├─ Gap             FRAME 10×16 (spacer hack)
├─ Nav Item ×8     INSTANCE (755:658)  Home(house) · Orders(shopping-bag, Active, count 12) · Products(package) · Customers(users)
│                  · Analytics(chart-column) · Marketing(megaphone) · Discounts(percent) · Instagram(Social/Instagram)
├─ Spacer          FRAME grow=1 (pushes footer down)
└─ Nav Item        Settings(settings)
```

**Expanded=False:**
- The `Store mark` is a **detached FRAME** 32×32, r8 UNBOUND, `{bg/brand}`, with "M" in Label/M Strong `{text/on-brand}`. It is not a Store Switcher variant.
- Then Gap, then **8 Nav Item instances, all `Label=Orders`** (only the icons are swapped), then Spacer, then Settings (also `Label=Orders`).

**Reactions:** each embedded Nav Item instance carries the Default→Hover hover reaction. There is no expand/collapse interaction.

**Issues:**
- Widths 248/76 are not bound to `layout/sidebar` [264,72,0].
- p16/g4 are UNBOUND (they equal `space/4` and `space/1`).
- Spacer frames are layout hacks. In code use `gap` and `margin-block-start:auto` on the footer.
- No toggle button, no section labels or groups, no nested items, no mobile/off-canvas variant (token says 0 at mobile), and no scroll-overflow treatment for long nav.
- Doc frame: "Expanded at desktop, collapsed to icons at tablet."
- In light mode the hover fill `bg/hover` equals the sidebar `bg/canvas` (contrast 1.00).

**Proposed API (`@nizivo/ui`, pattern, compound):**
```tsx
<SidebarProvider
  collapsed={c} defaultCollapsed={false} onCollapsedChange={setC}   // controlled + uncontrolled
  collapsible="icon" | "offcanvas" | "none"                         // rail vs drawer vs fixed
  responsive={{ tablet: 'icon', mobile: 'offcanvas' }}               // driven by layout/sidebar modes [264,72,0]
  persist={cookieStorage('nz-sidebar')}                             // pluggable storage adapter; cookie → SSR knows width (no flash)
>
  <Sidebar aria-label="Primary">            {/* <nav> landmark; data-collapsed / data-state="expanded|collapsed|open|closed" */}
    <Sidebar.Header><StoreSwitcher … /></Sidebar.Header>
    <Sidebar.Content>                       {/* scrollable, <ul> */}
      <Sidebar.Group label="Store">         {/* optional; not in Figma */}
        <NavItem href="/orders" icon={ShoppingBag} count={12}>Orders</NavItem>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer><NavItem href="/settings" icon={Settings}>Settings</NavItem></Sidebar.Footer>
    <Sidebar.Trigger />                     {/* collapse toggle — missing in Figma */}
  </Sidebar>
  <SidebarInset>{/* TopBar + page */}</SidebarInset>
</SidebarProvider>
```
- **Behavior:**
  - Rail mode keeps the labels in the DOM as sr-only and shows tooltips.
  - Off-canvas mode uses a **Dialog/Drawer** primitive (modal, focus trap, Esc, scrim; there is no scrim token yet).
  - `Sidebar.Trigger` is a `<button aria-expanded aria-controls>`.
  - Optional ⌘B / Ctrl+B hotkey via the shared hotkey registry.
  - Width transitions use `duration/base` + `easing/standard`. Respect Reduced mode.
- **RSC: split.** Sidebar, Header, Content, Group and Footer are server shells. `SidebarProvider` (state, cookie, media query), `Sidebar.Trigger` and the off-canvas Drawer are client.

### 6.3 Search Field — SET 7275:14764 (live 755:888)

| Variant | ID | Size |
|---|---|---|
| State=Default (default) | 7275:14765 | 360×42 |
| State=Focus | 7275:14770 | 360×43 |

**Anatomy:**
```
Search Field  COMPONENT 360×42  AL:H p8/8/8/12 g10 (UNBOUND; 10 off-scale)  sz:FH  r16 {radius/lg}
              Default: fill {bg/subtle} stroke {border/subtle} 1 inside
              Focus:   fill {bg/surface} stroke {border/focus} 1.5 inside (UNBOUND; = border-width/strong) + effect Grove/Focus/Ring
├─ Icon   INSTANCE 18×18 Icon/search (738:314) stroke {icon/secondary} 1.44   ← 18 px is off the icon-size scale (16/20/24)
├─ Text   TEXT grow  Default "Search orders, products, customers" {text/tertiary} Body/M ; Focus "stonew" {text/primary} Body/M
└─ Kbd    FRAME 34×24 AL:H p1/6/1/6 r6 (UNBOUND, off-scale)  fill {bg/subtle} stroke {border/default}
   └─ "⌘K" TEXT {text/secondary} Grove/Mono/M
```
- **Reaction:** Default → Focus **on click**, SMART_ANIMATE 220 ms (`duration/base`), `easing/standard`.
- **Props:** only `State`. Placeholder, value and shortcut are not exposed as properties.

**Issues:**
- Height 42 is not on the control scale (32/40/48).
- Missing states: Hover, Filled-unfocused, Disabled, Loading/pending, Clear button, Error.
- The "⌘K" hint is Mac-only text (no Ctrl+K variant).
- The field boundary against the top-bar canvas is 1.07:1 (border) and 1.04:1 (fill). SC 1.4.11 may be satisfied by the icon and placeholder, but the field is visually weak.
- The placeholder fails 4.5:1 (4.16).

**⌘K semantics (open question).** The doc says *"Search lives in the top bar; ⌘K opens the command menu."* But the prototype shows the field itself receiving typed text ("stonew"), not opening the Command Menu.
- **Recommendation:** ship `SearchField` as a real `<input type="search">` (for in-page filtering), and ship a `CommandTrigger` presentation of the same visual for the top bar. `CommandTrigger` is a button styled as a field that opens `CommandMenu`, whose input owns the combobox semantics.
- No inline results dropdown is designed for the top-bar field, so making it a combobox would mean inventing UI.

**Proposed API (`@nizivo/ui`, composite):**
```tsx
<SearchField
  value? defaultValue? onValueChange?      // controlled/uncontrolled
  placeholder="Search orders, products, customers"
  shortcut="mod+k"                         // renders <Kbd> (⌘K on Apple, Ctrl K elsewhere) + aria-keyshortcuts; registers hotkey to focus
  onSubmit? onClear? loading? disabled? invalid?
  size="md"                                // add sm/lg mapping to size/control-*
  startSlot? endSlot?                       // icon / kbd overrides
/>
<CommandTrigger shortcut="mod+k" placeholder="Search…" onOpen={…} />  // button role, aria-haspopup="dialog"
```
- **a11y:**
  - Wrap in `<search>` (or `role="search"`) with a visually-hidden `<label>`.
  - Esc clears the field.
  - Placeholder is not a label.
  - Respect IME composition in the hotkey handler.
  - Ignore the hotkey while focus is in editable elements, except for `mod+k` itself.
- **RSC: client** (input state and hotkey). The `Kbd` inside is server.

### 6.4 Tab — SET 7275:14781 (live 755:961) → `Tabs` / `TabNav`

| Variant | ID | Size |
|---|---|---|
| Default | 7275:14782 | 67×40 |
| Hover | 7275:14785 | 67×40 |
| Active | 7275:14788 | 69×40 |

**Anatomy:**
```
Tab  COMPONENT 67×40  AL:V p8/2/0/2 g10 (UNBOUND)  hug  no fill
├─ Label      TEXT ← Label#755:29  Default {text/secondary} Label/M | Hover {text/primary} Label/M | Active {text/primary} Label/M Strong
└─ Indicator  RECTANGLE fill-width × 2 (UNBOUND)  Default no fill | Hover {border/strong} | Active {bg/brand}
```
- **Container:** only "Example · Tab bar" 7275:14791 (FRAME): AL:H gap 24 (UNBOUND), bottom hairline `{border/subtle}` 1 px inside, clip. It is not a component.
- **Reactions:** Default → Hover on hover (160 ms); Hover → Active on click (220 ms), both `easing/standard`. This is a per-tab colour/opacity cross-fade. **No sliding indicator across tabs is specified.** A sliding underline is an optional code enhancement (Reduced mode: no slide).

**Issues:**
- Active switches to SemiBold, so the tab width shifts 67→69 (layout shift on selection). Reserve the bold width (the hidden bold pseudo-text trick) or keep the weight constant.
- The indicator uses `bg/brand`, a background token used as a stroke. Consider a `border/brand-strong` or `indicator/*` component token.
- Missing: Focus state, Disabled, icon/count slots, overflow scrolling for many tabs, and a vertical orientation.
- Height 40 is below the 44 touch target.
- Hover indicator contrast against the surface is 1.57 (fine as a hover hint only).

**Semantics:** doc 7275:14780 says tabs "switch views". Ship two APIs that share the `Tab` visual:
```tsx
// In-page views (panels in the same route) — WAI-ARIA Tabs
<Tabs value? defaultValue="all" onValueChange? activationMode="automatic" | "manual" orientation="horizontal">
  <Tabs.List aria-label="Order status" variant="underline">   {/* the missing container */}
    <Tabs.Tab value="all" count={…} icon={…}>All orders</Tabs.Tab>
    <Tabs.Tab value="unfulfilled">Unfulfilled</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="all">…</Tabs.Panel>
</Tabs>
// Route/URL-backed views (Next.js) — navigation, NOT tablist
<TabNav aria-label="Order status">
  <TabNav.Link href="/orders" current>All orders</TabNav.Link>   {/* aria-current="page", router adapter / asChild */}
</TabNav>
```
- **Keyboard (Tabs):** Left/Right move focus (roving tabindex), Home/End, Enter/Space activates in manual mode. Panels get `role="tabpanel"`, `aria-labelledby` and `tabIndex=0`.
- **Headless primitive:** Tabs (from the chosen headless lib).
- **RSC:** `Tabs` is **client**. `TabNav` can be **server** (links); add a client island only for the optional sliding indicator.

### 6.5 Segment — SET 7275:14797 (live 755:982) → `SegmentedControl`

| Variant | ID | Size |
|---|---|---|
| Default | 7275:14798 | 56×32 |
| Active | 7275:14800 | 57×32 |

**Anatomy:**
```
Segment  COMPONENT 56×32  AL:H p6/14/6/14 g0 (UNBOUND; 14 off-scale)  r8 (UNBOUND = radius/sm)
         Default: no fill | Active: fill {bg/surface} + effect Grove/Elevation/1 Card
└─ Label TEXT ← Label#755:33  Default {text/secondary} Label/M | Active {text/primary} Label/M Strong
```
- **Container:** only "Example · Segmented control" 7275:14802 (FRAME): AL:H p3 g2, r10 (UNBOUND, off-scale), fill `{bg/subtle}`, clip. It is not a component.
- **Reactions:** none on the set as first read. **Correction (week 3, [figma/12](12-w3-forms.md)):** the Default variant and every Default instance in track frames 7275:14802 and 7275:18903 switch to Active on click (220 ms, cubic 0.2,0,0,1).

**Issues:**
- Missing Hover, Focus and Disabled. No size axis (32 = `size/control-sm` only). No icon-only option.
- **Thumb vs track contrast is 1.04 in light and 1.00 in dark** (`bg/surface` = `bg/subtle` = neutral/900 in Dark). Elevation/1 is black at ~3–4%, which disappears on dark. Selection survives only through text weight and colour. Add a dark-mode treatment (border `border/default` on the thumb, or a `bg/surface-raised` thumb).
- The track on a white card is 1.04 (barely visible).
- Weight change causes a width shift (56→57).
- Hit target is 32.

**Semantics:** doc 7275:14780 says it "switches ranges" (Today/7D/30D/90D/12M). That is a value picker with no panels, so use the **WAI-ARIA Radio Group**: `role="radiogroup"` + `role="radio"` + `aria-checked`, with roving tabindex. Arrow keys move **and select**. There is always exactly one value and deselecting is not allowed. A toggle-group with `aria-pressed` is the alternative if multi-select is ever needed (expose `type="single" | "multiple"` only if the design adds it).
```tsx
<SegmentedControl aria-label="Date range" value? defaultValue="30d" onValueChange? size="sm" | "md" disabled?>
  <SegmentedControl.Item value="today">Today</SegmentedControl.Item>
  <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
</SegmentedControl>
```
- Optional sliding thumb, using `duration/fast` + `easing/standard`, disabled in Reduced mode.
- Native fallback: visually-hidden `<input type="radio">` per item inside a `<fieldset>`. That works without JS, but a headless RadioGroup is preferred for consistent focus styling.
- **RSC: client.** Tier: composite.

### 6.6 Store Switcher — COMPONENT 755:663 (no variants)

```
Store Switcher  216×59  AL:H p8/10/8/8 g10 (UNBOUND; 10 off-scale)  sz:FH  r16 {radius/lg}  fill {bg/surface} stroke {border/subtle} 1
├─ Store mark  FRAME 32×32 r8 (UNBOUND)  fill {bg/brand}  └─ "M" {text/on-brand} Label/M Strong   (not a prop)
├─ Text        AL:V g0  ├─ "Moss & Kiln" ← TEXT Store#755:28 {text/primary} Label/M Strong
│                       └─ "mossandkiln.com" {text/tertiary} Body/M   (not a prop; 4.31:1 on surface — fails AA)
└─ Icon        Icon/chevrons-up-down 16 {icon/secondary} 1.28
```
- Doc: *"Sits at the top of the sidebar. Opens the store list."*

**Issues:**
- No open/expanded state and no list/menu design.
- No collapsed variant: the sidebar rail uses a detached "Store mark" frame instead.
- Mark letter and domain are hard-coded, and there is no logo-image option.
- No hover or focus state.

**Proposed API:** a generic core `WorkspaceSwitcher` (`@nizivo/ui`, pattern) plus a `StoreSwitcher` preset (`@nizivo/commerce`).
```tsx
<WorkspaceSwitcher
  value? defaultValue? onValueChange?               // selected workspace/store id
  items={[{ id, name, description /*domain*/, avatar /*ReactNode | {src} | {initials}*/ }]}
  renderItem? footer={<Button>Add store</Button>}    // slots
  collapsed?                                        // auto from SidebarContext → renders mark only + tooltip
/>
```
- **Behavior:** a **Menu Button** (`aria-haspopup="menu"`, Menu with `menuitemradio` for stores plus actions) or a Popover + Listbox if a search is added. Use a headless Menu/Popover.
- **RSC: client.**

### 6.7 Command Menu — COMPONENT 755:889 (no props)

```
Command Menu  560×344  AL:V  r20 {radius/xl}  fill {bg/surface}  stroke {border/subtle}  effect Grove/Elevation/4 Modal
├─ Input   AL:H p16/16/16/20 g12  bottom {border/subtle}
│   ├─ Icon/search 20 {icon/secondary}   ├─ "stone" {text/primary} Body/L   └─ Kbd "esc"
├─ Results AL:V p8 g2
│   └─ Result ×5  AL:H p10/12/10/12 g12 r10 (UNBOUND, off-scale)
│        icon 20 · label {text/primary} Label/M · meta {text/tertiary} Body/M ("Product" | "Order" | "Action") · optional Kbd (⌘N, ⌘⇧D)
│        highlighted row: fill {bg/hover} + icon {icon/brand}
└─ Footer  AL:H p12/20 g16 fill {bg/subtle}  hints: Kbd "↑↓" Navigate · Kbd "↵" Open
```
Icons used: search, package, receipt, plus, percent.

**Issues:**
- Fully hard-coded (no properties).
- No group headings: the type is shown as a trailing meta label instead.
- No empty/no-results, loading or error states, and no matched-substring highlighting.
- Highlighted row vs surface is **1.08:1**. The active-descendant indicator is too weak; add a left accent or use `bg/pressed`/`bg/muted`.
- Meta text fails AA (4.01 on bg/hover).
- No scrim token for the modal backdrop.
- 560 px is fixed, with no mobile (full-screen sheet) variant.

**Proposed API (`@nizivo/ui/command-menu` subpath, heavy):**
```tsx
<CommandMenu open? defaultOpen? onOpenChange? shortcut="mod+k" loop filter={fuzzy} shouldFilter
             sources={[productsSource, ordersSource, actionsSource]}>   {/* pluggable async providers */}
  <CommandMenu.Input placeholder="Search or jump to…" />
  <CommandMenu.List>                 {/* virtualizable */}
    <CommandMenu.Empty>No results</CommandMenu.Empty>
    <CommandMenu.Loading />
    <CommandMenu.Group heading="Products">
      <CommandMenu.Item value="mug" icon={Package} meta="Product" shortcut="mod+n" onSelect={…} href?>Stoneware mug</CommandMenu.Item>
    </CommandMenu.Group>
  </CommandMenu.List>
  <CommandMenu.Footer />            {/* auto-generated key hints */}
</CommandMenu>
type CommandSource = { id: string; label: string; search(q: string, signal: AbortSignal): Promise<CommandItem[]>; };
```
- **a11y:**
  - **Modal Dialog** (focus trap, Esc closes, focus returns to the trigger) wrapping a **Combobox with Listbox** popup (`aria-activedescendant`, `aria-expanded`, `aria-controls`).
  - Up/Down (and Ctrl+N/P) move, Enter selects, Home/End.
  - Announce result count in a polite live region ("5 results").
  - Shortcut `Kbd`s get `aria-hidden`, plus `aria-keyshortcuts` on the item.
- **Headless primitives:** Dialog + Combobox/Autocomplete (avoid adding cmdk if the headless lib covers it).
- **RSC: client.** Lazy-load (`next/dynamic`) on first ⌘K.

### 6.8 Top Bar — COMPONENT 755:1031

```
Top Bar  1192×71  AL:H p14/32/14/32 (UNBOUND; 14 off-scale) g24  sz:FH  fill {bg/canvas}  bottom {border/subtle} 1
├─ Title          TEXT FILL ← Title#755:39 "Overview" {text/primary} Grove/Heading/H3
├─ Search Field   INSTANCE (755:888 State=Default) 360
├─ Notifications  FRAME 40×40 r999 fill {bg/surface} stroke {border/default}
│                 ├─ Icon/bell 20 {icon/primary}   └─ Ellipse 8×8 ABSOLUTE {bg/critical} (unread dot)
└─ Avatar         ELLIPSE 40×40 IMAGE fill (not an Avatar component)
```
Doc: *"Page title or breadcrumb left; search centre; alerts and account right."*

**Issues:**
- No breadcrumb option despite the doc.
- Search is not centred.
- Notifications is a raw frame (should be IconButton + badge dot with an accessible "3 unread" label). The dot is colour-only.
- Avatar is an ELLIPSE with an image, not a component, and has no account-menu affordance.
- Height 71 is odd (14+42+14+1).
- No mobile layout (hamburger to open the off-canvas sidebar).

**Proposed API (`@nizivo/ui`, pattern, slot layout):**
```tsx
<TopBar sticky? elevated?>               {/* <header>; elevated → Elevation/1 on scroll (client island optional) */}
  <TopBar.Start><PageTitle as="h1" size="h3">Overview</PageTitle> | <Breadcrumb …/></TopBar.Start>
  <TopBar.Center><CommandTrigger shortcut="mod+k" /></TopBar.Center>
  <TopBar.End><NotificationButton count={3} /><AccountMenu /></TopBar.End>
  <TopBar.MobileTrigger />                {/* opens SidebarProvider off-canvas */}
</TopBar>
```
- Heading semantic level is decoupled from the visual style: the page title is an `<h1>` styled as Heading/H3.
- **RSC: server** shell, with client children (trigger, menus).

### 6.9 Breadcrumb — COMPONENT 755:998

```
Breadcrumb  305×20  AL:H g6 (UNBOUND)  hug
├─ "Products"      ← Level 1#755:36  {text/secondary} Label/M
├─ Icon/chevron-right 16 {icon/secondary} 1.28
├─ "Mugs & cups"   ← Level 2#755:37  {text/secondary} Label/M
├─ Icon/chevron-right 16
└─ "Stoneware mug" ← Current#755:38  {text/primary} Label/M Strong
```

**Issues:**
- Fixed at 3 levels via TEXT props. Real routes vary in depth.
- No hover or focus state for links.
- No overflow or collapse (an ellipsis menu for deep paths).
- No truncation rule for long names.
- No mobile treatment (a "‹ Back to Mugs & cups" pattern).

**API (`@nizivo/ui`, composite):**
```tsx
<Breadcrumb separator={<ChevronRight/>} maxItems={4} itemsBeforeCollapse={1} itemsAfterCollapse={2}>
  <Breadcrumb.Item href="/products">Products</Breadcrumb.Item>
  <Breadcrumb.Item href="/products/mugs">Mugs & cups</Breadcrumb.Item>
  <Breadcrumb.Item current>Stoneware mug</Breadcrumb.Item>
</Breadcrumb>
// or data-driven: <Breadcrumb items={[{label, href}]} />
```
- **a11y:** `<nav aria-label="Breadcrumb"><ol>` with separators `aria-hidden`. The last item gets `aria-current="page"` and is rendered as text, not a link. The collapsed segment is a Menu button.
- **RSC: server** (only the collapse menu is a client island). Uses the router adapter or `asChild` for links.

### 6.10 Pagination — COMPONENT 755:1007 (no props)

```
Pagination  640×36  AL:H SPACE_BETWEEN g16  sz:FH
├─ "Showing 1–20 of 248"  {text/secondary} Body/M
└─ Pages  AL:H g4
    ├─ Prev  36×36 r8 (UNBOUND) stroke {border/default}  Icon/chevron-left 18 {icon/secondary}
    ├─ "1"   36×36 r8 fill {bg/inverse} + {text/inverse} Label/M     ← current page (inverse black, not brand)
    ├─ "2" "3" "…" "13"  36×36 r8 no fill {text/secondary} Label/M
    └─ Next  36×36 r8 stroke {border/default}  Icon/chevron-right 18
```

**Issues:**
- Everything is hard-coded (no properties).
- Prev is shown enabled on page 1. There is no disabled state.
- Page size 36 is off the control scale (32/40) and below touch-min.
- Uses 18 px icons (off-scale).
- No hover or focus states.
- No page-size selector or compact/mobile variant ("Page 1 of 13").
- The current-page style (inverse) is inconsistent with the brand selection elsewhere.
- Prev/next border vs canvas is 1.18.

**API (`@nizivo/ui`, composite):**
```tsx
<Pagination
  page={1} defaultPage? onPageChange?          // client mode
  getHref={(p) => `?page=${p}`}               // link mode (server-renderable)
  totalPages={13} siblingCount={1} boundaryCount={1}
  summary={<Pagination.Summary from={1} to={20} total={248} />}  // i18n via formatter
  size="sm" | "md" variant="full" | "compact"
/>
```
- **a11y:** `<nav aria-label="Pagination">`. Pages are links/buttons with `aria-label="Page 2"`, and the current one gets `aria-current="page"`. Prev/next get `aria-label="Previous page"` and are `aria-disabled` at the bounds. The ellipsis is `aria-hidden` (or a jump menu).
- **RSC: split.** Server in link mode, client in callback mode.

### 6.11 Kbd — NOT a component (repeated detached frames)

Instances of the same hand-built frame:
- 7275:14768 and 7275:14773 (Search Field)
- 755:895 (esc), 755:927 (⌘N), 755:936 (⌘⇧D), 755:940 (↑↓), 755:944 (↵) (Command Menu)
- I755:1033;755:879 (Top Bar)

Spec:
- AL:H p1/6/1/6 (UNBOUND), r6 (UNBOUND, off-scale), height 24
- fill `{bg/subtle}`, stroke `{border/default}` 1 inside
- text Grove/Mono/M `{text/secondary}`

Note: the border vs fill contrast is 1.23 (decorative).

**API (`@nizivo/ui`, primitive):**
```tsx
<Kbd keys="mod+shift+d" />   // platform-aware: ⌘⇧D on Apple, Ctrl Shift D elsewhere; renders <kbd> elements; title/aria-label spells out
<Kbd>esc</Kbd>
```
**RSC: server** (platform detection via a client hook only when `mod` is used; the SSR default is chosen by user-agent hint or rendered as `⌘/Ctrl`).

---

## 7. Cross-component decisions (requested analysis)

### 7.1 Tabs vs Segmented Control
Decided by the designer's text 7275:14780: *views → Tabs; ranges → Segmented*.
- `Tabs` uses WAI-ARIA Tabs (`tablist` / `tab` / `tabpanel`, `aria-selected`). Use `TabNav` (links, `aria-current`) when each view is a URL. The Orders status filters (All / Unfulfilled / Unpaid / Open / Archived) are likely URL query state in a real app, so default to `TabNav` for them.
- `SegmentedControl` uses WAI-ARIA Radio Group (`aria-checked`, arrows select). It never controls panels.
- Visual separation also holds: underline vs pill-in-track. Do not let consumers use one for the other. Document it in the component docs and lint via a story-level a11y test.

### 7.2 Link vs button polymorphism (Next.js)
- **Links (navigate):** NavItem (7275:14699 "Sidebar destination"), Breadcrumb items, Pagination pages in link mode, TabNav links, and CommandMenu items with `href`.
- **Buttons (act):** Segment, Tabs (in-page), StoreSwitcher, Sidebar.Trigger, Notifications, CommandTrigger, and Pagination in callback mode.
- Figma shows no visual difference between a nav item that navigates and one that acts (e.g., Settings could open a panel).

**One mechanism, applied uniformly:**
1. `NizivoProvider` gets a `router={{ Link: NextLink, useIsCurrent: (href) => boolean, navigate }}` adapter. Any component with `href` renders the configured Link and auto-computes `current`. This is plug-in/plug-out: TanStack Router, Remix and plain `<a>` work by swapping the adapter.
2. `asChild` (Slot) as the escape hatch for one-off custom anchors. Pick **either** `asChild` or Base UI-style `render`, never both. Recommend `asChild` (largest ecosystem familiarity, works with `next/link`).
3. Without `href`, the component renders `<button type="button">`.

### 7.3 Sidebar collapse behavior
- **States:** `expanded` (Desktop, token 264), `icon` rail (Tablet, token 72), `offcanvas` drawer (Mobile, token 0). The Figma widths 248/76 must be reconciled with the tokens; ask design which is right.
- Driven by `SidebarProvider` (controlled/uncontrolled), auto-switched by breakpoint (note: no breakpoint min-width tokens exist; the Responsive collection only has frame widths), and manually toggled by `Sidebar.Trigger` (missing in design) or ⌘B.
- Persist via a pluggable storage adapter (cookie by default so the server renders the right width with no layout flash).
- **Rail:** labels become sr-only, a tooltip appears on hover/focus, the count becomes a dot plus sr-only text, and the store switcher shows only its mark.
- **Off-canvas:** modal drawer with a scrim (a scrim token is needed), focus trap and Esc.
- **Animation:** width uses `duration/base` + `easing/standard`. Reduced mode gives 120 ms linear (or an instant snap).

### 7.4 Search with shortcut hint
- The ⌘K shown is Mac-only. Implement `mod+k` (⌘ on Apple, Ctrl elsewhere) with a platform-aware `Kbd`, `aria-keyshortcuts="Meta+K Control+K"`, and a single global hotkey registry (`useHotkey`), so CommandMenu, Sidebar and any page can register shortcuts and the Command Menu footer and items can list them.
- The top-bar field should be a `CommandTrigger` (button styled as a field) that opens `CommandMenu`, unless design adds an inline results dropdown (open question; see §6.3).

---

## 8. Tier, package and RSC summary

| Component | Code name | Tier | Package | RSC |
|---|---|---|---|---|
| Nav Item | `NavItem` | composite | @nizivo/ui | split |
| Sidebar | `Sidebar`, `SidebarProvider`, `SidebarInset` | pattern | @nizivo/ui | split |
| Search Field | `SearchField`, `CommandTrigger` | composite | @nizivo/ui | client |
| Tab | `Tabs` (+ `TabNav`) | composite | @nizivo/ui | client (TabNav server) |
| Segment | `SegmentedControl` | composite | @nizivo/ui | client |
| Store Switcher | `WorkspaceSwitcher` (core) / `StoreSwitcher` (preset) | pattern | @nizivo/ui + @nizivo/commerce | client |
| Command Menu | `CommandMenu` | heavy | @nizivo/ui (subpath `@nizivo/ui/command-menu`, lazy) | client |
| Top Bar | `TopBar` | pattern | @nizivo/ui | server shell + client slots |
| Breadcrumb | `Breadcrumb` | composite | @nizivo/ui | server |
| Pagination | `Pagination` | composite | @nizivo/ui | split |
| Kbd | `Kbd` | primitive | @nizivo/ui | server |
| Social/Instagram glyph | `InstagramIcon` | foundation | @nizivo/social (brand icons) | server |

**Headless behavior primitives needed** (one headless library behind an internal adapter, `@nizivo/ui/primitives`, so it can be swapped later):
- Tabs
- RadioGroup (or ToggleGroup)
- Menu / MenuButton (store switcher, account menu, breadcrumb collapse)
- Popover
- Dialog / Drawer (command menu, off-canvas sidebar)
- Combobox / Listbox (command menu)
- Tooltip (rail)

Native HTML suffices for NavItem (`<a>`), Breadcrumb (`<nav><ol>`), Pagination (links/buttons) and SearchField (`<input type="search">`).

---

## 9. Token audit

### 9.1 Bound (good)
- **All fills, strokes and text colours on the page are bound to Grove Color variables. There is no hard-coded hex.** The Avatar image fill is the only non-solid fill. **No non-Grove (Clario/Pipkin/…) variables or styles are referenced.**
- All text uses Grove text styles: Label/M, Label/M Strong, Body/M, Body/L, Mono/M, Heading/H3.
- Effects use styles: Focus/Ring, Elevation/1 Card, Elevation/4 Modal.
- Radius bound: Nav Item `radius/md`; Search Field, Store Switcher and the Sidebar's Store Switcher `radius/lg`; Command Menu `radius/xl`.

### 9.2 Hard-coded numeric values (design debt — code must map to tokens or add component tokens)

| Node | Property | Value | Nearest token / note |
|---|---|---|---|
| Nav Item root | padding / gap | 9/12/9/12, 12 | `space/2`(8)/`space/3`(12); **9 off-scale** |
| Nav Item Count pill | padding / radius | 1/7, 999 | off-scale; `radius/full` |
| Sidebar root | padding / gap / width | 16, 4, **248 / 76** | `space/4`, `space/1`, `layout/sidebar` **264/72** (mismatch) |
| Sidebar "Store mark" | radius | 8 | `radius/sm` |
| Search Field | padding / gap / height / focus stroke / icon | 8/8/8/12, **10**, **42**, 1.5, **18** | `space/2`,`space/3`; 10 off-scale; control-md 40; `border-width/strong`; icon-sm 16 / icon-md 20 |
| Kbd | padding / radius | 1/6, **6** | off-scale (radius xs 4 / sm 8) |
| Tab | padding / gap / indicator h | 8/2/0/2, **10**, 2 | `space/2`,`space/0-5`; 10 off-scale; `border-width/focus`(2) coincidental |
| Tab bar (example) | gap | 24 | `space/6` |
| Segment | padding / radius | 6/**14**, 8 | `space/1-5`; 14 off-scale; `radius/sm` |
| Segment track (example) | padding / gap / radius | **3**, 2, **10** | off-scale; `space/0-5`; 10 off-scale |
| Store Switcher | padding / gap | 8/**10**/8/8, 10 | 10 off-scale |
| Command Menu | input p / row p / row r / footer p | 16/16/16/20, **10**/12, **10**, 12/20 g16 | 10 off-scale |
| Top Bar | padding / gap | **14**/32, 24 | 14 off-scale; `grid/margin` 32 (Desktop) |
| Breadcrumb | gap | 6 | `space/1-5` |
| Pagination | page size / radius / gaps | **36**, 8, 4/16 | off control scale; `radius/sm` |

**Recommendation:** introduce a component-token layer (e.g. `--nz-nav-item-height: var(--nz-size-control-md)`, `--nz-nav-item-px: var(--nz-space-3)`, `--nz-tab-indicator-size: var(--nz-border-width-focus)`, `--nz-kbd-radius: var(--nz-radius-xs)`) that references semantic tokens. Snap the off-scale values (9→8 + fixed 40 height; 10→8 or 12; 14→12 or 16; 3→2 or 4; 6 radius→4 or 8; 36→32/40; 42→40), subject to design approval.

### 9.3 Token gaps surfaced by this page
- `overlay/scrim` (command menu, off-canvas sidebar)
- Breakpoint min-widths (needed for auto rail/off-canvas)
- `icon-xs`/18 size (used, but not tokenized)
- A component-level indicator token (tab underline uses `bg/brand`)
- A count-badge token pair (or reuse the Badge component from 02)
- `motion/duration/hover` 160 ms (used by every hover; not a token, nearest is `duration/fast` 140)
- Dark-mode-aware elevation (Elevation/1 is invisible on dark)

### 9.4 Contrast (WCAG 2.x, computed from token hexes)

| Pair | Light | Dark | Verdict |
|---|---|---|---|
| Nav default label text/secondary on bg/canvas | 6.03 | 7.40 | pass |
| **Nav hover bg/hover vs sidebar bg/canvas** | **1.00** | 1.39 | hover invisible in light (n50 = n50) |
| Nav active bg/brand-subtle vs bg/canvas | 1.06 | 1.11 | fill alone is weak; carried by text/icon colour and weight |
| Nav active label text/brand on bg/brand-subtle | 7.49 | 7.37 | pass |
| Nav active icon icon/brand on bg/brand-subtle | 5.60 | — | pass |
| Nav icon icon/secondary on bg/canvas (rail: icon is the only content → needs 3:1) | 4.01 | 7.40 | pass |
| Count text/secondary on bg/muted | 5.65 | 5.32 | pass |
| Active count text/on-brand on bg/brand | 8.51 | 5.17 | pass |
| **Search placeholder text/tertiary on bg/subtle** | **4.16** | **4.03** | fail AA 4.5 (14 px Regular) |
| Search border/subtle vs bg/canvas | 1.07 | 1.19 | weak boundary (1.4.11 caveat: icon+placeholder identify it) |
| Search fill bg/subtle vs bg/canvas | 1.04 | — | invisible |
| Search focus border/focus vs bg/surface | 4.66 | 7.58 | pass (≥3:1); the Focus/Ring halo alone is ≈1.3:1 (decorative) |
| Kbd text/secondary on bg/subtle | 6.26 | — | pass |
| Tab default text/secondary on bg/surface | 6.48 | — | pass |
| Tab hover indicator border/strong on surface | 1.57 | — | hover hint only |
| Tab active indicator bg/brand on surface | 8.51 | 5.32 | pass |
| Segment default text/secondary on bg/subtle | 6.26 | — | pass |
| **Segment thumb bg/surface vs track bg/subtle** | **1.04** | **1.00** | selection relies on weight/colour + a shadow that is invisible on dark |
| Store domain text/tertiary on bg/surface | **4.31** | — | fail AA |
| **Cmd row meta text/tertiary on bg/hover** | **4.01** | — | fail AA |
| Cmd highlighted row bg/hover vs bg/surface | 1.08 | — | weak active-descendant indicator |
| Pagination current text/inverse on bg/inverse | 17.36 | 17.36 | pass |
| Pagination prev/next border/default vs bg/canvas | 1.18 | — | weak |
| Notification dot bg/critical vs surface | 5.69 | — | pass (but colour-only; add an sr-only count) |

**Fix at token level:** darken `text/tertiary` light to about neutral/600-ish, or restrict `text/tertiary` to ≥18 px. Separate `bg/hover` from `bg/canvas` (e.g. hover = neutral/100 on canvas surfaces, or a `bg/hover-on-canvas` token). Give the dark segment thumb `bg/surface-raised` (n850) plus a `border/default` outline.

### 9.5 Hit targets vs `size/touch-min` (44)
| NavItem 40 / 38, rail 44×38 | Tab 40 (narrowest "Open" 40×40) | Segment 32 | Pagination 36 | Notifications 40 | Search 42 | Store Switcher 59 (pass) |

These pass WCAG 2.2 SC 2.5.8 (24 px) but fail 2.5.5 AAA and the system's own touch-min. Add `@media (pointer: coarse)` expansion to `size/touch-min` via a pseudo-element hit area, or a `size` prop.

---

## 10. Motion spec (from prototype reactions)

| Trigger | Nodes | Transition | Duration | Easing | Token mapping |
|---|---|---|---|---|---|
| Hover (Default→Hover) | Nav Item 7275:14701, 7275:14716 (+ all sidebar instances); Tab 7275:14782 (+ example tabs) | SMART_ANIMATE (cross-fade fill/colour) | **160 ms** | cubic-bezier(0.2,0,0,1) | easing/standard; **duration not tokenized** (fast=140, base=220) |
| Click (Hover→Active) | Tab 7275:14785 | SMART_ANIMATE | 220 ms | (0.2,0,0,1) | duration/base + easing/standard |
| Click (Default→Focus) | Search Field 7275:14765 | SMART_ANIMATE | 220 ms | (0.2,0,0,1) | duration/base + easing/standard |
| — | Segment, Store Switcher, Command Menu, Pagination, Breadcrumb, Sidebar | none | — | — | no motion specified |

Implement with CSS transitions on `background-color, color, border-color, box-shadow` using `var(--nz-duration-fast) var(--nz-easing-standard)`. In the Reduced mode collection, durations become 0 or 120 and easing becomes linear. Sliding tab underline and segmented thumb are optional enhancements, not specified.

---

## 11. Icons

- **Set:** local copies of **Lucide** (`remote=false`; orphaned main components 738:\*, no icons page). Description: "20px, 1.6 stroke · recolour via icon/\* tokens".
- **Used here:**
  - house, shopping-bag, package, users, chart-column, megaphone, percent, settings
  - search (738:314), chevrons-up-down, chevron-right, chevron-left, bell, receipt, plus
  - **Social/Instagram** (772:4302, Simple Icons, with a usage rule the sidebar violates)
- **Stroke rule:** stroke = 0.08 × size (1.6 at 20, 1.44 at 18, 1.28 at 16). In `lucide-react` (24 viewBox), use `strokeWidth={1.92}` with non-absolute stroke. That scales to exactly 1.6 at 20 and 1.28 at 16.
- **Sizes used:** 16, 18, 20. 18 is not in `size/icon-*`.
- **Colour:** always via `icon/*` tokens → `currentColor` in code.
- **Architecture:** components accept `icon?: ReactNode | ComponentType<IconProps>`, so any icon set plugs in. `@nizivo/icons` (or a peer dep on `lucide-react`) supplies the default through an `<Icon>` wrapper that applies size tokens and the stroke rule. Brand glyphs live in `@nizivo/social`.

---

## 12. Architecture recommendations (so things can be plugged in and out)

1. **Three layers:**
   - tokens (`--nz-*` CSS vars, prefix configurable)
   - headless behavior (an internal adapter over one headless lib, exposed as `@nizivo/ui/primitives`)
   - styled compound components (slots + `data-*` state attributes)

   Consumers can restyle via component tokens, recompose via compound parts, or drop down to primitives.
2. **State is expressed as data attributes, not variant props:** `data-current`, `data-selected`, `data-state`, `data-collapsed`, `data-disabled`, `data-orientation`. Figma's `State=Hover/Focus/Pressed` map to CSS pseudo-classes, never to props.
3. **Controlled and uncontrolled everywhere** via a shared `useControllableState` (sidebar collapsed, tabs value, segmented value, command open, pagination page, workspace value).
4. **Adapters via `NizivoProvider`:**
   - `router` (Link, isCurrent, navigate)
   - `icons` (default icon component)
   - `hotkeys` (registry + platform)
   - `storage` (sidebar persistence)
   - `i18n` (pagination summary, "Previous page", Kbd spelling)
5. **Slots over booleans:** `count` / `badge` slot instead of `Show count`; `start` / `center` / `end` in TopBar; `header` / `content` / `footer` in Sidebar; `sources` plugins in CommandMenu.
6. **Reuse:**
   - NavItem count uses the **Badge** from 02 (7275:11374).
   - Notifications uses **Icon Button** (7275:11357) + a dot badge.
   - Account uses an Avatar (not found as a component, so it needs design).
   - Off-canvas sidebar and Command Menu reuse **Modal/Dialog** from 07 (7275:15139).
7. **AppShell** (`SidebarProvider` + `Sidebar` + `SidebarInset` + `TopBar`) is a layout pattern consumers can swap any part of. Overview Dashboard (08) should consume it. 08 has at least 7 Nav Item instances outside any Sidebar instance.
8. **Testing hooks:** each part gets a stable `data-slot="nav-item|nav-item-icon|nav-item-count|tab-indicator|segment-thumb|kbd"` for theming and tests.

---

## 13. Design requests (gaps)

1. Resolve the duplicate component sets: put the live 755:\* sets, standalone components and icons on pages, and delete or relink the 7275 copies.
2. Add Focus, Pressed and Disabled states to Nav Item, Tab and Segment. Add Hover, Filled, Disabled, Clear and Loading to Search Field. Add hover/focus/disabled to Pagination and Breadcrumb links.
3. Add container components: TabList (underline) and SegmentedControl track.
4. Sidebar:
   - collapse toggle
   - mobile off-canvas variant and scrim
   - group labels
   - reconcile widths with `layout/sidebar` (264/72/0)
   - fix the rail labels (all "Orders")
   - a Store Switcher collapsed variant (replacing the detached Store mark)
   - a count treatment in the rail
5. Bind all padding, gap and stroke values to Space tokens and snap off-scale numbers (9, 10, 14, 3, 6, 36, 42, 18).
6. Fix the token issues:
   - `text/tertiary` AA failures
   - `bg/hover` = `bg/canvas` in light
   - dark Segment thumb = track
   - Command Menu highlighted-row contrast
7. Command Menu: group headings, empty, loading and error states, match highlighting, mobile sheet, scrim.
8. Store Switcher: open menu design, logo image option, domain as a property.
9. Top Bar: breadcrumb-left option, centred search, Avatar and IconButton components, mobile layout with hamburger.
10. Breadcrumb: arbitrary depth and overflow collapse. Pagination: disabled prev/next, compact/mobile variant, consistent selected style (inverse vs brand).
11. Platform-aware shortcut hint (Ctrl K on non-Apple), and decide whether the top-bar search is an input or a Command Menu trigger.
12. Stop using Social/Instagram as a decorative nav icon (per its own description), or update the rule.
13. Add a `duration/hover` (160) token or retime hovers to `duration/fast` (140).

---

## 14. Extraction notes / gaps

- 14 Figma calls in total: 11 `use_figma` + 3 `get_screenshot`. Two `use_figma` reads hit the 20 KB return cap, returned nothing, and were re-run as smaller reads. No data was lost and no rate-limit errors occurred.
- Instance counts come from `getInstancesAsync()` and are **direct-only**; nested instances are excluded (Top Bar 13 instances each containing a Search Field vs Search Field 7). Usage numbers are lower bounds.
- Command Menu was traversed to depth 4 (full). The Sidebar's embedded instances were summarized (props + icon swap) rather than recursed, since their anatomy equals Nav Item.
- The live Sidebar set **755:869 was not fingerprinted**. The live Nav Item, Search Field, Tab and Segment sets were compared to the page copies and are identical (defs, variant names, sizes, padding, radius, root fills/strokes).
- `getInstancesAsync` counts reflect the whole document at read time.
- The Figma Focus/Ring halo contrast is estimated by alpha-compositing #2e8258 @ 28% over white (≈1.3:1).
- The Avatar used in Top Bar is a raw ELLIPSE. No Avatar component was found on this page; other pages were not searched.
