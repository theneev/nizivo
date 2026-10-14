# Gap C: overlay layering, dark-mode elevation and accessibility token remediation

**Date:** 2026-10-14
**Role:** senior design-system engineer, filling critique gaps G15, G16 and G19 (and D8, D15, C17, S2, S3, S5, S10).
**Status:** research input for the plan. Nothing here re-opens the 16 settled decisions; every sketch uses them (render prop, `nz-*` classes, `data-*` state, `--nz-*` tokens, no required provider, RSC-safe barrels).

**Naming note.** This report does **not** change the package name or the import path; that is still an open plan decision. Code sketches below omit import specifiers (or write `// import from the core package`) on purpose.

**No Figma tools were called.** All token values come from `docs/figma/00-tokens-and-styles.md` and the page reports.

**Evidence labels:**
- **EMPIRICAL** means I read the installed library source in `scratchpad/bench/deps/node_modules` or ran a local script.
- **SPEC** means primary standard or vendor documentation.
- **UNVERIFIED** means a claim I could not confirm.

**Scripts** (stdlib Python, WCAG 2.2 relative-luminance formula, OKLCH and CIELAB helpers) are in `scratchpad/gaps/scripts/`:
- `colorlib.py`
- `a_baseline.py`
- `b_candidates.py`
- `c_elevation.py`
- `d_final.py`
- `e_options.py`
- `f_final.py`

Every number in sections 2 and 3 comes from them.

---

## 0. Answers at a glance

| # | Question | Recommendation | Confidence |
|---|---|---|---|
| 1 | Top layer vs portals + z-index | **v1 uses a hybrid.** Engine portals hold every overlay except Toast. All portaled overlays share **one** z band (`--nz-z-overlay`) and stack by open order (DOM order), which mirrors the top layer's last-in-first-out rule. Nested overlays portal **into their parent overlay's root**, never relying on z numbers. **Only the Toast region uses the top layer** (`popover="manual"`). Native `<dialog>`/`popover` for the other overlays is the planned swap behind the adapter, gated by 4 named blockers (§1.4). | high |
| 2 | The C17 z-scale conflict (01: popover above modal; 07: modal above popover) | **Both scales are retired.** Each assumes body-level sibling overlays with fixed precedence. The new token set is `--nz-z-raised 1`, `--nz-z-sticky 100`, `--nz-z-chrome 200`, `--nz-z-overlay 1000` and `--nz-z-toast 1100` (the last only when the Popover API is missing). | high |
| 3 | `popover` needs iOS 18.3? (S10) | **Only for light dismiss.** WebKit bug 267688: tapping outside did not close an auto popover on iOS 17.0–18.2. `popover="manual"`, which is what Toast uses, has no light dismiss, so it works on the whole Safari ≥ 17.5 floor proposed in r2. Feature-detect, and fall back to `position: fixed` with `--nz-z-toast`. | high |
| 4 | Toast reachable while a modal is open | **Yes with the React Aria engine.** EMPIRICAL: `react-aria` 3.53.1 skips `[data-react-aria-top-layer]` when it inerts the page, lets focus enter it, and ignores clicks on it for outside-dismiss. `useToastRegion` sets that attribute. Keyboard users reach toasts with **F8**, not Tab. **No with a native `showModal()`**: the spec inerts every top-layer element outside the dialog subtree, including toast popovers drawn above it (whatwg/html#9936, open as of Sep 2026). The native swap therefore needs the "toast outlet follows the topmost modal" rule (§1.8). This is source-verified but not tested at runtime; conformance test O-06 is the gate. | medium-high |
| 5 | Scroll lock | **Exactly one reference-counted lock**, the engine's own (`usePreventScroll` in RAC), released in a layout-effect cleanup. A second counter is never added. The lock uses `scrollbar-gutter: stable`, plus RAC's touch-event path on iOS. RAC injects a `<style>` on iOS and reads `<meta name="csp-nonce">`, which matters for strict CSP. | high |
| 6 | Focus return | Return to the trigger, through a fallback chain: explicit `returnFocus`, then the original trigger if it is still connected, then the parent overlay's trigger (for example, a Dialog opened from a Menu item returns to the Menu button), then `body` with a dev warning. | high |
| 7 | Activity / offscreen | **EMPIRICAL:** `react-dom` 19.3.0 hides portaled DOM under a hidden `<Activity>` (`hideOrUnhideNearestPortals`), and destroys effects, which releases RAC's inert and scroll lock. RAC's *open state* survives, though. So the adapter must control `open` and close transient overlays in a layout-effect cleanup. Mount the Toaster at the app root, outside the route Activity boundaries. Whether React 19.2.x hides portals is UNVERIFIED (test O-15 runs on 19.2 and 19.3). | high (19.3) / medium (19.2) |
| 8 | Dark-mode elevation | **Two tonal levels plus a ring plus a retuned shadow.** Base surfaces are canvas n950 and surface n900. **All floating surfaces use the existing `bg/surface-raised` (n850)**, which matches Apple's base/elevated model. A 1px white-alpha ring (`--nz-elevation-ring`, transparent in light) draws the edge, following Radix Themes. Shadows use black at about 6× the light alpha. Dark `bg/subtle` gets a new n925 step. Dark borders shift one step lighter. A dark scrim is required. Inner highlight is off by default. | medium (needs design sign-off) |
| 9 | Contrast remediation | **14 mode-value changes to existing tokens, 7 new semantic tokens (including `bg/scrim`) and 4 new primitive steps** (neutral/450, neutral/925, red/400, blue/400). Every pair is recomputed in §3.2 and passes. For text, the recommendation is **Option A, re-spacing the ladder with existing primitives** (light 900/700/600, dark 50/300/400). This keeps today's secondary-to-tertiary spacing. Option B (new steps) compresses that spacing to about 1.2:1. | high (numbers) / medium (choice) |
| 10 | Ownership | **Figma is the source of truth. Code may ship a time-boxed override file** (`src/code-owned/a11y/*.overrides.tokens.json`) applied as the last resolver source. Every entry carries the Figma variable, the Figma value at override time, the WCAG SC, an issue link and an `expires` date. CI fails on expiry, on a redundant override (Figma caught up), and on drift (Figma changed). No release ships a failing AA pair. | high |
| 11 | Target size | Controls at 32/40/48 already meet WCAG 2.5.8 (24 px). On the primary coarse pointer, an invisible `::after` expands hit areas to 44 px **on both axes**: `inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2))`. Visible sizes never change automatically. A `data-nz-density="touch"` opt-in raises them. Bare 16–20 px icons become `IconButton`s. | high |
| 12 | 12 px caption | **No 12 px style in v1.** Keep the designer's rule ("Nothing smaller than 14px") and lint `min-font-size: 14px` (fixes S5). Figma's own dense UI (axis labels, legends, captions) already uses Body/M 14. File the cases a 12 px style might serve as a design request, with the condition that any such style uses ≥ 4.5:1 colours only. | high |

**What this changes in earlier documents:**
- **C17 / D8 resolved.** The scales in 01 §10.1 and 07 §6.5 are superseded. r1 D9's "top layer first" becomes "top layer for Toast only in v1". 07's `LayerProvider` is rejected (settled #8: no required provider).
- **S10 resolved.** See row 3 above.
- **S2 corrected.** Both axes now expand, and the sign is right (§3.6).
- **r7 lint config corrected.** r7 §7.4 uses `border.default` as the 3:1 proxy pair. It must be `border.control`, because `border.default` becomes decorative and is exempt.
- **07's Drawer/Dialog sketches.** These used `asChild`. They are restated here with `render`.

---

## 1. Overlay and layering

### 1.1 Platform status (October 2026)

| Feature | Status | Relevance | Source |
|---|---|---|---|
| `<dialog>` + `showModal()` | Widely Baseline since 2024-09-14 (Chrome 37, Firefox 98, Safari 15.4) | Top layer, inert background, Esc, focus return | r3 §5 (web-features 3.42.0) |
| `popover` attribute | Newly Baseline 2025-01-27, but web-features lists iOS **18.3** | Toast region | r3 §5; critique S-c |
| …why iOS 18.3 | On iOS/iPadOS 17.0–18.2, tapping outside did not light-dismiss an auto popover. Fixed in 18.3, which held back Baseline. Manual popovers have no light dismiss, so they are unaffected. | Removes the S10 blocker for Toast | [web.dev popover Baseline](https://web.dev/blog/popover-baseline), [WebKit 267688](https://bugs.webkit.org/show_bug.cgi?id=267688), [BCD #22927](https://github.com/mdn/browser-compat-data/issues/22927) |
| `dialog[closedby]` (light dismiss) | Chrome 134 / Firefox 141 / Safari preview only | Blocks a native Dialog's outside-click dismiss | r3 §5 (BCD 8.1.5); not in the [Safari 27 notes](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) as read |
| `overlay` property (keep a node in the top layer while it animates out) | Chrome only | Native exit animations get cut short in Safari and Firefox | r3 §5 |
| `popover="hint"` | Safari preview only | Native tooltip | r3 §5 |
| `Element.moveBefore()` | Chrome 133, Firefox 144, **not in Safari** (26.5–27) | Chrome's guidance for reparenting a toast into a modal | [caniuse moveBefore](https://caniuse.com/mdn-api_element_movebefore) |
| CSS anchor positioning core | Chrome 125 / Firefox 147 / Safari 26 (umbrella not Baseline) | Optional enhancement over JS positioning | r3 §5 |
| `:modal` pseudo-class, `inert` | Both usable (`inert` Widely 2025-10-11) | Detecting consumer modals; inerting | r3 §5 |
| `::backdrop` inheriting custom properties from its dialog | Reported as interoperable since about 2024; **UNVERIFIED** here | Needed only if the native swap styles `::backdrop` with `--nz-bg-scrim` | — |

### 1.2 How the top layer and inertness interact (spec facts the model must respect)

1. **The top layer is last in, first out.** A modal opened after a manual popover paints over it. Re-promoting the popover with `hidePopover(); showPopover()` fixes the paint order, not inertness ([GoogleChrome guidance issue #1670](https://github.com/GoogleChrome/modern-web-guidance-src/issues/1670), opened 2026-10-04).
2. **`showModal()` blocks the document** (spec step "set subject's node document to be blocked by the modal dialog subject"). Everything outside the dialog's flat-tree subtree becomes inert, **including popovers that are visually above it**. A maintainer confirms this is current spec behaviour. The issue is open, latest activity 2026-09-15, with no spec change. Duplicates and relatives: #11195 (closed as a duplicate), #10811, #9998. Sources: [whatwg/html#9936](https://github.com/whatwg/html/issues/9936), [HTML showModal](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal).
3. **`showModal()` hides open auto (and hint) popovers** up to the dialog's "topmost popover ancestor". Manual popovers are not in that stack, so a manual toast stays open, but beneath the modal and inert. *(This is my spec reading of "hide all popovers until"; it is consistent with #1670.)*
4. **A popover that is a descendant of an open modal dialog is not inert** and stacks above the dialog when shown. This is the basis of the portal-into-parent rule.
5. **Inert content leaves the accessibility tree.** A body-level live region therefore goes silent while a native modal is open. RAC avoids this by exempting `[data-live-announcer]`. Base UI and Radix exempt `[aria-live]` (§1.3).
6. **`display: none` does not take an element out of the top layer, and does not unblock the document.** A natively modal `<dialog>` hidden by React `<Activity>` would keep the visible page inert. *(Reasoned from the spec; covered by test O-16 for the future native swap.)*

### 1.3 What the engines actually do (EMPIRICAL, installed dists)

| | React Aria (`react-aria` 3.53.1 / RAC 1.22.1) | Base UI 1.9.0 | Radix 1.8.1 (`@radix-ui/react-dialog` 1.3.1) |
|---|---|---|---|
| Uses the top layer? | No (r3 grep: 0 `showModal`/`showPopover`) | No | No |
| Portal target | `createPortal(…, document.body)`, or `UNSAFE_PortalProvider.getContainer()`. **Returns `null` during SSR** (`Overlay.mjs`) | `FloatingPortal` to body | `@radix-ui/react-portal` `createPortal` to body |
| Outside content when modal | **`inert`** (`ariaHideOutside(…, { shouldUseInert: true })` in `useModalOverlay` **and** in `usePopover` unless `isNonModal`). Reference-counted (`refCountMap`) and watches DOM additions with a MutationObserver. | `aria-hidden` only when modal (or an untrapped typeable combobox). The `data-base-ui-inert` *marker* goes on outside content for every open floating element, and is used for outside-press logic, not as `inert`. Reference-counted. No `inert`. | `aria-hidden` through `aria-hidden@1.2.6` `hideOthers`; no `inert` |
| Exempted from hiding | `[data-live-announcer]`, `[data-react-aria-top-layer]` | `[aria-live]` | `[aria-live]`, `script` |
| Toast-specific | `useToastRegion` sets `data-react-aria-top-layer`. `FocusScope` lets focus move there. `useInteractOutside` ignores presses there, so tapping a toast doesn't dismiss the modal. | Toast in an `[aria-live]` region stays visible to assistive tech. Focus reachability under a modal is UNVERIFIED. | Same as Base UI; UNVERIFIED |
| Scroll lock | `usePreventScroll`: module counter, **`useLayoutEffect`**, `overflow: hidden` + `scrollbar-gutter: stable` on `<html>`. On iOS WebKit: touch handlers plus an injected `<style>` (`overscroll-behavior: contain`) with a nonce from `<meta name="csp-nonce">`. | `useScrollLock`: `lockCount`, `scrollbar-gutter` | `react-remove-scroll` |
| Focus return | `FocusScope restoreFocus` | `FloatingFocusManager` (`returnFocus`) | `FocusScope` |
| Popover modality default | **Modal** (inert outside + scroll lock), unless `isNonModal` | Per component | Per component |

**Consequences for Nizivo:**
- **All three engines portal to body and use z-index.** Nobody ships top-layer overlays in Oct 2026 (confirms r3). The model below is therefore what any engine swap preserves.
- **Toast must be marked as an engine top-layer element by the adapter.** It gets `data-react-aria-top-layer` today. It also always carries the engine-neutral `data-nz-top-layer`, which is documented. Engine attributes are never documented (r3).
- **The live announcer uses `aria-live` attributes, not only `role="status"`.** Base UI and Radix exempt `[aria-live]` from hiding, and RAC exempts `[data-live-announcer]`, so the adapter sets both.

### 1.4 The layering model (decision)

**Rule L1: one overlay band, ordered by DOM.** Every portaled overlay root (popover, menu, select listbox, combobox list, tooltip, dialog, drawer, sheet, and their backdrops) sets `z-index: var(--nz-z-overlay)`. Engines append portals in open order, so a later-opened overlay paints above an earlier one, which is exactly the top layer's LIFO rule. A future native swap therefore keeps the same visual semantics. **Nizivo assigns no per-type z numbers.** Fixed per-type precedence is what produced C17's contradiction. A tooltip opened from inside a modal must sit above that modal; a fixed "tooltip > modal" rule happens to work, while "popover < modal" (07) breaks every Select inside a Dialog.

**Rule L2: nested overlays portal into the parent overlay's root.** Dialog, Drawer, Sheet and Popover popups provide an engine-internal portal container: the non-clipping positioner element, **never** the scrolling `Dialog.Body` or a popup with `overflow: hidden`. Children such as Select, Menu, Tooltip and Combobox render into it. This is a no-op for RAC today (its body portals already nest correctly). It is mandatory for the native swap (§1.2 points 2 and 4), and it was already required by r3 §8.7. Two traps to avoid:
- Never animate `transform` on the portal container itself. A transformed ancestor becomes the containing block for `position: fixed` children and mis-positions nested popovers. Animate the popup.
- The container must not set `overflow: hidden`, `contain: paint` or `clip-path`. The Figma Modal "clips content" (radius 28), so apply clipping to an inner wrapper.

**Rule L3: Toast is the only v1 top-layer citizen.** The `<section popover="manual">` region is shown while at least one toast exists, including toasts still animating out. The rules for it:
- It is re-promoted (`hidePopover(); showPopover()`) when a toast is added while focus is not inside the region. That puts it above anything opened since.
- It is exempt from engine inertness (§1.3).
- Without the Popover API (`!('showPopover' in HTMLElement.prototype)`) it falls back to `position: fixed; z-index: var(--nz-z-toast)`, which sits above the overlay band.
- Consequence: nothing can paint above a toast, not even a tooltip. That is acceptable, because toasts are bottom-centre and must not cover focus anyway (§1.8).

**Rule L4: in-flow page chrome sits below the band.** Sticky table headers and sticky action bars use `--nz-z-sticky`. Top bar, sidebar and mobile tab bar use `--nz-z-chrome`. Hover-lifted cards use `--nz-z-raised`. The off-canvas sidebar is a modal Drawer, so it lives in the overlay band.

**Rejected alternatives:**

| Option | Why not (v1) |
|---|---|
| Top layer first for every overlay (r1 D9) | No engine supports it (§1.3), and a hand-rolled native layer would duplicate the engine's focus, dismiss and position cores (r3 measured that mixing cores is the most expensive option). Native exit animations need `overlay` (Chrome only). `closedby` is not in Safari. A native modal inerts toasts (§1.2). It stays the planned swap path. |
| A fixed per-type z scale (01 or 07) | Breaks nesting in one direction or the other (C17). Every fixed precedence is wrong for some nest order. |
| `LayerProvider strategy="top-layer \| z-index"` (07) | A required provider (violates settled #8). A runtime switch duplicates code paths and defeats tree-shaking. The engine swap is build-time (r3 §8). |
| Portal everything into a Nizivo `#nz-overlay-root` element | Needs that node in the SSR HTML or a provider, and adds nothing over `body` + DOM order. A per-part `container` prop covers the edge cases (shadow roots, iframes). |
| `isolation`/stacking-context tricks on the app root | Consumer-owned; not a library decision. |

**Native-swap blockers** (each component moves behind the adapter when its gates clear; r3 §6.1):
1. `overlay` (exit animations) ships in Firefox and Safari, or the design accepts no exit animation for native overlays.
2. A spec or engine change makes top-layer elements above a modal interactive (whatwg #9936), **or** the outlet-follows-modal rule (§1.8) is proven in test O-08 on all engines.
3. `dialog[closedby]` ships in Safari, or a JS backdrop-click fallback is accepted.
4. A `moveBefore`-free reparenting strategy is used: re-portal through React, never manual DOM moves, because Safari lacks `moveBefore` and `appendChild` drops popover state.

### 1.5 Layer tokens (code-owned: `src/code-owned/layers.tokens.json`, per r7)

| Token (CSS) | Value | Use |
|---|---|---|
| `--nz-z-raised` | `1` | Hover-lifted card overlapping neighbours |
| `--nz-z-sticky` | `100` | Sticky table header, sticky action bar, sticky section headers |
| `--nz-z-chrome` | `200` | Top bar, sidebar rail, mobile top bar, mobile tab bar |
| `--nz-z-overlay` | `1000` | **Every** portaled overlay root and backdrop (DOM order decides the rest) |
| `--nz-z-toast` | `1100` | Toast region **only when the Popover API is unavailable** |
| `--nz-bg-scrim` (Figma: `bg/scrim`, new in Grove Color) | light `neutral/900 @ 32%` (designer evidence: 08 Pattern 3 scrim `7275:16092` is `bg/inverse @ 0.32`, and bg/inverse in light is n900); dark `#000 @ 60%` | Modal Dialog/Drawer/Sheet backdrop. Never `bg/inverse`: in dark that is white and **brightens** the page to #5c5f5d (08 §0.7). Computed: light page → `#afb1ae` (white modal vs scrimmed canvas 2.16:1); dark page → `#060807` (L\* 2.1). |
| `--nz-layout-bottom-inset` | set by the shell (tab bar height, sticky action bar) | Toast and sticky-bar offset on mobile |
| `--nz-layout-top-inset` | set by the shell (sticky top bar) | `scroll-padding-block-start` (WCAG 2.4.11) |

Both values are code-owned until design adds `bg/scrim` to Grove Color. A semantic variable may hold a raw colour with alpha, so it does not need a primitive.

```css
/* sketch: tokens + overlay base (layer names per the plan's canonical @layer statement) */
@layer nz.tokens {
  :root {
    --nz-z-raised: 1; --nz-z-sticky: 100; --nz-z-chrome: 200;
    --nz-z-overlay: 1000; --nz-z-toast: 1100;
    --nz-bg-scrim: light-dark(rgb(24 27 25 / 0.32), rgb(0 0 0 / 0.6));
  }
}
@layer nz.components {
  .nz-dialog-backdrop, .nz-drawer-backdrop {
    position: fixed; inset: 0; z-index: var(--nz-z-overlay);
    background: var(--nz-bg-scrim);
    /* Figma motion principle: "the backdrop only fades" */
    transition: opacity var(--nz-duration-base) var(--nz-easing-enter);
    &[data-entering] { opacity: 0; }
    &[data-exiting]  { opacity: 0; transition-duration: var(--nz-duration-fast); transition-timing-function: var(--nz-easing-exit); }
  }
  .nz-dialog-positioner, .nz-popover-positioner, .nz-menu-positioner, .nz-select-positioner, .nz-tooltip-positioner {
    z-index: var(--nz-z-overlay);   /* same band for all; open order decides */
  }
  .nz-toaster {
    /* reset UA [popover] styles */
    margin: 0; padding: 0; border: 0; background: transparent; overflow: visible; color: inherit;
    inset: auto 0 calc(var(--nz-layout-bottom-inset, 0px) + env(safe-area-inset-bottom, 0px) + var(--nz-space-4)) 0;
    position: fixed; inline-size: fit-content; margin-inline: auto; max-inline-size: min(100vw - 2 * var(--nz-space-4), 480px);
    pointer-events: none;            /* the region box never blocks the page; toasts re-enable */
    & > * { pointer-events: auto; }
    &[data-nz-fallback] { z-index: var(--nz-z-toast); }  /* no Popover API */
  }
  @media (forced-colors: active) {
    .nz-dialog-popup, .nz-drawer-popup, .nz-popover-popup, .nz-menu-popup, .nz-select-popup, .nz-tooltip-popup, .nz-toast {
      border: 1px solid CanvasText;  /* box-shadow is dropped in forced colours */
    }
  }
}
```

### 1.6 Shared mechanics (one implementation, used by every overlay)

| Concern | Rule |
|---|---|
| **Portal container resolution** (engine-internal, run at open) | (1) explicit `container` prop on the popup part; (2) the nearest parent Nizivo overlay root (engine-internal context); (3) the nearest ancestor of the trigger matching `dialog:modal`, `dialog[open]` or `:popover-open`, which covers consumers' own native dialogs (§1.2 point 2); (4) `document.body`. The optional client-only config may expose a default container for shadow-DOM/iframe hosts; it is never required. |
| **Inert / AT hiding** | Delegated to the engine (RAC `inert`). Elements marked `data-nz-top-layer` (toast region, live announcer) are mapped to the engine's exemption attribute by the adapter. Nizivo never writes `inert` or `aria-hidden` itself while an engine is in charge, because two writers would fight over reference counts. |
| **Scroll lock** | Engine counter only (RAC `usePreventScroll`, layout effect). The T2 components (Toast, own nav flyout) never lock. Lock owners: modal Dialog, AlertDialog, modal Drawer/Sheet, and the engine's modal popovers (Select, Menu, modal Popover). Non-lockers: Tooltip, Toast, non-modal Popover, non-modal Drawer, Combobox list. **CSP:** document that on iOS RAC injects a `<style>` and reads `<meta name="csp-nonce" content="…">`. Strict-CSP apps must render that meta tag (this also feeds G17). |
| **Focus on open** | Dialog/Drawer: `initialFocus` (ref or function), else the first tabbable element in the body, else the popup itself (`tabIndex=-1`). AlertDialog: the least destructive action (Cancel). Menu and listbox: the first or selected item. Popover: the first tabbable element, else the popup. Tooltip and Toast: never move focus. |
| **Focus return** | Fallback chain: `returnFocus` (`true` by default, or a ref, a function, or `false`); then the original trigger if it is still connected and focusable; then the parent overlay's trigger (Menu item → Dialog → back to the Menu button); then `document.body` with a dev-only warning. Test: O-11. |
| **Dismiss stack** | Esc and outside-press close **only the topmost** overlay (engine overlay stack). Presses inside the toast region never dismiss anything (RAC `useInteractOutside` checks `data-react-aria-top-layer`, EMPIRICAL). Tab out of a Menu or listbox closes it. Blur closes non-modal popovers only. |
| **`onOpenChange` details** | `onOpenChange(open, { reason: 'trigger' \| 'escape' \| 'outside-press' \| 'close-part' \| 'hidden' \| 'programmatic' })`. `'hidden'` is the Activity close. |
| **Activity and Strict Mode** | **Transient overlays** (Menu, Select, Combobox, Tooltip, Popover) close in a `useLayoutEffect` cleanup when they were user-opened (r1 §11.8). The adapter passes a *controlled* `isOpen` to RAC, so RAC's preserved state cannot re-open the overlay on return. **Dialog/Drawer:** an uncontrolled, user-opened dialog closes with `reason: 'hidden'`. A controlled dialog gets `onOpenChange(false, {reason: 'hidden'})` and the app decides. A `defaultOpen` dialog is not auto-closed (r1). Engine inert and scroll-lock cleanups run when Activity destroys effects. **Toaster:** mount it at the root layout, outside route Activity. If it is hidden anyway, re-show the region on unhide. |
| **SSR** | Closed overlays render nothing (RAC returns `null` during SSR). The **live announcer** (two `aria-live` nodes) and the **toast region element** *are* in the SSR HTML, because r1 requires the live region on first paint. The region is `popover="manual"`, hidden until an effect calls `showPopover()`. |
| **Motion** | Uses the state vocabulary `data-open`, `data-entering`, `data-exiting`, `data-side` and `data-align` (the final list is fixed by the plan). Popups enter with the spring pair and exit at `duration/fast` 140 ms with `easing/exit` (Figma). The backdrop only fades. In Reduced mode, fades are kept at ≤ 160 ms and travel is dropped. With portals, exit animations work in **all** browsers, because the engine keeps the node mounted through `data-exiting`. This is the Firefox exit gap from G15; it only appears with native top-layer exits. |
| **Positioning** | Engine JS positioning. It exposes `--nz-trigger-width`, `--nz-available-width`, `--nz-available-height` and `--nz-transform-origin` (r3 vocabulary). CSS anchor positioning is a later enhancement behind the adapter. |

### 1.7 Rules per overlay type

| Type | Role / pattern | Modal (inert + lock) | Initial focus → return | Dismiss | Layer | Backdrop | Notes |
|---|---|---|---|---|---|---|---|
| **Dialog** | `role=dialog` `aria-modal`, labelled by Title | yes / yes | §1.6 → trigger chain | Esc; outside press (`dismissOnOutsidePress`, default true) | band; children portal in | `--nz-bg-scrim` | Footer uses `bg/subtle` (now visible in dark, §2). `Body` is the only scroller (`max-block-size: calc(100dvh - 2*space-8)`). Close is an `IconButton` (not a bare 20 px icon). |
| **AlertDialog** | `role=alertdialog` + `aria-describedby` | yes / yes | Cancel → trigger chain | Esc yes; **outside press off** | band | scrim | One critical action. An async confirm keeps the dialog open with the action in a pending state. |
| **Drawer / Sheet (modal, default)** | Dialog pattern, side-aware | yes / yes | as Dialog | Esc; outside press; optional drag (motion package) | band | scrim | **Default is modal:** the only composition (08 Pattern 3) draws a full-frame scrim over the list and the sidebar. `side` can be a responsive object. Bottom Sheet on mobile. |
| **Drawer (`modal={false}`)** | `role=dialog` without `aria-modal` | no / no | focus moves in on open → trigger | Esc when focus is inside; **no** outside press | band | none | **WCAG 2.4.11 risk:** a non-modal overlay that does not close on focus loss must not cover focusable content ([Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)). Rule: at ≥ the panel breakpoint it **pushes** layout (in-flow panel, not overlaying). Below that it falls back to modal. |
| **Popover** (interactive content) | `role=dialog` (non-modal semantics) | engine default **modal** (RAC); `modal={false}` allowed | first tabbable → trigger | Esc, outside press, (non-modal: blur) | band; nested portal in | none | Arrow optional. |
| **Menu** (incl. submenu, context menu) | `role=menu`/`menuitem*` | yes (RAC popover) / yes | first or selected item → trigger | Esc (one level), outside press, Tab, item select | band; submenus by DOM order | none | A Menu item that opens a Dialog closes the Menu first. The Dialog's return target is the Menu trigger. |
| **Select (rich)** | `role=listbox` in popover; trigger `aria-haspopup=listbox` | yes / yes | selected option → trigger | Esc, outside press, Tab, select | band | none | NativeSelect (T0) needs nothing; the browser owns its picker. |
| **Combobox / Autocomplete** | APG combobox | engine default (list non-modal, input keeps focus) | stays in input | Esc clears/closes; blur | band | none | — |
| **Tooltip** | `role=tooltip`, `aria-describedby` | no / no | never takes focus | Esc; pointer leave (hoverable, 1.4.13); blur | band | none | Never on disabled triggers without a wrapper. Never interactive content. Not shown on touch. Shown on keyboard focus. Uses the opposite scheme (§2.6). |
| **Toast** | Region landmark (`aria-label="Notifications (F8)"`) + separate live announcer | n/a (top layer, exempt) | never steals focus; F8 enters; return to the last focused element | Esc on a focused toast; swipe; timer | **top layer** (`popover=manual`) | none | Details in §1.8. |
| **Command menu** | modal Dialog wrapping Autocomplete | yes / yes | input → trigger or previous focus | Esc, outside press | band | scrim | ⌘K hotkey policy is out of scope (G18). |
| **Sidebar off-canvas (< 640 px)** | modal Drawer `side="left"` | yes / yes | first nav item → toggle button | Esc, outside press, route change | band | scrim | Settled #11: the 640 px threshold is from the designer. |

**Nesting combinations** (each is a conformance test):
- Select, Menu, Tooltip or Combobox inside a Dialog/Drawer.
- A Dialog stacked on a Dialog:
  - At most 2 levels.
  - The parent popup gets `data-nested-open` for the optional "step back" style.
  - **Only the root modal renders a backdrop**, so the page is not double-darkened. This is a design ask.
- A Menu opening a Dialog.
- A Popover inside a Drawer.
- A Toast with an action while any of the above is open.

### 1.8 Toast, in detail

```tsx
'use client';
// toast/toaster.tsx: T2 own adapter on react-aria's useToastRegion/useToast (r3); store from r1/07.
export function Toaster({ label = 'Notifications', hotkey = ['F8'], max = 3, render }: ToasterProps) {
  const ref = useRef<HTMLElement>(null);
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getServerSnapshot);
  const { regionProps } = useToastRegionAdapter({ label, hotkey }, toasts, ref); // adds the engine top-layer marker
  useTopLayerRegion(ref, toasts.length > 0, toasts.at(-1)?.id);                 // show / re-promote / hide / fallback
  useToastOutlet(ref);   // native-swap & consumer <dialog>: re-portal into the topmost :modal dialog (React portal, not moveBefore)
  return (
    <>
      <LiveAnnouncer />  {/* SSR-rendered: <div aria-live="polite" data-nz-top-layer/> + <div aria-live="assertive" data-nz-top-layer/>, visually hidden, never display:none */}
      <section {...regionProps} ref={ref} popover="manual" className="nz-toaster" data-slot="toaster" data-nz-top-layer="">
        <ol className="nz-toaster-list" data-slot="toaster-list">
          {toasts.slice(-max).map((t) => <ToastItem key={t.id} toast={t} render={render} />)}
        </ol>
      </section>
    </>
  );
}

function useTopLayerRegion(ref: RefObject<HTMLElement | null>, active: boolean, newestId?: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('showPopover' in el)) { el.dataset.nzFallback = ''; return; }        // pre-Popover browsers
    const open = el.matches(':popover-open');
    if (active) {
      if (open && !el.contains(document.activeElement)) el.hidePopover();      // re-promote above anything opened since
      if (!el.matches(':popover-open')) el.showPopover();
    } else if (open) el.hidePopover();                                         // store removes a toast only after its exit animation
  }, [active, newestId]);
}
```

**Announcements:**
- Announcements go through the **persistent announcer**, never through the region becoming visible. A live region that turns from `display: none` to visible in the same frame as its content changes is announced unreliably.
- Success, info and neutral toasts use `polite`. Critical uses `assertive`.
- The toast items themselves are not live, which prevents a double read.

**Timing (WCAG 2.2.1):**
- The Figma "gone in 5 s" applies only to **toasts without an action**.
- Timers pause on hover, on focus-within, while the document is hidden, and while the region holds focus.
- **Toasts with an action, and critical toasts, persist until dismissed by default.** Alternatively, the action must also be reachable elsewhere (`action.altText` documents where). This is a design confirmation item, because it conflicts with "5 s".

**Keyboard:**
- F8 focuses the region.
- Tab and Shift+Tab move within the toasts.
- Esc dismisses the focused toast.
- Leaving the region returns focus to the previously focused element. RAC `useToastRegion` already restores `lastFocused` (EMPIRICAL).
- Inside a modal, Tab never reaches the toast, because the focus trap wraps. F8 is the documented path.
- Re-promotion (`hidePopover(); showPopover()`) fires `beforetoggle` and `toggle`. The adapter must not treat those events as a user dismissal or a close reason, and toast state is never derived from them.

**Focus not obscured (WCAG 2.4.11):**
- Toasts are author-initiated and non-modal. Fully covering the focused element fails 2.4.11.
- The Toaster writes its stack height to `--nz-toast-inset` on `<html>` from a layout effect, which also clears on hide.
- The base layer applies `html { scroll-padding-block-end: calc(var(--nz-layout-bottom-inset, 0px) + var(--nz-toast-inset, 0px)); }`.
- On `focusin`, if `elementFromPoint` at the focused element's centre lands in the region, the stack collapses to "peek" (one pill, 50% height) until focus moves on. Test: O-13.

**Mobile offset:**
- The region sits above the Mobile Tab Bar (08) and the sticky action bars (10) through `--nz-layout-bottom-inset` plus `env(safe-area-inset-bottom)`.
- The shell sets the inset with a React-owned attribute (`html[data-nz-bottom-bar]`) in a layout effect. **It does not use `:root:has(.nz-mobile-tab-bar)`.** Next's Activity guidance warns that `:has()` still matches hidden routes (r1 §2.5).

**Outlet follows the topmost modal** (needed only for consumer-owned native `<dialog>` modals today, and for Nizivo's own future native swap):
- A `MutationObserver` on `open` attributes tracks `dialog:modal` elements in open order.
- When one is open, the region is rendered through `createPortal` into it, so it becomes a descendant and is not inert (§1.2 point 4).
- Re-portalling remounts the region. Toast state lives in the store, so nothing is lost. Timers restart.
- The announcer moves the same way.
- Manual DOM moves (`moveBefore`/`appendChild`) are never used: Safari lacks `moveBefore`, and moving a React-owned node corrupts reconciliation.

### 1.9 Part API sketch (Dialog; other overlays follow the same shape)

```tsx
// dialog.parts.tsx: 'use client' leaf module; barrel re-exports as `export * as Dialog` + flat names (settled #2)
export function DialogRoot(props: {
  open?: boolean; defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: { reason: OpenChangeReason }) => void;
  role?: 'dialog' | 'alertdialog';
  dismissOnOutsidePress?: boolean;          // false forced for alertdialog
  children: React.ReactNode;
}): JSX.Element;
export function DialogTrigger(props: RenderProps<'button'>): JSX.Element;   // render={<Button variant="secondary" />}
export function DialogBackdrop(props: RenderProps<'div'>): JSX.Element;    // .nz-dialog-backdrop, data-slot="dialog-backdrop"
export function DialogPopup(props: RenderProps<'div'> & {
  container?: Element | null;               // rare: shadow roots, iframes
  initialFocus?: React.RefObject<HTMLElement | null> | (() => HTMLElement | null);
  returnFocus?: boolean | React.RefObject<HTMLElement | null> | (() => HTMLElement | null);
  size?: 'sm' | 'md' | 'lg' | 'full';       // → data-size
}): JSX.Element;                            // .nz-dialog-popup; provides the nested-portal container (engine-internal)
export function DialogTitle(p: RenderProps<'h2'>): JSX.Element;            // heading level via constrained prop (settled #1 detail)
export function DialogDescription(p: RenderProps<'p'>): JSX.Element;
export function DialogBody(p: RenderProps<'div'>): JSX.Element;            // the only scroller
export function DialogFooter(p: RenderProps<'div'>): JSX.Element;
export function DialogClose(p: RenderProps<'button'>): JSX.Element;        // defaults to IconButton size sm
type RenderProps<T extends keyof JSX.IntrinsicElements> = Omit<React.ComponentPropsWithRef<T>, 'children'> & {
  children?: React.ReactNode;
  render?: React.ReactElement | ((props: React.ComponentPropsWithRef<T>, state: OverlayState) => React.ReactElement);
};
```

**Rendered attributes:**
- Classes: `nz-dialog-popup` and the others.
- `data-slot="dialog-popup"`.
- State: `data-open`, `data-entering`, `data-exiting`, `data-nested-open`.
- Size: `data-size`.
- The adapter maps RAC's `isEntering`/`isExiting`. No engine attribute is documented.

### 1.10 Conformance test list (Playwright + axe; every engine adapter must pass)

Run on Chromium, Firefox and WebKit through Playwright. Tests marked † also run on real iOS Safari 17.5 and 18.x and on Android Chrome, through a device cloud or manually per release. Each test runs in the Next 16 App Router fixture (`cacheComponents: true`), the Vite SPA and React Router 8, under React **19.2.x and 19.3.x** with Strict Mode on.

| ID | Scenario | Pass criteria |
|---|---|---|
| O-01 | Select inside Dialog | Listbox is visible above the dialog (`elementFromPoint` at the option centre hits the option). Keyboard selection works. Esc closes only the listbox. The dialog stays open with focus on the Select trigger. |
| O-02 | Menu → submenu → item opens Dialog | Menu closes before the dialog opens. Closing the dialog returns focus to the **Menu trigger**. |
| O-03 | Tooltip on a button inside Dialog | Tooltip paints above the dialog. `aria-describedby` resolves. Esc closes the tooltip first, then the dialog. |
| O-04 | Dialog on Dialog | The inner dialog is on top. Only the root backdrop renders. Esc closes inner, then outer. Focus returns inner trigger → outer trigger. Scroll-lock count returns to 0. `<html>` overflow and `scrollbar-gutter` are restored exactly (compare inline styles before and after). |
| O-05 | Popover inside modal Drawer, Drawer inside nothing | Popover not clipped by the drawer's rounded clip. Positioned correctly during the drawer's enter animation (no transformed container). |
| O-06 | Toast shown while a Nizivo modal is open (RAC) | The toast paints above the backdrop. **F8** focuses the region. Enter on the action fires `onClick`. The modal stays open (no outside-dismiss). Esc on the toast dismisses only the toast. Focus returns into the dialog. axe finds no `aria-hidden-focus` violation. *(This is S-b 5; it is the critique's prototype gate.)* |
| O-07 | Toast created **before** a modal opens | With RAC portals the region (top layer) still paints above the modal backdrop and stays clickable. With a consumer native `showModal()` opened later, the next toast re-promotes the region and the outlet rule moves it into the dialog, so both old and new toasts are visible and clickable. |
| O-08 | Consumer-owned native `<dialog>.showModal()` + Nizivo Select and Toast inside the app | The Select trigger inside the native dialog portals into it (container resolution step 3), and the listbox is interactive. A toast raised while the native modal is open is rendered inside it (outlet rule) and is clickable. The announcer still announces (VoiceOver/NVDA manual check). |
| O-09 | Live announcements under modal | With a Nizivo modal open, `toast.success('Saved')` produces exactly **one** polite announcement, and `toast.critical()` one assertive (Guidepup or manual SR pass). |
| O-10 | Scroll lock reference counting | Open Dialog → open Select inside → close Select: the page is still locked. Close Dialog: unlocked. Then a 50× open/close loop under Strict Mode with the 19.3 hydration double-invoke: the counter returns to 0. |
| O-11 | Focus-return fallbacks | The trigger is removed while the dialog is open: focus goes to the parent overlay trigger, else `body`, plus a dev warning. `returnFocus={false}`: focus is not moved. `returnFocus={ref}`: focus lands on the ref. |
| O-12 | Outside press ordering | Click outside a Popover that sits inside a Dialog: only the Popover closes. Click on a toast while a Popover is open: nothing closes. |
| O-13 | 2.4.11 with toasts | With 3 toasts visible, Tab through a long form and a sticky footer. No focused element is fully covered (`elementFromPoint` at the centre is never inside `.nz-toaster`). Stack collapses to peek when needed. |
| O-14 | Toast timing | Hover, focus-within, `visibilitychange`, and region focus all pause timers. Toasts with an action, and critical toasts, never auto-dismiss by default. |
| O-15 | Activity hide/show (Next `cacheComponents`) | Open a Menu, navigate away: the Menu is not visible on the new route, `<html>` is not locked, no element outside the active route is `inert`/`aria-hidden`. Navigate back: the Menu is **closed**. Repeat for an uncontrolled Dialog (closes with `reason: 'hidden'`) and a controlled Dialog (`onOpenChange(false, {reason:'hidden'})` fires). Run on React 19.2.x and 19.3.x. |
| O-16 | (native-swap only) Native modal inside hidden Activity | The dialog is `close()`d in a layout-effect cleanup. The visible route is not inert after navigation. |
| O-17 | SSR / hydration | No overlay markup for closed overlays. The announcer and the `popover` region exist in the server HTML. No hydration warnings. The region is not shown before hydration. |
| O-18 | Popover API missing | With `HTMLElement.prototype.showPopover` deleted in an init script, toasts render `position: fixed` at `--nz-z-toast` above an open modal backdrop. |
| O-19 | iOS † | With a modal Dialog/Sheet open: the background does not scroll on touch-drag, rubber-band or keyboard open. The input inside the sheet scrolls into view. No layout jump on close. `scrollbar-gutter` holds steady on desktop. |
| O-20 | Exit animations, all engines | `data-exiting` is present until `animationend` in Firefox and WebKit. Reduced motion gives an opacity-only fade ≤ 160 ms. |
| O-21 | Forced colours (Chromium `forcedColors: 'active'`) | Every overlay popup shows a visible border. The focus outline is visible. The scrim does not hide the popup. |
| O-22 | Escape stack | Esc closes exactly one layer per press across Menu > Dialog > Dialog > Tooltip. |
| O-23 | Non-modal Drawer | Background stays interactive and is not inert. At the push breakpoint the drawer does not overlap focusable content (2.4.11). Below it the drawer becomes modal. |
| O-24 | CSP | Under `style-src 'self' 'nonce-…'` with `<meta name="csp-nonce">`, opening a modal on iOS WebKit triggers no CSP violation. Positioning inline styles are documented as requiring `style-src-attr` / `'unsafe-inline'` for attributes (G17). |
| O-25 | Container queries / clipping | A Select inside a `DialogBody` with `overflow: auto` is not clipped. A Popover inside a card with `overflow: hidden` on the page escapes it (body portal). |

### 1.11 Risks and UNVERIFIED items (overlays)

- **RAC toast hooks stability** (`useToastRegion`/`useToast` are not prefixed `UNSTABLE_` in `react-aria` 3.53.1, but their docs status is UNVERIFIED; r3). Mitigation: O-06, O-07, O-09 and O-14 cover the hooks.
- **Portal hiding under Activity in React 19.2.x is UNVERIFIED.** It is verified in 19.3.0 source only. If 19.2 does not hide portals, the r1 close-on-hide rule is the only protection, and O-15 makes it mandatory.
- **`::backdrop` custom-property inheritance** is UNVERIFIED; it matters for the native swap only.
- **whatwg #9936 might resolve either way.** If the spec makes elements above a modal interactive, the outlet rule becomes unnecessary but harmless.
- **Consumer z-index wars.** Apps with chrome above 1000 must raise `--nz-z-overlay`. Document this; the token is public.

---

## 2. Dark-mode elevation

### 2.1 The problem in numbers

Figma has no dark elevation. All effect styles are light-tuned shadows tinted with neutral/950 at 3–14% alpha. They are invisible on n900, which is itself neutral/950-adjacent.

| Pair | Light | Dark today |
|---|---|---|
| canvas → surface | n50 → n0: **1.08:1**, ΔL\* +2.9, plus Elevation/1 shadow | n950 → n900: 1.08:1, ΔL\* +3.8, shadow invisible |
| surface → subtle | n0 → n25: 1.04:1, ΔL\* −1.4 | n900 → n900: **1.00:1** (Empty State, Modal footer and Segment track vanish; 06, 07) |
| surface → surface-raised | n0 → n0 (relies on shadow) | n900 → n850: 1.10:1, ΔL\* +4.3 |
| border/subtle on surface-raised | n100 on n0: 1.15 | **n850 on n850: 1.00** (menu separators vanish) |
| scrim | none in Figma; Pattern 3 uses `bg/inverse @ .32` | the same raw bind **brightens** the page to #5c5f5d (L\* 40) |

Grove's neutrals expressed as CIELAB L\* (= Material "tone"; `c_elevation.py`). Columns are in lightness order, so the new steps sit between their neighbours:

| step | n950 | n925 (new) | n900 | n850 | n800 | n700 | n600 | n500 | n450 (new) | n400 | n300 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| L\* | 5.6 | 7.9 | 9.4 | 13.7 | 19.3 | 29.4 | 39.9 | 51.1 | 56.6 | 67.0 | 82.9 |

> n925 = #151816 sits between n950 and n900 in OKLCH (t = 0.309 from n900 toward n950).

Material's dark surface tones, from source:
- [`color_spec_2021.ts`](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec_2021.ts) at default contrast:
  - surface **6**
  - container lowest 4, low **10**, container **12**, high **17**, highest **22**
  - bright 24
- The 2026 spec ([`color_spec_2026.ts`](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec_2026.ts)) uses a darker set for its CMF variant: 4 / 0 / 6 / 9 / 12 / 15 / 18.

**Grove's existing dark ramp already lands on Material's grid:** canvas 5.6 ≈ surface 6; surface 9.4 ≈ container-low 10; surface-raised 13.7 sits between container 12 and high 17; n800 at 19.3 sits between high 17 and highest 22. The tonal method needs **no new steps for elevation**, only a different assignment.

### 2.2 Strategies compared

| Strategy | Who | How depth reads in dark | Pros | Cons for Grove |
|---|---|---|---|---|
| **Tonal surface steps** (lighter fill per level) | Material 3 (tonal elevation replaces shadow as the primary cue; [Android M3 docs](https://developer.android.com/develop/ui/compose/designsystems/material3)); Apple HIG ("base" and "elevated" background sets, where elevated is brighter and the system switches a popover or modal sheet to elevated; [HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)) | Fill lightness | Works with no shadow; stays legible in forced colours; zero runtime cost | Each level needs its own hover/pressed steps that stay distinct. Too many levels exhaust the ramp: n800 is already hover/muted/disabled. |
| **Hairline ring / border** | Radix Themes (dark `--shadow-2…6` all start with `0 0 0 1px var(--gray-a6)`; [shadow.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/styles/tokens/shadow.css)); Geist materials ([vercel.com/geist/materials](https://vercel.com/geist/materials) documents radii and relative lift only; its dark fills and strokes are UNVERIFIED) | Crisp edge | An alpha ring reads on *any* fill; cheap | Can look "boxy" if too strong. Light mode in Figma has no ring. |
| **Shadow retuning** (black, higher alpha) | Radix Themes dark (black-alpha drop shadows, much stronger than light) | Halo of darkness under the surface | Keeps the light geometry | On n950 there is little room to go darker. It is a secondary cue at best. |
| **Inner highlight** (top inset white line) | Common in "premium" dark UIs; Linear builds elevated surfaces from generated LCH aliases, with black/white opacities explored for elevation ([Linear redesign](https://linear.app/now/how-we-redesigned-the-linear-ui); qualitative, no values published) | Lit top edge | Subtle, tactile | Decoration only. Figma's `Surface/Inner Highlight` is a button treatment, so reusing it on overlays muddies meaning. |

### 2.3 Recommendation: tonal + ring + retuned shadow; highlight optional

**Levels (dark), using existing tokens wherever possible:**

| Level (Figma name) | Used by | Fill (dark) | Ring (dark) | Shadow (dark) | Light (unchanged) |
|---|---|---|---|---|---|
| 0 Flat | inline sections | `bg/surface` n900 or `bg/subtle` | `border/default` (as today) | none | as Figma |
| 1 Card | resting cards, Segment thumb | `bg/surface` n900 | `--nz-elevation-ring` white 8% (= #2a2d2b on n900; 1.34:1 vs canvas, about light's n200-on-white 1.27) | black 24% / 18% | as Figma |
| 2 Raised | hover lift, sticky elements | **`bg/surface-raised` n850** (on hover, the card's fill moves n900 → n850) | ring | black 24% / 30% | as Figma |
| 3 Popover | menus, select, popover, (tooltip is inverse, §2.6) | **`bg/surface-raised` n850** | ring | black 30% / 48% | as Figma |
| 4 Modal | dialog, drawer, sheet, command menu | **`bg/surface-raised` n850** over the scrim | ring | black 36% / 60% | as Figma |

**Why the fills stop at n850 (two tonal levels, like Apple):**
- Dark `bg/hover`, `bg/muted` and `bg/disabled` are all n800. An n800 modal would make hover rows inside it vanish (n800 vs n800 = 1.00:1).
- On n850, hover n800 stays distinct (1.17:1, ΔL\* +5.6, the same as light surface → muted at ΔL\* 5.5).
- Level 4 separates from Level 3 through the **scrim**: the page drops to L\* about 2, so the n850 modal stands ΔL\* +11.6 above it.

**Supporting token changes (dark mode only; light untouched):**

| Token | Dark today | Dark proposed | Why (computed) |
|---|---|---|---|
| `bg/subtle` | n900 | **n925 `#151816` (new primitive)** | Matches light's surface → subtle step (\|ΔL\*\| 1.43 → 1.52). Empty State and the subtle band reappear (n900 → n925: 1.03:1, the same as light's 1.04). The modal footer on n850: 1.14:1, ΔL\* −5.8. |
| `border/subtle` | n850 | **n800** | Separators on overlays (n850): 1.00 → 1.17 (light: n100 on n0, 1.15) |
| `border/default` | n800 | **n700** | Card and section borders on n850: 1.17 → 1.65; on n900: 1.82 (dark needs more edge than light's 1.27, because shadows don't carry) |
| `border/strong` | n700 | **n600** | Keeps the ladder order: subtle < default < strong < control (n500) < control-hover (n400) |
| `--nz-bg-scrim` (new) | — | `#000` @ 60% | §1.5 |
| `--nz-elevation-ring` (new, code-owned effect) | — | `rgb(255 255 255 / .08)`; light `transparent` | Radix-style alpha ring: a constant edge on any dark fill (1.34–1.52:1 against what is outside) |
| Segment thumb | `bg/surface` on `bg/subtle` (1.00) | thumb `bg/surface-raised` + ring + Elevation/1 | Thumb n850 vs track n925: 1.14:1, plus the ring (fixes 06's "thumb = track") |

**Shadow alphas.** Same geometry as Figma. Dark alpha = min(0.6, 6 × light alpha), with colour `#000`:
- Elevation 1: .04/.03 → .24/.18
- Elevation 2: .04/.05 → .24/.30
- Elevation 3: .05/.08 → .30/.48
- Elevation 4: .06/.14 → .36/.60

The ×6 rule is a starting point within Radix Themes' dark range (black-alpha layers), not a measured optimum. It is a design-tuning item.

**Inner highlight.** Ship the token `--nz-elevation-highlight` as **transparent in both modes**. Design can switch it on (`rgb(255 255 255 / .04)`, inset 0 1px 0 0) for Levels 3–4 with no code change. This keeps the plug-in/plug-out promise without committing the brand.

```css
@layer nz.tokens {
  :root {
    --nz-elevation-ring: light-dark(transparent, rgb(255 255 255 / 0.08));
    --nz-elevation-highlight: transparent; /* design opt-in: light-dark(transparent, rgb(255 255 255 / .04)) */
    --nz-elevation-1: 0 0 0 1px var(--nz-elevation-ring),
      0 1px 2px 0 light-dark(rgb(16 19 17 / .04), rgb(0 0 0 / .24)),
      0 1px 1px 0 light-dark(rgb(16 19 17 / .03), rgb(0 0 0 / .18));
    --nz-elevation-2: 0 0 0 1px var(--nz-elevation-ring),
      0 2px 4px 0 light-dark(rgb(16 19 17 / .04), rgb(0 0 0 / .24)),
      0 8px 16px -4px light-dark(rgb(16 19 17 / .05), rgb(0 0 0 / .30));
    --nz-elevation-3: inset 0 1px 0 0 var(--nz-elevation-highlight), 0 0 0 1px var(--nz-elevation-ring),
      0 4px 8px 0 light-dark(rgb(16 19 17 / .05), rgb(0 0 0 / .30)),
      0 16px 32px -8px light-dark(rgb(16 19 17 / .08), rgb(0 0 0 / .48));
    --nz-elevation-4: inset 0 1px 0 0 var(--nz-elevation-highlight), 0 0 0 1px var(--nz-elevation-ring),
      0 8px 16px 0 light-dark(rgb(16 19 17 / .06), rgb(0 0 0 / .36)),
      0 32px 64px -12px light-dark(rgb(16 19 17 / .14), rgb(0 0 0 / .60));
  }
}
@layer nz.components {
  .nz-popover-popup, .nz-menu-popup, .nz-select-popup { background: var(--nz-bg-surface-raised); box-shadow: var(--nz-elevation-3); }
  .nz-dialog-popup, .nz-drawer-popup { background: var(--nz-bg-surface-raised); box-shadow: var(--nz-elevation-4); }
  .nz-card[data-interactive]:hover { background: var(--nz-bg-surface-raised); box-shadow: var(--nz-elevation-2); }
}
```

**Notes on the CSS:**
- `light-dark()` is used only inside colour positions, as r2 requires. The light rendering is byte-for-byte Figma's: a transparent ring and a transparent highlight add nothing.
- **If D6 picks duplicated blocks over `light-dark()`,** the generator emits the dark shadow lists inside the dark selector block instead. The values are the same.
- Elevation colours should move into the Figma effect styles as **variable-bound colours** (`shadow/tint`, `shadow/ring`). Today they are hard-coded and carry hex drift (r7's `shadow.tint` proposal).

### 2.4 Rejected alternatives (elevation)

- **Shadow-only (retune alphas).** It fails on n950 canvas; nothing gets darker than black.
- **Three or more tonal levels** (modal on n800). Hover/muted/disabled collide (C6 row: 1.00:1). It would need a parallel set of "hover-on-elevated" tokens.
- **Alpha-white fills** for surfaces (Linear-like overlays). The fills would no longer be aliases of Grove primitives, which breaks the Figma codeSyntax round-trip (settled #5). Kept only for the ring, which is code-owned.
- **Making the light theme gain rings** for symmetry. That changes the designed light look with no accessibility need.

### 2.5 Forced colours

Shadows and rings disappear in forced colours. Overlays get `border: 1px solid CanvasText` (§1.5), and focus is a solid outline (settled #12). No elevation information is required to operate anything.

### 2.6 Inverse surfaces (Toast, Tooltip) as an opposite-scheme scope

Figma paints Toast and Tooltip with `bg/inverse` + `text/inverse`, and then reuses normal tokens inside them. That causes the dark failures:
- the Toast action, `bg/accent` used as text on white: **1.75:1**
- the Toast success icon, green/300 on white: **2.29:1**
- the Tooltip shortcut, `text/tertiary` on inverse

The inverse of light *is* the dark theme: dark `bg/surface` n900 = light `bg/inverse` n900, and light `bg/surface` n0 = dark `bg/inverse` n0. Scoping these components to the **opposite colour scheme** makes every nested token resolve correctly without minting an "on-inverse" family.

```css
@layer nz.tokens {
  :root, [data-nz-theme="light"], [data-nz-theme="system"] { --nz-scheme-inverse: dark; }
  [data-nz-theme="dark"] { --nz-scheme-inverse: light; }
  @media (prefers-color-scheme: dark) { [data-nz-theme="system"] { --nz-scheme-inverse: light; } }
}
@layer nz.components {
  .nz-toast, .nz-tooltip-popup {
    color-scheme: var(--nz-scheme-inverse);              /* light-dark() now resolves to the other theme */
    background: var(--nz-bg-surface); color: var(--nz-text-primary);
  }
  .nz-toast-action { color: var(--nz-text-accent); }    /* new token: light green/700, dark lime/300 */
}
```

**Computed results:**
- Light mode (toast is dark-scheme on n900):
  - text 16.14
  - tertiary (n400) 6.87
  - `icon/success` g300 7.58
  - `text/accent` lime/300 11.80
  - focus g300 7.58
- Dark mode (toast is light-scheme on white):
  - text 17.36
  - tertiary (n600) 6.48
  - `icon/success` g500 4.66
  - `text/accent` green/700 8.51
  - focus g500 4.66

Lime fails on white at any brand-like lightness: lime/600 3.98; a synthetic lime/700 `#617f0b` reaches 4.62 on n0 but only 4.29 on n50. So `text/accent` is one token with **two different hues per mode**. That is a design confirmation: "the accent in dark mode's white toast becomes forest green". This depends on the `light-dark()` mechanism (D6). With duplicated blocks, the generator emits an `[data-nz-inverse]` block per theme instead.

### 2.7 Risks (elevation)

- **No rendered dark pass exists** (G4). Every value here is computed from hexes. A render review of pages 02, 04, 06 and 07 with these tokens is the acceptance gate.
- **The ring alpha (8%) and shadow multiplier (×6) are judgement values.** Design must tune them on real screens.
- **Out of scope but adjacent** (04): in dark mode `brand-subtle`, `accent-subtle` and `success-subtle` all equal green/950. That needs its own dark token pass.

---

## 3. Accessibility token remediation

### 3.1 Method and reproduction of the reported failures

**Formula:** WCAG 2.2 relative luminance (sRGB linearisation threshold 0.04045; the older 0.03928 changes nothing at two decimals), with the contrast ratio (L1 + 0.05)/(L2 + 0.05).

**Backgrounds tested:** every background a token can realistically sit on.
- Light: n0 (surface/raised), n25 (subtle), n50 (canvas and **hover**), n100 (muted).
- Dark: n950, n925 (new subtle), n900, n850 (raised and the tone-subtle fills), n800 (**hover**/muted).

**Thresholds:** 4.5:1 for text (1.4.3), 3:1 for non-text, input boundaries and focus indicators (1.4.11). Disabled controls are exempt ([Understanding 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): "does not apply to inactive user interface components").

**Input boundaries.** The Understanding doc says a boundary is needed only when nothing else identifies the control, but "where a text-input has a visual indicator to show it is an input … that indicator must meet 3:1". Grove inputs are identified only by their border, so the border must pass.

Reported failures, recomputed (`a_baseline.py`). All reproduce:

| Pair | Ratio | Need |
|---|---|---|
| `text/tertiary` n500, light, on n0 / n25 / n50 / n100 | 4.31 / 4.16 / 4.01 / **3.76** | 4.5 |
| `text/tertiary` n500, dark, on n950 / n900 / n850 / n800 | 4.34 / 4.03 / 3.65 / **3.12** | 4.5 |
| dark `text/critical` red/500 on n900 / n850 / n800 | **4.01** / 3.63 / 3.11 | 4.5 |
| dark `text/info` blue/500 on n900 / n850 | **3.63** / 3.29 | 4.5 |
| dark `bg/critical` red/500 with white / n900 / n950 | 4.33 / 4.01 / 4.32 (no passing foreground) | 4.5 |
| `border/default` n200 / `border/strong` n300 vs n0 | **1.27 / 1.57** | 3 |
| dark `border/default` n800 / `border/strong` n700 vs n900 | 1.29 / 1.82 | 3 |
| `icon/warning` amber/500 vs n0 / amber/50 | **2.45** / 2.27 | 3 |
| Focus halo (green/500 @ 28%, #c5dcd1) vs n0 / n50 | **1.45** / 1.43 | 3 |
| dark Toast action lime/400 on white; dark Toast success icon green/300 on white | 1.75; 2.29 | 4.5; 3 |

The 2px `border/focus` outline already passes everywhere: green/500 is 4.07–4.66 on light backgrounds, and green/300 is 5.87–8.17 on dark. That is why settled #12 works unchanged.

### 3.2 Proposed mapping (all pairs verified in `f_final.py`)

| Token | Mode | Was (worst ratio) | Now | Ratio vs each background | Min | Need | Result |
|---|---|---|---|---|---|---|---|
| `text/secondary` | L | n600 (5.65) | n700 `#414741` | n0 9.54, n25 9.20, n50 8.87, n100 8.31 | **8.31** | 4.5 | pass |
| `text/secondary` | D | n400 (5.32) | n300 `#cbd0c8` | n950 11.93, n925 11.41, n900 11.07, n850 10.03, n800 8.58 | **8.58** | 4.5 | pass |
| `text/tertiary` | L | n500 (3.76) | n600 `#596058` | n0 6.48, n25 6.26, n50 6.03, n100 5.65 | **5.65** | 4.5 | pass |
| `text/tertiary` | D | n500 (3.12) | n400 `#9ea59c` | n950 7.40, n925 7.08, n900 6.87, n850 6.23, n800 5.32 | **5.32** | 4.5 | pass |
| `text/critical` | D | red/500 (3.11) | **red/400 `#e47962` (new)** | n950 6.42, n925 6.14, n900 5.96, n850 5.40, n800 4.62 | **4.62** | 4.5 | pass |
| `text/info` | D | blue/500 (2.81) | **blue/400 `#7098e0` (new)** | n950 6.46, n925 6.18, n900 6.00, n850 5.43, n800 4.65 | **4.65** | 4.5 | pass |
| `text/accent` (new) | L | — | green/700 `#1a573a` | n0 8.51, n25 8.21, n50 7.91 | **7.91** | 4.5 | pass |
| `text/accent` (new) | D | — | lime/300 `#c6e06a` | n950 12.71, n900 11.80, n850 10.68 | **10.68** | 4.5 | pass |
| `bg/critical` + `text/on-critical` (new) | L+D | dark red/500 with no passing foreground | `bg/critical` **red/600 in both modes**; `text/on-critical` white | white on red/600 | **5.69** | 4.5 | pass |
| `bg/critical-hover` (new) + `text/on-critical` | L+D | raw red/700 bind (07) | red/700 | white on red/700 | **8.26** | 4.5 | pass |
| `icon/warning` | L | amber/500 (2.13) | amber/600 `#b07b0e` | n0 3.69, n25 3.56, n50 3.43, n100 3.22, amber/50 3.43 | **3.22** | 3 | pass |
| `icon/info` (new) | L | (Alert used `icon/brand`) | blue/600 | n0 6.69 … n100 5.83, blue/50 6.01 | **5.83** | 3 | pass |
| `icon/info` (new) | D | — | blue/400 (new) | n950 6.46 … n800 4.65 | **4.65** | 3 | pass |
| `icon/critical` | D | red/500 (3.11) | red/400 (new) | n950 6.42 … n800 4.62 | **4.62** | 3 | pass |
| `border/control` (new: input, checkbox, radio, switch-off track, select trigger) | L | n200/n300 (1.27/1.57) | **neutral/450 `#828a81` (new)** | n0 3.56, n25 3.43, n50 3.31, n100 3.10 | **3.10** | 3 | pass |
| `border/control` (new) | D | n800/n700 | n500 `#747c73` | n950 4.34, n925 4.15, n900 4.03, n850 3.65, n800 3.12 | **3.12** | 3 | pass |
| `border/control-hover` (new) | L | n300 | n500 | n0 4.31 … n100 3.76 | **3.76** | 3 | pass |
| `border/control-hover` (new) | D | n700 | n400 | n950 7.40 … n800 5.32 | **5.32** | 3 | pass |
| `border/warning` | L | amber/500 (2.13) | amber/600 | n0 3.69 … n100 3.22 | **3.22** | 3 | pass |
| `border/critical` | L / D | red/500 | unchanged | L min 3.77 / D min 3.63 | — | 3 | pass |
| `border/focus` (2px outline, offset 2px) | L / D | unchanged | green/500 / green/300 | L min 4.07 (incl. brand-subtle 4.11) / D min 5.87 | — | 3 | pass |

**Component remapping that goes with the table:**
- Input, Select trigger, Search Field, Checkbox and Radio boundaries use `border/control`, and `border/control-hover` on hover. Figma used `border/default` at rest and `border/strong` on hover.
- The Switch off-track **fill** becomes `border/control`'s colour (n500): track vs surface 4.31 (light), 4.03 (dark); the white knob on the track 4.31.
- `border/default` and `border/subtle` become decorative only (cards, dividers). They need no minimum, and their light values stay as designed.
- Toast/Tooltip use the opposite-scheme scope (§2.6).
- The Toast action becomes a real `Button` (variant tertiary, size sm) coloured `text/accent`, not a TEXT node.

**Focus ring:**
- `outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px;` (settled #12).
- The halo becomes `box-shadow: 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--nz-focus-halo)` with `--nz-focus-halo: color-mix(in oklab, var(--nz-border-focus) 28%, transparent)`. That makes it **mode-aware** (Figma's halo hex is static green/500 in dark too) and removes the effect-style hex drift (#2e8258 vs #2e8358; critical #d64a2e vs #d6492f). Design should bind the Focus/Ring effect colours to variables.
- In clipped scroll containers (`DialogBody`, table cells) use `outline-offset: -2px` through `[data-nz-focus-inset]`, so the outline isn't clipped.
- Invalid fields keep the green outline and change only the halo to `border/critical`. Red-on-red would add no information.

**New primitives** (OKLCH-interpolated between existing ramp neighbours, so hue and chroma follow the ramp):

| Primitive | Hex | OKLCH (L, C, h) | Derived from | Used by |
|---|---|---|---|---|
| neutral/450 | `#828a81` | 0.624, 0.016, 142.2 | n400 → n500, t = 0.645, the lightest step that gives ≥ 3.10 on every light background including muted | light `border/control` |
| neutral/925 | `#151816` | 0.205, 0.006, 156.7 | n900 → n950, t = 0.309, matching light's surface → subtle ΔL\* | dark `bg/subtle` |
| red/400 | `#e47962` | 0.692, 0.138, 33.3 | red/500 → red/100, t = 0.292, ≥ 4.6 on all dark backgrounds | dark `text/critical`, `icon/critical` |
| blue/400 | `#7098e0` | 0.681, 0.116, 261.6 | blue/500 → blue/100, t = 0.338, ≥ 4.6 on all dark backgrounds | dark `text/info`, `icon/info` |

### 3.3 The text-ladder choice (Option A recommended)

| Option | Light primary / secondary / tertiary | Dark primary / secondary / tertiary | New primitives | Secondary→tertiary gap (light; dark) | Primary→secondary gap (light; dark) |
|---|---|---|---|---|---|
| Today (fails) | n900 / n600 / n500 | n50 / n400 / n500 | — | ΔL\* 11.2 (1.50:1); 15.8 (1.71:1) | ΔL\* 30.5; 30.1 |
| **A: re-space (recommended)** | n900 / **n700** / **n600** | n50 / **n300** / **n400** | none | **ΔL\* 10.5 (1.47:1); 15.9 (1.61:1)**: the designer's spacing is kept | ΔL\* 20.1; 14.2 |
| B: minimal (new steps) | n900 / n600 / new `#666d65` | n50 / n400 / new `#929a90` | 2 | ΔL\* 5.3 (1.22:1); 4.3 (1.15:1): tertiary almost merges with secondary | unchanged |
| C: alias tertiary → secondary | n900 / n600 / n600 | n50 / n400 / n400 | none | 0: three tokens, two values | unchanged |

**Recommendation: A.**
- It uses only existing primitives, which is what the task asks for "where possible".
- It preserves the secondary-to-tertiary step the designer chose.
- It spends the only legal lightness range evenly. In dark, AA on n800 bounds tertiary at L\* ≈ 63, and that is split into about 15 L\* steps.

**Cost:** light secondary text gets visibly deeper (n600 → n700), and dark secondary gets brighter (n400 → n300). Dark has never been rendered or approved (G4), so the dark half is low-risk. The light half is the one design must accept.

**If design rejects A:** choose C over B. B adds two primitives for a distinction users can barely see.

**Two more notes on Option A:**
- **One primitive, two roles.** In dark, n400 serves both `text/tertiary` and `border/control-hover`. This is intentional: both need about 5:1 on n800, and the roles never touch.
- **Sign-off scope.** Option A re-renders every light `text/secondary` use one step darker, and that token appears on about 20 components. The render review (G4) must therefore include **light** pages 02, 04, 05 and 08, not only the dark set.

### 3.4 Ownership: Figma first, with a time-boxed code override layer

**Principle.** Figma remains the source of truth for values (r7). WCAG AA failures block a stable release (D15). When the two conflict, code may override, but only visibly and temporarily.

**Mechanism.** All of this lives in the token source, not as a CSS layer.

```
packages/tokens/src/
  figma-owned/…                                   # untouched, written only by the Figma normaliser (r7)
  code-owned/a11y/
    primitives.overrides.tokens.json              # proposed new steps: neutral/450, neutral/925, red/400, blue/400
    light.overrides.tokens.json                   # applied LAST in the theme=light context
    dark.overrides.tokens.json                    # applied LAST in the theme=dark context
```

```jsonc
// code-owned/a11y/dark.overrides.tokens.json (one entry shown)
{
  "text": { "critical": {
    "$type": "color",
    "$value": "{p.red.400}",
    "$extensions": { "app.nizivo.override": {
      "figmaVariable": "Grove Color/text/critical (Dark)",
      "figmaValueAtOverride": "{p.red.500}",
      "reason": "4.01:1 on bg/surface, 3.11 on bg/hover (WCAG 1.4.3)",
      "wcag": ["1.4.3"],
      "issue": "https://github.com/<org>/<repo>/issues/<n>",
      "approvedBy": ["design-system-lead", "a11y-owner"],
      "expires": "2027-01-31"
    } }
  } }
}
```

```jsonc
// nizivo.resolver.json: overrides are the last source of each context (DTCG 2025.10 resolver; later sources win)
"theme": { "contexts": {
  "light": [{ "$ref": "figma-owned/color/light.tokens.json" }, { "$ref": "code-owned/a11y/light.overrides.tokens.json" }],
  "dark":  [{ "$ref": "figma-owned/color/dark.tokens.json"  }, { "$ref": "code-owned/a11y/dark.overrides.tokens.json"  }]
} }
```

**Why overrides live in the token source and not in a CSS `@layer nz.a11y`:**
- One value per token reaches every output: CSS, JS refs, the Tailwind `@theme`, and the Figma-importable JSON.
- Consumers never see a second cascade source.
- The layer order (settled #3) stays unchanged.

**CI rules** (`scripts/a11y-overrides-check.ts`, run on every PR and every Figma sync PR):
1. **Contrast matrix.**
   - A hand-maintained `contrast-pairs.json` lists every fg/bg pair components actually use, with the role (text / large-text / non-text / focus / decorative / disabled) and the background list per mode. It is seeded from §3.2 and `f_final.py`.
   - CI evaluates **every theme permutation** and fails on any AA miss. This does not rely on Terrazzo's `a11y/min-contrast` alone, because its per-modifier evaluation is unconfirmed (r7 checklist).
   - Correct r7's pair `border.default` → `border.control`.
2. **Drift.** If the current Figma value no longer equals `figmaValueAtOverride`, CI fails with "Figma changed this token; re-evaluate the override".
3. **Redundancy.** If the Figma value now equals the override value (or passes the matrix on its own), CI fails with "override redundant; delete it". This is how the layer is removed: the design fix lands, the next sync PR fails, and the engineer deletes the entry in the same PR.
4. **Expiry.** CI warns 14 days before `expires` and fails after it. Extending requires a new approval from both owners.
5. **Docs.** The build emits a public "Deviations from the Figma library" page in the Fumadocs site listing every live override. Users and designers see the debt.
6. **Release gate.** Changesets refuses a stable (non-prerelease) publish if any pair fails. An allowlist (r7's "expiring allowlist") is permitted **only in prereleases**, and it lists pairs that have neither an override nor a fix.

**Ownership (RACI):**
- **Design-system designer:** Accountable for values. Fixes land in the Figma Grove Color, Primitives and Effect styles.
- **Accessibility owner (engineering):** Responsible for the matrix. May propose overrides, with the design-system lead's approval.
- **CODEOWNERS:** `code-owned/a11y/**` requires both.
- **Release manager:** enforces the gate.

**Constraint on new primitives:**
- New primitive steps (neutral/450, neutral/925, red/400, blue/400) are **design proposals**. They may ship only through the override file, with the same expiry.
- They must be added to Figma Grove Primitives to become permanent. This is another reason Option A, which needs no new neutral text steps, is preferred.

**Dependency.** Override files that touch only one theme context rely on r7's UNVERIFIED Terrazzo partial-permutation behaviour (S-b 1). Run the same dry run before adopting them.

**Code → Figma.** The override list is the to-do list for designers. Optionally, r7's `figma-push` writes the proposed values to a Figma **branch** for review, human-triggered and within the MCP budget. Merging that branch closes the loop through the normal sync.

**Rejected alternatives:**

| Option | Why not |
|---|---|
| Block code on design | Unbounded wait. The dark mode has never been rendered, and Figma ownership is unsettled (S-d), so v1 would ship with known AA failures or not ship at all. |
| Fix silently in code | Figma and code diverge, the Dev Mode/codeSyntax round-trip breaks, and designers keep producing failing compositions. |
| A CSS override layer (`@layer nz.a11y`) | A second cascade source. JS/Tailwind token outputs disagree with the CSS. The layer order changes (settled #3 API). |
| Restrict `text/tertiary` to ≥ 18 px | A fragile usage rule. Today it is used at 14 px for axis labels, placeholders, hex labels and menu shortcuts, so most uses would violate it. |

### 3.5 Remaining non-token a11y items found in this pass (for the design backlog)

- **Bare close icons** (Toast 16 px, Alert 16 px, Banner 18 px, Modal/Drawer 20 px) must become `IconButton`s, at least size sm 32. A bare 16 px icon fails 2.5.8 unless it has the spacing exception.
- **The Toast action** must be a real button with a hit area. The Toast close must be an `IconButton`.
- **Info tone:** Alert's Info uses `icon/brand` (green on blue). Use the new `icon/info`.
- **Critical button hover** binds the primitive red/700 directly. Use `bg/critical-hover`.

### 3.6 Target-size strategy

**Policy:**
1. **AA (2.5.8) everywhere, always:** every pointer target is ≥ 24 × 24 CSS px, or meets the spacing exception (a 24 px circle centred on each undersized target intersects no other target or circle; [Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)). Control sizes 32/40/48 pass on their own.
2. **Touch enhancement:** on a coarse **primary** pointer (`@media (pointer: coarse)`), every interactive control gets an invisible hit area of at least `--nz-size-touch-min` (44 px) on **both axes**. This implements Figma's "44px via padding on touch" without changing layout.
   - `any-pointer: coarse` is rejected as the default. Per [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-pointer), it matches when *any* device is coarse, for example touchscreen laptops driven by a mouse, where an expanded slop area would steal clicks from neighbours.
   - Apps that want it can opt in with `data-nz-touch-targets="always"`. This is a new namespaced attribute. It belongs in the plan's canonical attribute list next to `data-nz-theme`, `data-nz-density` and `data-nz-motion`, so that no second name gets invented.
3. **Visible sizes never change automatically** (no layout shift between devices). `[data-nz-density="touch"]` is an explicit opt-in that raises `--nz-size-control-sm/md` to 44 (r2's density mechanism).

**The CSS (fixes S2):**
- `inset` longhands resolve percentages against their **own** axis of the containing block. For an absolutely positioned pseudo-element of a `position: relative` control, that is the control's padding box.
- So `100% − 44px` is negative only on axes where the control is smaller than 44, and `min(0px, …)` leaves larger axes alone.
- Results: a 40 × 40 icon button with a 1px border expands 3 px on every side (38 + 6 = 44). A 120 × 40 text button expands only vertically. A 32 × 32 button expands 6 px on all sides.

```css
@layer nz.base {
  .nz-hit-target { position: relative; }                     /* applied by every interactive component root */
  @media (pointer: coarse) {
    .nz-hit-target::after {
      content: ""; position: absolute;
      inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));   /* expands only axes below 44px */
    }
  }
  [data-nz-touch-targets="always"] .nz-hit-target::after {   /* opt-in for hybrid devices (touch laptops) */
    content: ""; position: absolute;
    inset: min(0px, calc((100% - var(--nz-size-touch-min)) / 2));
  }
}
```

**Rules that make it robust:**
- `::after` is **reserved** for the hit area on interactive roots. Components draw decoration with `::before` or real elements.
- **Native checkbox, radio, switch and range** (T0, replaced elements with no pseudo-elements): the hit target is the wrapping `<label class="nz-checkbox nz-hit-target">`. It gets `min-block-size: 24px` for 2.5.8, because a 14 px Label/M row is about 20 px tall.
- **Spacing:** adjacent icon buttons keep a gap ≥ (44 − size) so their expansions do not overlap: `space/1` for 40 px and `space/3` for 32 px. Per 2.5.8 the overlapping area does not count toward target size. The CSS lint rule and story checks flag smaller gaps.
- **Clipping:** expansion is clipped by `overflow: hidden/auto` ancestors (table cells, `DialogBody`). Controls near those edges get `data-nz-hit-inset` (no expansion), and the test reports them.
- **Icon button sizes:** `sm 32`, `md 40`, `lg 48`. An `xs 24` exists only for in-chip dismiss, where the chip's own area counts.

**Tests:**
- In Playwright with `hasTouch: true, isMobile: true` (pointer: coarse), sample `elementFromPoint` on a 44 × 44 grid around each control's centre. Every point must hit the control or a non-interactive element, never a different control. Report controls whose slop is clipped.
- In fine-pointer mode, assert every control is ≥ 24 × 24 or passes the circle test.

### 3.7 The 12 px caption question

**Evidence:**
- The designer rule is explicit: "Nothing smaller than 14px" (01 Typography header). There is intentionally no 12 px style (00).
- The densest Figma UIs already comply. Chart axis labels, legends and captions are Body/M 14 px (03 §691; 04). Badges and Kbd use Label/M 14.
- WCAG sets no minimum font size. Legibility at small sizes is a design judgement, not a conformance issue.
- r7's lint `min-font-size: 12px` (S5) contradicts the designer's rule.

**Recommendation:**
- Keep 14 px as the floor and set the Terrazzo lint to `minSizePx: 14`.
- Express sizes in rem (0.875rem) so user font scaling works (1.4.4).
- File a design request listing the candidate cases for a `Label/S 12`: chart tick labels in compact cards, table meta, badge counts and Kbd hints in dense menus. Any approved 12 px style must use `text/secondary` or stronger, never `text/tertiary`, and comes with a usage allowlist.
- Until then, components must not hard-code 12 px.

### 3.8 Risks (a11y)

- **Option A changes passing secondary text in light mode.** If design rejects it, C is the fallback; it loses a hierarchy level but stays compliant.
- **`border/control` at 3.1–3.6:1 is visibly stronger than Figma's 1.27 border.** This is the main brand-look cost. The lighter alternative, new `#878e86` at ≥ 3.0 except on muted, needs a "no controls on `bg/muted`" rule. I reject it as fragile.
- **Dark red/400 and blue/400 are computed, not designed.** Their hue drift is within 1° of the 500 steps, but chroma drops by about 25% for legibility. Design should eyeball them.
- **The override layer could become permanent debt.** Expiry plus the redundancy and drift checks are the controls. The public deviations page makes the debt visible.

---

## 4. Decisions requested from design (one list)

1. Accept the overlay fill change in dark: every floating surface uses `bg/surface-raised` (n850).
2. Accept the dark border ladder shift: subtle n800, default n700, strong n600.
3. Accept the ring at 8%, the shadow ×6 rule, and the inner highlight off by default.
4. Add `bg/scrim` to Grove Color: light n900 @ 32% (matches 08 Pattern 3), dark #000 @ 60%. Remove the raw `bg/inverse` scrim binds (08 `7275:16092`, 10).
5. Add primitives neutral/450, neutral/925, red/400 and blue/400 (or supply alternatives that pass §3.2).
6. Pick the text ladder: A (recommended), B or C.
7. Add semantic tokens:
   - `text/accent`
   - `text/on-critical`
   - `bg/critical-hover`
   - `icon/info`
   - `border/control`
   - `border/control-hover`
   - bind `bg/critical` to red/600 in both modes
8. Confirm that `text/accent` in dark mode's white toast is forest green, not lime.
9. Toast timing: toasts with an action, and critical toasts, persist (vs "gone in 5s").
10. Nested modal visuals: only the root modal shows a backdrop.
11. Non-modal Drawer: at wide widths it pushes content instead of overlaying.
12. Effect styles: bind elevation and focus-ring colours to variables, which fixes the hex drift.
13. Keep the 14 px floor. Answer the `Label/S 12` request (§3.7).
14. Close affordances become `IconButton`s, and the Toast action becomes a `Button`. This changes the Toast height from 44 to 56 px with sm 32 buttons, or to 48 px with an `xs` 24 close.

## 5. Sources

**Standards and platform:**
- [HTML: showModal](https://html.spec.whatwg.org/multipage/interactive-elements.html#dom-dialog-showmodal)
- [whatwg/html#9936](https://github.com/whatwg/html/issues/9936), [#10811](https://github.com/whatwg/html/issues/10811), [#11195](https://github.com/whatwg/html/issues/11195), [#9998](https://github.com/whatwg/html/issues/9998)
- [GoogleChrome modern-web-guidance-src#1670](https://github.com/GoogleChrome/modern-web-guidance-src/issues/1670)
- [web.dev: Popover Baseline](https://web.dev/blog/popover-baseline), [WebKit bug 267688](https://bugs.webkit.org/show_bug.cgi?id=267688), [BCD #22927](https://github.com/mdn/browser-compat-data/issues/22927)
- [WebKit Safari 27.0 features](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)
- [caniuse moveBefore](https://caniuse.com/mdn-api_element_movebefore)
- [MDN any-pointer](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/any-pointer)
- WCAG Understanding: [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html), [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [React Activity](https://react.dev/reference/react/Activity)

**Design systems:**
- Material color utilities [color_spec_2021.ts](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec_2021.ts) and [color_spec_2026.ts](https://raw.githubusercontent.com/material-foundation/material-color-utilities/main/typescript/dynamiccolor/color_spec_2026.ts)
- [Android M3 in Compose](https://developer.android.com/develop/ui/compose/designsystems/material3)
- [Apple HIG Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode)
- [Radix Themes shadow.css](https://github.com/radix-ui/themes/blob/main/packages/radix-ui-themes/src/styles/tokens/shadow.css) and [Radix shadows doc](https://www.radix-ui.com/themes/docs/theme/shadows)
- [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Geist materials](https://vercel.com/geist/materials) (radii only; fills and borders UNVERIFIED)

**EMPIRICAL (installed source, `scratchpad/bench/deps/node_modules`):**
- `react-aria@3.53.1`, under `dist/private/`:
  - `overlays/ariaHideOutside.mjs`
  - `overlays/useModalOverlay.mjs`
  - `overlays/usePopover.mjs`
  - `overlays/usePreventScroll.mjs`
  - `overlays/Overlay.mjs`
  - `toast/useToastRegion.mjs`
  - `focus/FocusScope.mjs`
  - `interactions/useInteractOutside.mjs`
  - `utils/getNonce.mjs`
- `@base-ui/react@1.9.0`:
  - `floating-ui-react/utils/markOthers.js`
  - `floating-ui-react/components/FloatingFocusManager.js`
  - `utils/useScrollLock.js`
- `@radix-ui/react-dialog@1.3.1` `dist/index.mjs`
- `aria-hidden@1.2.6`
- `react-dom@19.3.0` `cjs/react-dom-client.development.js` (`hideOrUnhideAllChildrenOnFiber`, `hideOrUnhideNearestPortals`)

**Local:** project docs `docs/research/00-critique.md`, r1, r2, r3, r7 and r8; figma reports 00, 01, 03, 06, 07 and 08; and the scripts in `scratchpad/gaps/scripts/`.
