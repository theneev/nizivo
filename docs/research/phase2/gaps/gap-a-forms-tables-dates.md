# Gap A: forms, data tables, dates/time and the command menu

Date: 2026-10-14. This report closes the critique's coverage gaps **G11** (forms), **G12** (data table), **G13** (date and time) and **G18** (hotkeys and command menu). It also covers the input-family items in **M-C**: textarea, character count, password toggle, prefix/suffix inputs, combobox/search suggestions and the quantity stepper. It proposes decisions **D16–D20**.

It takes the 16 settled decisions as constraints. **The behaviour engine (D1) is still open.** Where a recommendation depends on it, the text says so. Every engine-specific claim is written as "with React Aria (r3's medium-confidence pick) … with Base UI …".

**Package name placeholder.** Code sketches import from `@nizivo/ui/<entry>` only because that is what the user was told earlier. **This report does not decide the core package name** (C1: `@nizivo/ui` vs `@nizivo/react`). Read `@nizivo/ui` as "the core package, whatever it is called".

**Evidence tags.**
- **EMPIRICAL**: measured or run locally today; scripts are under `scratchpad/gapa/tools/`.
- **PRIMARY**: an npm registry record, the official docs, a spec, `@mdn/browser-compat-data` 8.1.5 or `web-features` 3.42.0. The last two were read as data; they are the same files the critique used.
- **UNVERIFIED**: anything not confirmed by either of the above.

---

## 0. Decisions at a glance

| ID | Question | Recommendation | Confidence |
|---|---|---|---|
| **D16** | Field architecture | `Field` is a **server-safe shell**: sync, calls `useId`, and renders the label and description from props. It wraps children in a tiny `'use client'` **`FieldScope`** leaf, which provides intra-compound context (allowed by r1 D10) and **renders the error slot**. In zero-JS function-child mode, `Field` renders the error itself. The controls are thin client leaves. Native constraint validation stays on; `invalid` is intercepted so messages render inline. Messages appear **on submit by default** (GOV.UK validation pattern), with `validateOn="blur"` as an option. One **error channel** is fixed: `error` prop > `Form errors[name]` > native message. The optional client `Form` adds errors-by-name, focus management and an error summary. RHF, TanStack Form and Conform are **docs recipes only**, with no dependencies. | High (architecture); medium (exact native-validation timing until browser-tested) |
| **D17** | Data table | Native `<table>` **server-safe parts in core**. A one-island **form-based selection** controller and a bulk-action bar in core. **Server-driven sort, filter and pagination through the URL** (`render` links). A **container-query Table↔List swap** that renders both presentations. **TanStack Table v9 and TanStack Virtual only in registry blocks**, never as npm dependencies. React Aria `Table` (role `grid`) is rejected for v1. | High |
| **D18** | Dates and time | Public values are **ISO plain-date strings** (`'2026-10-14'`). Internally, **`@internationalized/date` as an explicit dependency** of the date entries. **No Temporal polyfill**: Safari stable has not shipped Temporal, and BCD 8.1.5 says `preview`. Every "today" takes an explicit `timeZone`. The trigger is the deterministic SSR surface; the calendar renders client-only. Ship as **core `unstable` subpaths**, not an `@nizivo/dates` package. | High (types and placement); medium (library, because it follows D1) |
| **D19** | Command menu and hotkeys | **Own `CommandMenu` built on the engine.** With React Aria that is `Autocomplete` + `SearchField` + `Menu` inside `Modal`: **+4.7 KB gz** over the dashboard set. It lazy-loads on first ⌘K. **Reject cmdk**: no code change since 2025-08-03, and it always bundles Radix Dialog, a second engine. Hotkeys come from an **own module-level registry on `tinykeys` 4.0.1** (1.0 KB gz). | High |
| **D20** | Input family engine map | Textarea, password and prefix/suffix are native, with `field-sizing: content` and no JS autosize. **QuantityStepper** is native `type=number` plus an own 2-button leaf. **NumberField** (locale-formatted) uses the engine (RAC +9.8 KB). **Combobox** uses the engine (RAC +9.8 KB). **SearchField** is native `<search>` + `type=search`. | High |

**What changes for earlier documents.**
- **Inputs:** r3 put `Input` in T0 "native/server". This report makes every form control a **thin client leaf** so it can read `FieldScope`. The SSR HTML is still complete and works before hydration; the cost is hydration of a ~0.3 KB module (§2.2).
- **XField conveniences:** 02's `<TextField label … />` convenience and r8's "`SelectField` conveniences start in the registry" are both resolved by **not shipping XField wrappers in v1**. `Field` + control is two lines.
- **Command menu:** 06's "global hotkey registry" becomes a module store, not a provider (settled 8).
- **Dates:** 02's `@nizivo/dates` package is rejected in favour of subpaths (§4.8).

---

## 1. Evidence gathered today

### 1.1 Registry facts (PRIMARY, `registry.npmjs.org`, 2026-10-14)

| Package | `latest` (date) | Notes |
|---|---|---|
| react-hook-form | 7.90.0 (2026-10-11) | `8.0.0-beta.4` (2026-09-26) is on the `beta` tag; v8 has been in beta since 2025-12-07. Peer `react ^16.8 … ^19`. |
| @hookform/resolvers | 5.9.1 (2026-08-17) | Exposes `./standard-schema` and `./zod`. |
| @tanstack/react-form | 1.33.5 (2026-08-11) | `2.0.0-alpha.2` is on `alpha` (since 2026-08-10). `@tanstack/react-form-nextjs` 1.33.5 exists. |
| @conform-to/react | 1.21.2 (2026-10-11) | Ships `./future` (new `useForm`, `useControl`, field `id`/`descriptionId`/`errorId`/`ariaInvalid`/`ariaDescribedBy`; read from the installed `.d.ts`). |
| zod | 4.6.7 (2026-10-12) | `@standard-schema/spec` 1.1.0. |
| @tanstack/react-table / table-core | 9.3.1 (2026-10-12) | **9.0.0 stable on 2026-08-04.** Deps: `@tanstack/store`, `@tanstack/react-store`. Peer `react >=18`. |
| @tanstack/react-virtual | 3.14.19 (2026-10-13) | virtual-core 3.19.4 |
| cmdk | 1.1.1 (**2025-03-14**) | Deps: `@radix-ui/react-dialog`, `react-primitive`, `react-id`, `react-compose-refs`. |
| tinykeys | 4.0.1 (2026-09-25) | 4.0.0 on 2026-05-20. Zero dependencies, MIT, `sideEffects: false`. |
| @tanstack/react-hotkeys | 0.13.0 (2026-10-04) | Pre-1.0; first release 2026-02-10; depends on `@tanstack/react-store`. |
| react-hotkeys-hook | 5.3.3 (2026-06-26) | |
| @internationalized/date | 3.12.4 (2026-09-01) | Apache-2.0. Already a dependency of react-aria-components 1.22.1 (critique S-c). |
| date-fns / @date-fns/tz | 4.4.0 (2026-05-29) / 1.5.0 | `5.0.0-alpha.0` is on `next`. |
| temporal-polyfill | 1.0.6 (2026-10-13) | `@js-temporal/polyfill` 0.5.1 (2025-03-31). |
| @react-aria/autocomplete | 3.0.0-rc.8 (2026-05-28) | The hook package is still an RC. **RAC 1.22.1 exports `Autocomplete` without an `UNSTABLE_` prefix** (its `index.d.ts`; only the Toast names carry `UNSTABLE_`). |

### 1.2 Commit activity (PRIMARY, GitHub REST API)

- **dip/cmdk:**
  - The last commits are "Update README" (2025-10-29) and "fix styles for raycast preset" (2025-08-03). Before that come v1.1.1 and an IME fix (2025-03-14).
  - 76 open issues and PRs combined.
  - Paco Coursey announced the move to the `dip` org in Oct 2025 ([X post](https://x.com/pacocoursey/status/1983342409401688342)).
- **jamiebuilds/tinykeys:** 4.0.1 shipped 2026-09-25 ("Fix types for keybinding target"). 4.0.0 shipped 2026-05-20, with "Fix AltGraph support" and "Change default behavior for repeated events and composition input events". 6 open issues and PRs.

### 1.3 Platform data (PRIMARY: BCD 8.1.5, web-features 3.42.0, local files)

| Feature | Status | Support |
|---|---|---|
| **Temporal** (`javascript.builtins.Temporal`) | **Not Baseline** | Chrome/Edge 144, Firefox 139, **Safari `preview`, iOS Safari `false`**, Node 26.0.0, Deno 2.7 |
| `:user-invalid` / `:user-valid` (`user-pseudos`) | Widely, since 2026-05-02 | Chrome 119, Firefox 88, Safari 16.5 |
| Constraint validation API | Widely | |
| `field-sizing` | **Newly, since 2026-06-16** | Chrome 123, Firefox 152, Safari 26.2 |
| `<search>` element | Widely | Chrome 118, Firefox 118, Safari 17 |
| `content-visibility` | Newly, since 2025-09-15 | Safari 26 |
| `:has()` | Widely, since 2026-06-19 | |
| Container size queries | Widely | |
| `position: sticky` | Widely | |
| `overflow: clip` | Widely | |
| `Intl.DateTimeFormat#formatRange` | All engines | Chrome 76, Firefox 91, Safari 14.1 |
| `Intl.Locale#getWeekInfo` (`intl-locale-info`) | **Newly, since 2026-07-21** | Firefox 153 |
| `inputmode`, `enterkeyhint` | Widely | |
| `customizable-select` | Not Baseline | No Firefox |

**Temporal in Safari.** The WebKit change that sets `useTemporal` to `true` landed **2026-07-08** (WebKit bug 318885, PR #68930). Safari Technology Preview 249 notes "Added support for the `Temporal` object" ([BCD issue #30337](https://github.com/mdn/browser-compat-data/issues/30337)). The only Temporal item in the **Safari 27.0** feature post is an `Instant` bug fix ([WebKit Features for Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)). The [web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/temporal/) says Baseline has been "blocked since January 2026 by Safari". **This report predicts no Safari version.**

### 1.4 Local verifications (EMPIRICAL)

1. **`react@19.3.0` `react-server` build exports:** `Activity Children Fragment Profiler StrictMode Suspense ViewTransition cache cacheSignal captureOwnerStack cloneElement createElement createRef forwardRef isValidElement lazy memo use useCallback useDebugValue useId useMemo version`. This confirms `useId` (critique C27/S6). There are **no** `useState`, `useEffect` or `useContext` exports.
2. **React 19.3.0 delivers a child's `invalid` event to `onInvalid` and `onInvalidCapture` on the `<form>`.** A native capture listener on the form also sees it, with `bubbles=false`. Test: `tools/invalid-test.cjs` on jsdom 30.1.2. The native event does not bubble, but React's synthetic system dispatches it along the fiber path. A real-browser check belongs in the conformance suite.
3. **`<input type="hidden" required>`** reports `willValidate: false`, so it is barred from constraint validation (same test). A required custom control therefore needs a visually hidden **real** input or select, not `type=hidden`.
4. **React Aria's grid hooks set `role: 'grid'`.** This comes from a grep of the installed `react-aria` 3.53.1 dist (`useGrid`/`useTable` return `gridProps` with `role: 'grid'`; trees use `treegrid`).
5. **cmdk bundles Radix Dialog even when `Command.Dialog` is unused.** Metafile breakdown of `<Command><Command.Input/></Command>`: cmdk 11.4 K plus `react-remove-scroll`, `dismissable-layer`, `focus-scope`, `dialog`, `presence`, `slot` and more (minified bytes). The static-property compound defeats tree-shaking (r1 D5).
6. **Base UI 1.9.0 ships** `field`, `fieldset`, `form` (with an `errors` prop and `actionsRef.validate()`), `number-field`, `combobox`, `autocomplete` and `otp-field`. It has **no calendar or date picker** (installed package listing).
7. **CSS Containment 2 excludes internal table boxes** from layout containment ("if its principal box is an internal table box other than table-cell"), and `content-visibility` applies only where layout containment applies ([spec](https://www.w3.org/TR/css-contain-2/)). **`content-visibility: auto` on `<tr>`/`<tbody>` therefore does nothing.** It does work on the List presentation.

### 1.5 Bundle measurements (EMPIRICAL)

**Method.** Identical to r3: esbuild 0.25.10, `bundle + minify`, ESM, `production` condition, React and ReactDOM external, gzip level 9; brotli at quality 11. Scripts: `scratchpad/gapa/tools/measure.mjs` and `incr.mjs`. **The script reproduces r3's RAC dashboard baseline exactly (69.0 KB gz)**, so these numbers compare directly with r3's.

**A. Standalone usage cases** (KB). Each case imports only the parts it renders.

| Case | gz | br |
|---|---:|---:|
| RAC `TextField` + `Label` + `Input` + `Text` + `FieldError` | 11.3 | 10.2 |
| RAC `Form` + `TextField` | 11.4 | 10.3 |
| RAC `TextArea` in `TextField` | 11.2 | 10.2 |
| RAC `SearchField` | 18.5 | 16.7 |
| RAC `NumberField` | 25.9 | 23.1 |
| Base UI `NumberField` | 13.3 | 12.0 |
| RAC `ComboBox` (+`Popover`, `ListBox`, `FieldError`) | 61.0 | 52.6 |
| Base UI `Combobox` / `Autocomplete` | 50.8 / 49.1 | 44.8 / 43.4 |
| RAC `Autocomplete` + `SearchField` + `Menu` (inline) | 42.6 | 37.0 |
| **RAC command palette** (`DialogTrigger` + `ModalOverlay` + `Modal` + `Dialog` + `Autocomplete` + `SearchField` + `Menu` + `MenuSection`) | **50.6** | 43.7 |
| … + `Virtualizer` with `ListLayout` | 59.4 | 51.1 |
| RAC `Calendar` / `RangeCalendar` | 36.5 / 37.7 | 31.9 / 33.0 |
| RAC `DatePicker` (segmented `DateInput` + popover calendar) | 75.8 | 63.1 |
| RAC `DateRangePicker` (two `DateInput`s + `RangeCalendar`) | 77.0 | 64.0 |
| **Figma-shaped range picker** (button trigger + `Popover` + `Dialog` + presets `ListBox` + `RangeCalendar`, no `DateInput`) | **70.1** | 60.5 |
| RAC `Table` (static) | 56.9 | 48.5 |
| RAC `Table` + selection checkboxes + `Virtualizer`/`TableLayout` | 72.2 | 61.5 |
| Base UI `Field` + `Form` | 10.0 | 9.1 |
| TanStack Table v9 `useTable`, core only | 9.6 | 8.7 |
| TanStack Table v9 + `rowSortingFeature` (manual) + `rowSelectionFeature` | **12.9** | 11.7 |
| TanStack Table v9, client sort + filter + paginate + select | 17.0 | 15.4 |
| TanStack Table v9 `stockFeatures` (everything) | 26.6 | 23.5 |
| `@tanstack/react-virtual` (`useVirtualizer` + `useWindowVirtualizer`) | 8.3 | 7.6 |
| cmdk `Command` inline **and** `Command.Dialog` (identical, see §1.4 item 5) | 17.5 | 15.8 |
| **tinykeys 4.0.1** | **1.0** | 0.8 |
| `@tanstack/react-hotkeys` `useHotkey` | 6.7 | 6.0 |
| `@internationalized/date` calendar-math subset | 5.8 | 5.3 |
| date-fns 4.4 calendar subset + `@date-fns/tz` `TZDate` | 8.7 | 7.9 |
| temporal-polyfill 1.0.6 (ponyfill / global) | 19.3 / 20.1 | 17.4 / 18.1 |
| RHF `useForm` + `Controller` (consumer cost, for context) | 12.8 | 11.7 |
| TanStack Form `useForm` (consumer cost) | 17.3 | 15.3 |
| Conform v1 `useForm` + `getInputProps` / Conform `future` `useForm` | 9.0 / 13.0 | 8.0 / 11.7 |
| `zod/mini` small schema (consumer cost) | 4.9 | 4.5 |

The `zod` root entry measured **90.8 KB gz** in this harness even for `z.string()`, because it pulls `v4/core/compile.js` and `from-json-schema.js`. `zod/v4` measured 24.4. This is a consumer-side choice: Nizivo never depends on a schema library (§2.8). The cause of the root-entry weight is UNVERIFIED and worth a note in the docs recipe.

**B. Incremental cost over r3's RAC dashboard page.** The dashboard set is Modal, Dialog, Popover, Menu, Select, ListBox, Tabs and Tooltip, at 69.0 KB gz. As in r3, each module is pulled in with `export *` from its subpath.

| Added to the dashboard set | +KB gz |
|---|---:|
| `TextField`, `TextArea`, `FieldError`, `Form`, `Label`, `Input`, `Text` | +1.2 |
| `SearchField` | +2.4 |
| **`Autocomplete` + `SearchField`** (command palette; Modal and Menu are already present) | **+4.7** |
| `NumberField` | +9.8 |
| `ComboBox` | +9.8 |
| `Calendar` module (Calendar + RangeCalendar) | +21.4 |
| `DatePicker` + `DateField` + `Calendar` modules | +45.1 |
| `Table` | +29.0 |
| `Table` + `Virtualizer` (all four layouts) | +42.3 |
| Everything above together | +105.8 |

`export * from 'react-aria-components/Virtualizer'` pulls in every layout. The usage-based delta (table A, palette with and without `ListLayout`) is **+8.8 KB**.

---

## 2. Q1: Field architecture (D16)

### 2.1 Recommendation

One field system is shared by Input, Textarea, Select, Combobox, NumberField, Checkbox/Radio groups, Switch, FileUpload and DateRangePicker:

1. **`Field` (server-safe).** It is sync, so `useId` is allowed (§1.4 item 1); an `ids` override is always accepted. It renders the wrapper, `<label>` and description from **props**, and wraps `children` in `FieldScope`. It renders the error itself **only in function-child mode** (point 4).
2. **`FieldScope` (`'use client'`, about 0.5 KB, UNVERIFIED until built).** It is an intra-compound context, explicitly allowed by r1 D10 and settled 8 ("context only for wiring inside a compound"). It carries ids, `aria-describedby`, invalid, required, disabled, `name` and a `reportValidity` callback. It **renders the error slot**: the `error` prop, a `Form` error, or a native message. That is what lets native messages appear inline after hydration.
   - **Why a client leaf is required, not optional.** React 19.3 lets a Server Component render a client Context directly ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)). The core peer floor is `^19.2.0` (settled 9), so the provider must stay a client-component wrapper.
3. **Every Nizivo control is a thin client leaf.** It reads `use(FieldContext)` conditionally, so it also works without a Field. A control renders complete HTML on the server: the ids, `aria-*` and `name` are all in the SSR markup. **Before hydration, the form submits and native validation runs.** Hydration only adds inline messages and focus management.
4. **Zero-JS mode.** `children` can be a function `(control) => ReactNode`. Field then calls it on the server with the wiring props and renders **no** `FieldScope`. Inline native messages are unavailable in this mode; the browser's own bubbles show instead.
5. **One error channel.** The control shows `error` prop ?? `Form.errors[name]` ?? the native message, and `invalid` is true when any of them is present. RHF, TanStack Form, Conform, `useActionState` and plain server rendering all feed the `error` prop (or `Form errors`). Nizivo has no form-library dependency.
6. **Optional `Form` (client).** It handles:
   - server errors keyed by `name` (Base UI `Form errors` and RAC `Form validationErrors` are the prior art);
   - focus moving to the first invalid field after a server round-trip;
   - an optional `ErrorSummary`;
   - `onReset` cleanup.

   Without `Form`, every Field still works: native validation is inline, focus goes to the first invalid control, and errors arrive by prop.
7. **Other pieces.**
   - `Fieldset` (server-safe, native `<fieldset>`/`<legend>`) groups CheckboxGroup, RadioGroup and ChoiceCard groups.
   - `SubmitButton` is a separate client export reading `useFormStatus`, so `Button` stays server-safe (r1 §2.3).
   - `FormMessage` (server-safe) is the form-level message container.
8. **Third-party controls.** Rich text editors, maps and similar controls plug in through a public hook, `useFieldControl()`. It returns merged ids, aria props and `reportValidity`.

### 2.2 Anatomy and the RSC split

```
<Field>                       server-safe module (no directive)
 ├─ <div.nz-field data-slot="field" data-invalid? data-disabled? data-required? data-readonly?>
 │   ├─ <label.nz-field-label data-slot="field-label" id htmlFor>      ← from `label` prop
 │   ├─ <FieldScope …>        'use client' leaf: context + error slot
 │   │    ├─ children         ← Nizivo controls (client leaves) read FieldContext
 │   │    └─ <p.nz-field-error data-slot="field-error" id> icon + message   (rendered only when invalid)
 │   └─ <p.nz-field-description data-slot="field-description" id>      ← from `description` prop
```

The DOM order is **label, control, description, error**. Figma draws "Label / control / Help or Error". 02 found that Figma's error **replaces** the help text with a colour change only, which fails WCAG 1.4.1. This design keeps the description visible and adds the error, with an icon, below it. **Design should confirm the visual stacking.**

```tsx
// packages/core/src/field/field.tsx  (NO 'use client': server-safe, sync)
import { useId, type ReactNode } from 'react';
import { FieldScope } from './field-scope';            // 'use client' leaf
import type { RenderProp, ValidityKey } from '../_shared/types';

export interface FieldControlProps {                   // what a control (or a function child) receives
  id: string;
  name?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
}
export interface FieldState { invalid: boolean; disabled: boolean; required: boolean; readOnly: boolean }

export interface FieldProps {
  label: ReactNode;
  description?: ReactNode;
  /** Controlled error from any source: server action state, RHF, TanStack Form, Conform. */
  error?: ReactNode;
  /** Forces the invalid state without a message (rare; prefer `error`). */
  invalid?: boolean;
  /** Passed to the control, and used to look up `Form errors[name]`. */
  name?: string;
  required?: boolean; disabled?: boolean; readOnly?: boolean;
  /** Override generated ids. Conform's `fields.x.id/descriptionId/errorId` go here. */
  ids?: Partial<Record<'control' | 'label' | 'description' | 'error', string>>;
  /** Localized text for native constraint failures (the browser's validationMessage is in the BROWSER's UI language). */
  messages?: Partial<Record<ValidityKey, ReactNode>>;
  /** 'inline' (default): Nizivo shows native messages in the error slot. 'browser': keep browser bubbles. */
  validationDisplay?: 'inline' | 'browser';
  /** When native messages first appear. 'submit' (default, GOV.UK pattern) or 'blur' (:user-invalid timing). Also settable on <Form>. */
  validateOn?: 'submit' | 'blur';
  render?: RenderProp<'div', FieldState>;              // settled 1
  children: ReactNode | ((control: FieldControlProps) => ReactNode);
}

export function Field(props: FieldProps) {
  const base = useId();                                 // allowed: sync server-safe component (critique S6)
  const ids = {
    control: props.ids?.control ?? `${base}-control`,   // suffixing, never parsing (r1 §2.4)
    label: props.ids?.label ?? `${base}-label`,
    description: props.ids?.description ?? `${base}-description`,
    error: props.ids?.error ?? `${base}-error`,
  };
  const describedBy = props.description ? ids.description : undefined;   // error id appended by FieldScope when invalid
  const shell = { /* data-* from props; class nz-field; data-slot field */ };

  if (typeof props.children === 'function') {
    // Zero-JS mode: no FieldScope, no inline native messages. Only the `error` prop renders.
    const invalid = Boolean(props.error) || props.invalid;
    const control: FieldControlProps = {
      id: ids.control, name: props.name, required: props.required, disabled: props.disabled, readOnly: props.readOnly,
      'aria-invalid': invalid || undefined,
      'aria-describedby': [describedBy, props.error ? ids.error : null].filter(Boolean).join(' ') || undefined,
    };
    return renderShell(shell, props, ids, props.children(control), props.error && <p id={ids.error} data-slot="field-error" className="nz-field-error">{props.error}</p>);
  }
  return renderShell(shell, props, ids,
    <FieldScope ids={ids} describedBy={describedBy} name={props.name} error={props.error} invalid={props.invalid}
                required={props.required} disabled={props.disabled} readOnly={props.readOnly}
                messages={props.messages} validationDisplay={props.validationDisplay ?? 'inline'}
                validateOn={props.validateOn /* undefined → inherit from <Form>, else 'submit'; also rendered as data-validate-on on the shell */}>
      {props.children}
    </FieldScope>, null);
}
```

```tsx
// packages/core/src/field/field-scope.tsx
'use client';
import { createContext, use, useState, type ReactNode } from 'react';
import { FormContext } from '../form/form-context';

export const FieldContext = createContext<FieldContextValue | null>(null);

export function FieldScope(p: FieldScopeProps) {
  const form = use(FormContext);                         // optional: null without <Form>
  const [native, setNative] = useState<{ key: ValidityKey; message: string } | null>(null);
  const formError = p.name ? form?.errors?.[p.name] : undefined;
  const message = p.error ?? formError ?? (native && (p.messages?.[native.key] ?? native.message));
  const invalid = Boolean(message) || Boolean(p.invalid);
  const value: FieldContextValue = {
    ids: p.ids, name: p.name, invalid, required: p.required, disabled: p.disabled, readOnly: p.readOnly,
    describedBy: [p.describedBy, invalid && message ? p.ids.error : null].filter(Boolean).join(' ') || undefined,
    // Called by controls from their invalid/blur/input handlers:
    reportValidity: p.validationDisplay === 'inline' ? setNative : undefined,
  };
  return (
    <FieldContext value={value}>
      {p.children}
      {invalid && message ? (
        <p id={p.ids.error} className="nz-field-error" data-slot="field-error">
          <ErrorGlyph aria-hidden />{/* one of r6's ~10 inlined glyphs; no icon package (settled 7) */}
          {message}
        </p>
      ) : null}
    </FieldContext>
  );
}
```

```tsx
// packages/core/src/input/input.tsx: a thin client leaf. It owns the native validation hookup.
'use client';
import { use } from 'react';
import { FieldContext } from '../field/field-scope';
import { useNativeValidity } from '../form/use-native-validity';

export function Input({ ref, id, name, required, disabled, readOnly, prefix, suffix, size = 'md', render, ...rest }: InputProps) {
  const field = use(FieldContext);
  const validity = useNativeValidity(field);           // invalid/blur/input listeners → field.reportValidity
  const props = {
    id: id ?? field?.ids.control,
    name: name ?? field?.name,
    required: required ?? field?.required,
    disabled: disabled ?? field?.disabled,
    readOnly: readOnly ?? field?.readOnly,
    'aria-describedby': mergeIds(rest['aria-describedby'], field?.describedBy),
    'aria-invalid': rest['aria-invalid'] ?? (field?.invalid || undefined),
    'data-invalid': field?.invalid ? '' : undefined,
    ref: mergeRefs(ref, validity.ref),                  // ref lands on the native <input>: RHF register/setFocus work
    onInvalid: validity.onInvalid, onBlur: chain(rest.onBlur, validity.onBlur), onInput: chain(rest.onInput, validity.onInput),
    className: 'nz-input', 'data-slot': 'input', 'data-size': size,
  };
  return prefix || suffix ? <InputGroup prefix={prefix} suffix={suffix} size={size}>{renderEl('input', render, props)}</InputGroup> : renderEl('input', render, props);
}
```

### 2.3 Native constraint validation: what happens when

The policy is to keep native validation **on** and never set `noValidate`. The reasons:
- **Before hydration** the browser validates and shows its own bubbles. Server actions and progressive enhancement keep working.
- **After hydration** each control intercepts its own `invalid` event and calls `preventDefault()`, which suppresses the bubble. It then reports `{ key, validationMessage }` to `FieldScope`.

**Default timing: on submit.** The GOV.UK validation pattern says "Wait until they try to move to the next part of the service" and "Do not validate when the user moves away from a field" ([GOV.UK validation pattern](https://design-system.service.gov.uk/patterns/validation/)). Admin apps that want earlier feedback set `validateOn="blur"` on `Field` or `Form`. Field renders it as `data-validate-on`, so the CSS works before hydration.

| Moment | `validateOn="submit"` (default) | `validateOn="blur"` | Mechanism |
|---|---|---|---|
| Typing in an untouched field | Nothing | Nothing | No validation while the user is typing |
| Blur after changing the value | Nothing | Error **text and colour together** if the field matches `:user-invalid` | `onBlur`: `if (el.matches(':user-invalid')) report(el.validity)`. The browser's heuristic decides timing (`user-pseudos`, Widely) |
| Submit with invalid fields | All invalid fields show messages; focus moves to the first | Same | The browser fires `invalid` at each failing control **in tree order** and cancels submission, so React's `action` never runs. Each control `preventDefault()`s. The first handler in a validation pass focuses itself, through a module-level `WeakSet<HTMLFormElement>` cleared in a microtask. No `Form` is needed |
| Typing after an error is shown | The message **clears** as soon as the value becomes valid; new messages are not added mid-typing | Same | `onInput`: re-read `el.validity`; report `null` only when valid |
| Form reset | Native errors cleared | Same | `reset` listener on `el.form`; React 19.3 also fires `onReset` after a Server Action auto-reset ([19.3 changelog](https://react.dev/blog/2026/09/09/react-19-3)) |

**CSS.**
- `[data-invalid]` (a message is shown) is always styled.
- `:user-invalid` is styled **only under `[data-validate-on="blur"]`**. In that mode JS reveals the message on the same blur, so colour never appears without text after hydration. Before hydration, the colour can show on blur until submit brings up the browser bubble. That window is short and accepted.
- In the default submit mode, nothing turns red before a message exists.

```css
@layer nz.components {
  .nz-field { display: grid; gap: var(--nz-space-1-5); }
  .nz-field-label { font: var(--nz-font-label-m); color: var(--nz-text-primary); }
  .nz-field-description { font: var(--nz-font-body-m); color: var(--nz-text-secondary); } /* NOT text/tertiary: 4.31:1 fails AA (G19) */
  .nz-field-error { display: flex; gap: var(--nz-space-1-5); font: var(--nz-font-body-m); color: var(--nz-text-critical); }
  .nz-input[data-invalid],
  .nz-field[data-validate-on="blur"] .nz-input:user-invalid { border-color: var(--nz-border-critical); }
  .nz-input:focus-visible {                       /* settled 12 */
    outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px;
  }
  .nz-field[data-disabled] :is(.nz-field-label, .nz-field-description) { color: var(--nz-text-disabled); } /* Figma left disabled help undimmed */
}
```

**Token names in the CSS sketches.**
- Only the **`--nz-bg-*`, `--nz-text-*`, `--nz-border-*` (colour), `--nz-space-*` and `--nz-radius-*`** families are settled (settled 5, from the Figma codeSyntax).
- **Placeholders pending D5:** `--nz-font-label-m`, `--nz-font-body-m`, `--nz-border-width-default`, `--nz-border-width-focus` and `--nz-size-control-md`. Typography sub-variable names are still the critique's UNVERIFIED item S-b 1, and `border-width/default` is not among the width names 02 recorded (`strong`, `focus`).
- Do not copy these placeholder names into the plan as final.

**Precise meaning of the state attributes** (part of the vocabulary contract, settled 4):
- `data-invalid` means "an error message is currently presented". It does **not** mean "currently fails constraints"; that is `:invalid`, and it is true for empty required fields at load.
- `data-required`, `data-disabled` and `data-readonly` mirror the attributes.
- Plain `aria-invalid="true"` is set only together with `data-invalid`, never at initial render for an empty required field.

**Messages and i18n.** `validationMessage` is localized to the **browser** UI language, not the page's language. Field's `messages` prop maps `ValidityState` keys to text: `valueMissing`, `typeMismatch`, `patternMismatch`, `tooShort`, `tooLong`, `rangeUnderflow`, `rangeOverflow`, `stepMismatch`, `badInput` and `customError`. Base UI's `Field.Error match` is the prior art. Figma's lead is "Errors say what to do, not what went wrong", so authors should supply messages; the native text is only a fallback.

**Custom controls and form participation.** `type=hidden` cannot carry `required` (§1.4 item 3). Each custom value control therefore renders a **visually hidden native element**, either `<select>` or `<input>`, with `name`, `value` and `required`, plus `tabIndex={-1}` and `aria-hidden`. Its `invalid` event redirects focus to the visible trigger.
- **With React Aria:** its default `validationBehavior: 'native'` (installed `Form.d.ts`: `@default 'native'`) already does this for Select, ComboBox, NumberField and the date pickers. The adapter maps RAC's `isInvalid`/`validationErrors` render props into `field.reportValidity`, so messages render in Nizivo's slot and never in a second RAC `FieldError`.
- **With Base UI:** its `Field.Control` validity maps the same way.
- This mapping is part of the per-engine conformance suite (r3 §8).

**Reset contract** (G11 asks for one).
- Uncontrolled native controls reset natively.
- Uncontrolled custom controls listen to `reset` on `hiddenInput.form` and restore `defaultValue`.
- Controlled controls call `onValueChange(defaultValue, { reason: 'form-reset' })` and leave the decision to the owner. This uses r8 §6.8's `(value, details)` shape.
- All of them clear native error state.

### 2.4 React 19 actions: `useActionState`, `useFormStatus` and server errors

PRIMARY facts this design relies on:
- "After the `action` function succeeds, all uncontrolled field elements in the form are reset" ([react.dev `<form>`](https://react.dev/reference/react-dom/components/form)). **"Succeeds" includes an action that *returns* validation errors.** Without the fix below, users lose their input on a failed submit.
- React 19.3: `onReset` fires after the auto-reset (#35176); `submit` events include `submitter` (#35590); `defaultValue` for `type=number` now behaves like other inputs (#36980) ([19.3 post](https://react.dev/blog/2026/09/09/react-19-3)).
- Next's documented pattern is a client form, `useActionState(createUser, initialState)`, returning `{ errors }` from Zod `safeParse` ([Next forms guide](https://nextjs.org/docs/app/guides/forms), updated 2026-10-06). Next's sample still uses Zod 3's `error.flatten()`. With Zod 4, use `z.flattenError(error).fieldErrors`; the export was confirmed by the measurement build.

**Recipe.** Echo the submitted values back as `defaultValue`, so the auto-reset restores what the user typed. **UNVERIFIED:** the ordering of reset versus the `defaultValue` update in 19.3. It must be pinned by a Next fixture test before this recipe is published.

```ts
// app/products/actions.ts
'use server';
import * as z from 'zod';                                   // consumer's choice; Nizivo has no schema dependency
const Product = z.object({ title: z.string().min(1, 'Enter a product title'), price: z.coerce.number().positive('Enter a price above 0') });

export type ProductState = { fieldErrors?: Record<string, string[]>; formError?: string; values?: Record<string, string> };

export async function saveProduct(_prev: ProductState, formData: FormData): Promise<ProductState> {
  const values = Object.fromEntries(formData) as Record<string, string>;
  const parsed = Product.safeParse(values);
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values };
  try { await db.products.update(parsed.data); return {}; }
  catch { return { formError: 'We could not save the product. Try again.', values }; }
}
```

```tsx
// app/products/product-form.tsx
'use client';
import { useActionState } from 'react';
import { Form, Field, Input, SubmitButton, FormMessage } from '@nizivo/ui/form';   // placeholder package name
import { saveProduct, type ProductState } from './actions';

export function ProductForm() {
  const [state, action] = useActionState<ProductState, FormData>(saveProduct, {});
  return (
    <Form action={action} errors={state.fieldErrors}>      {/* errors keyed by name; first message shown */}
      <FormMessage tone="critical">{state.formError}</FormMessage>  {/* role="alert" container, always in DOM */}
      <Field name="title" label="Product title" description="Shown on product pages and checkout." required
             messages={{ valueMissing: 'Enter a product title' }}>
        <Input defaultValue={state.values?.title} />
      </Field>
      <Field name="price" label="Price" required>
        <Input inputMode="decimal" prefix="$" defaultValue={state.values?.price} />
      </Field>
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

`SubmitButton` (client) reads `useFormStatus()`. While pending it sets `data-pending` and `aria-disabled="true"`, swallows clicks, and keeps focus. **It does not use `disabled`**, because that drops focus and silences screen readers. `useFormStatus` "includes additional keys … like data, method, and action" in React 19 (Next guide).

**Zero-JS server form.** A pure Server Component page can render `<form action={serverFn}>` with Field function-children and native inputs; it ships no Nizivo JS. Errors after a submit come back through a re-render (redirect with search params, or cookie state). Only the browser bubbles report client-side constraint failures.

### 2.5 Error announcement policy

Pick **one announcement per path**, because focus plus a live region double-announces:

| Path | Announcement | Why |
|---|---|---|
| Client or native validation on submit | **Focus the first invalid control.** Its accessible description already contains the error through `aria-describedby` | Focus is the announcement; WCAG 3.3.1 is met by the text error |
| Blur reveals an error (only with `validateOn="blur"`) | Nothing extra; the text appears in place | Announcing on blur interrupts the next field's announcement |
| Server action returns field errors | **`Form` moves focus** to the first `[data-invalid]` control in DOM order, in an effect keyed on the `errors` object identity. Long forms can opt into **`ErrorSummary`**, which receives focus and links to each field. GOV.UK: "move keyboard focus to the error summary" and "link the errors in the error summary to the answer they relate to" ([GOV.UK error summary](https://design-system.service.gov.uk/components/error-summary/)) | Focus cannot stay where it was: the submit button's context is stale |
| Form-level error (network, auth, conflict) | `FormMessage tone="critical"` is a `role="alert"` container **present in the DOM from first render** and filled on change | WCAG technique ARIA19: the live container must exist before the content changes ([W3C ARIA19](https://www.w3.org/TR/WCAG20-TECHS/ARIA19.html)) |
| Async field validation (e.g. "handle taken") where focus has moved on | A polite `role="status"` inside the field's error slot | Focus cannot move without disrupting the user |
| Success | `FormMessage tone="success"` as `role="status"` | |

- **Use `aria-describedby`, not `aria-errormessage`.** Support for `aria-errormessage` is still partial: a11ysupport.io rates it 18/22, and VoiceOver on macOS fails it ([a11ysupport](https://a11ysupport.io/tech/aria/aria-errormessage_attribute); [ark#4150](https://github.com/chakra-ui/ark/issues/4150); [w3c/aria#2048](https://github.com/w3c/aria/issues/2048) discusses deprecating it). Conform takes the same approach (`ariaDescribedBy` contains the error id when invalid).
- **Groups.** `Fieldset` puts `aria-describedby` on the `<fieldset>`. Screen-reader support for group descriptions varies (UNVERIFIED per reader), so the first control in the group also gets the error id when the group is invalid.

### 2.6 Is Field server-safe?

**Yes, with three conditions.**
1. `Field` must stay a **sync** function component. React bars `useId` only in **async** Server Components ([useId](https://react.dev/reference/react/useId)). An app's async page can render `<Field>`, because `Field` itself is sync.
2. Never parse or style by id. The id format changed in 19.0, 19.1 and 19.2 (r1 §2.4). Suffixing (`${base}-error`) is fine.
3. The server-safe module may import the `'use client'` `FieldScope` but never call `useState` or read context. Under `react-server` those are not exported (§1.4 item 1).

`cloneElement` is also exported under `react-server`. **It is not used.** That would be the Slot pattern the critique rejected in C3, and it breaks the moment a consumer wraps the control. Astro islands get distinct ids because `@astrojs/react` 7.0.1 passes a per-island `identifierPrefix` (r1, verified).

### 2.7 Library interop: what each library needs, and the recipes

Nizivo ships **no adapter packages**. These are documentation recipes, typed against RHF **7.x**, TanStack Form **1.x** and Conform **1.21**. RHF 8 is in beta and TanStack Form 2 in alpha (§1.1); the recipes say so, and Renovate (r4) will flag the majors.

| Requirement | RHF 7.90 | TanStack Form 1.33 | Conform 1.21 (`future`) | Plain React 19 action |
|---|---|---|---|---|
| `ref` to the **focusable** element | **Yes.** `register().ref` and `Controller` `field.ref` drive `shouldFocusError` and `setFocus` (types: `RefCallBack`) | No | No (DOM-driven; `focusFirstInvalidField`) | No (`Form` handles it) |
| Native `name` + DOM value | `register` (uncontrolled) | Optional | **Yes.** It reads `FormData`; custom controls go through `useControl().register(baseInput)` | Yes |
| Change and blur | `onChange(event)` / `onBlur`; `Controller` takes `onChange(value)` | `field.handleChange(value)`, `field.handleBlur()` | Form-level `handleInput`/`handleBlur` | — |
| Ids | Library has none; Field generates them | Library has none | **Library generates `id`, `descriptionId`, `errorId`**, so Field's `ids` must be overridable | Field |
| Error shape | `errors.x?.message` (string) | `field.state.meta.errors`: strings **or Standard Schema issue objects** | `fields.x.errors` (`string[]` by default) | `fieldErrors[name][]` |
| Schema | `@hookform/resolvers/standard-schema` | Standard Schema validators directly | Standard Schema (`configureForms` default `BaseSchema = StandardSchemaV1`) | Any, on the server |
| Native validation | Usually off (`noValidate`, or omit `required`) | Usually off | Can keep `constraint` attributes | **On** |

**Requirements on Nizivo controls that fall out of this table:**
- `ref` must reach the focusable element: the native input, or the trigger button for Select.
- Every value control takes `name`, `value`/`defaultValue`, `onValueChange(value, details)`, `onBlur` and `disabled`.
- Field takes `ids` and `error`.
- A control never requires a Nizivo `Form`.

```tsx
// RHF 7.x: uncontrolled native input + Controller for a custom control
'use client';
import { useForm, Controller } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';

const { register, control, handleSubmit, formState: { errors } } = useForm({ resolver: standardSchemaResolver(Product) });
<form onSubmit={handleSubmit(onValid)} noValidate>
  <Field label="Product title" error={errors.title?.message}>
    <Input {...register('title')} />                                {/* ref → native input */}
  </Field>
  <Controller control={control} name="status" render={({ field, fieldState }) => (
    <Field label="Status" error={fieldState.error?.message}>
      <Select name={field.name} value={field.value} onValueChange={(v) => field.onChange(v)}
              onBlur={field.onBlur} ref={field.ref} disabled={field.disabled}>…</Select>  {/* ref → trigger button */}
    </Field>
  )} />
</form>
```

```tsx
// TanStack Form 1.x: errors may be Standard Schema issues, so normalize to text
const message = (errors: unknown[]) => errors.map((e) => (typeof e === 'string' ? e : (e as { message?: string })?.message)).filter(Boolean)[0];
<form.Field name="title" validators={{ onBlur: Product.shape.title }}>
  {(f) => (
    <Field label="Product title" name={f.name} error={f.state.meta.isTouched ? message(f.state.meta.errors) : undefined}>
      <Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} onBlur={f.handleBlur} />
    </Field>
  )}
</form.Field>
// Next.js server actions: @tanstack/react-form-nextjs (createServerValidate, ServerValidateError, formOptions; client mergeForm/useTransform).
// The server half is per the official SSR guide; the client helper names come from a community page (UNVERIFIED until checked against the
// "Next Server Actions" example): https://tanstack.com/form/latest/docs/framework/react/guides/ssr
```

```tsx
// Conform 1.21 `future` API: pass Conform's ids through, so there are no duplicate id systems
import { useForm } from '@conform-to/react/future';
const { form, fields } = useForm(Product, { lastResult: state, shouldValidate: 'onBlur' });
<form {...form.props} action={action}>
  <Field label="Product title" name={fields.title.name} error={fields.title.errors?.[0]}
         ids={{ control: fields.title.id, description: fields.title.descriptionId, error: fields.title.errorId }}>
    <Input defaultValue={fields.title.defaultValue} />
  </Field>
</form>
// Custom controls: Conform's useControl({ defaultValue }) registers a native base input; Nizivo's hidden native element is that base.
```

### 2.8 Rejected alternatives

| Alternative | Why rejected |
|---|---|
| **Field injects props with `cloneElement`** (Slot style) | It is the C3-rejected pattern, limited to a single direct child, and it breaks when the control is wrapped. |
| **Field fully client** (Base UI / RAC style) | It works, but it loses server rendering of the label, description and error, and with it the zero-JS function-child mode. It also moves `useId` to the client for no gain. |
| **Field fully server-safe, inputs server-safe, no context** | Every consumer would have to thread ids by hand (`<Input id=… aria-describedby=…>`), or no native messages could render inline. Kept only as the opt-in function-child mode. |
| **`noValidate` + JS-only validation** | Loses progressive enhancement before hydration and duplicates browser logic. RAC's default is also `native`. |
| **Hard adapters** (`@nizivo/react-hook-form` etc.) | Each one is a trusted-publisher entry (r4), a versioning coupling to libraries mid-major (RHF 8 beta, TanStack Form 2 alpha), and unnecessary when a recipe is 5 lines. |
| **Base UI `Form`/`Field` as the field engine** | It ties Field to one engine; Field is engine-independent and costs about 0 KB of engine code. The engine adapter only maps validity. |
| **`aria-errormessage`** | Partial screen-reader support (§2.5). |
| **XField wrappers in v1** (`TextField`, `SelectField`) | Ownership was contested (02 core vs r8 registry). Two-line composition is enough; they can be registry snippets later. |

### 2.9 Risks

1. **Native-validation timing differs by browser.** `:user-invalid` heuristics differ, and Safari has had quirks around `invalid` and focus. Mitigation: Playwright conformance across chromium, firefox and webkit for submit, blur, fix and reset sequences.
2. **The auto-reset versus `defaultValue` echo ordering** (§2.4) is UNVERIFIED. If it fails, the recipe falls back to `key={state.version}` remounting or to controlled fields.
3. **Engine validity mapping.** RAC's validation state must not render a second error. A conformance test asserts exactly one `[data-slot=field-error]`.
4. **Every control becomes a client leaf.** Measure hydration cost on the 500-row bench (r5). If it is material, the Table uses the selection-island pattern in §3.5, which has no per-row islands.
5. **`Form` errors keyed by `name`** need a convention for nested names (`items.0.title`). Adopt Conform's dot/bracket path syntax as the documented key format.

---

## 3. Q2: Data table (D17)

### 3.1 Recommendation and package placement

| Layer | What | Where | JS |
|---|---|---|---|
| **Table parts** | `TableContainer`, `TableRoot`, `TableCaption`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableRowHeader`, `TableCell`, `TableSortButton`, `TableRowLink`, `TableEmpty`, `TableSkeletonRows` | **core** `/table`, server-safe | 0 |
| **Selection** | `TableSelection` (one client island per table, event delegation), `TableSelectAll`, `TableSelectRow`, `useTableSelection()` | core `/table`, client leaves | Small (UNVERIFIED until built; target ≤ 1.5 KB) |
| **Bulk actions** | `BulkActionBar` (client), select-all-matching affordance | core `/table` | Small |
| **Responsive** | `DataView` (Table↔List by container query) and `List`/`ListItem` parts | core `/data-view`, server-safe | 0 |
| **Client data engine** | TanStack Table v9 wiring: column defs → Nizivo parts, sorting, filtering, selection, pagination, URL state | **Registry blocks** `data-table`, `data-table-virtual` (r8 L4, consumer-owned) | TanStack 12.9–17.0 KB, in the **app** |
| **Domain presets** | `OrdersTable`/`OrderList`, `ProductTable` | Registry patterns (C12 verdict) | — |

**Why TanStack Table is never an npm dependency of Nizivo.**
- v9 is 9.6 KB core and 12.9 KB with sorting and selection. It pulls `@tanstack/store` and `@tanstack/react-store` and is two months old as a stable major (9.0.0 on 2026-08-04).
- Data-table needs are app-specific: server or client processing, column pinning, grouping.
- The registry gives consumers TanStack wired to Nizivo parts, and they own the glue. Core stays engine-free, and a v10 or a switch to AG Grid or MUI X costs Nizivo nothing.
- This is the plug-in/plug-out goal applied to data.

### 3.2 Engine comparison

| | **Native `<table>` + own parts** (chosen) | **React Aria `Table`** | **TanStack Table v9** (headless) |
|---|---|---|---|
| Role | `table` | **`grid`** (§1.4 item 4) | None (it's state) |
| Server Components | **Yes**, zero JS | No: client, `client-only` import | No (hook) |
| Size | 0 + selection island | **56.9 KB gz** standalone; **+29.0** over the dashboard set; 72.2 with selection + `Virtualizer` | 9.6–17.0 KB (+ rendering = our parts) |
| Keyboard | Tab through interactive cells (checkbox, link, menu) | Arrow keys cell to cell; one tab stop | n/a |
| Sorting/selection state | URL (server) or TanStack (client) | Built in (`sortDescriptor`, `selectionMode`) | Built in |
| Virtualization | Spacer rows + TanStack Virtual (registry) | `Virtualizer` + `TableLayout` | Pairs with TanStack Virtual |
| Column resizing | CSS `table-layout: fixed` widths; resizing via registry | `ResizableTableContainer` | `columnResizingFeature` |
| Plug-out cost | None | Engine-locked | Consumer-owned |

### 3.3 Semantics: `table`, not `grid`

- **The Figma tables are data with a few controls per row:** a checkbox, a row link, a "More" menu, status badges (05, 08). APG's grid pattern is for spreadsheet-like widgets. Adrian Roselli's guidance is not to turn a table into a grid just for a clickable row ([Roselli 2023](https://adrianroselli.com/2023/11/dont-turn-a-table-into-an-aria-grid-just-for-a-clickable-row.html)).
- **Native semantics give** row and column header navigation (Ctrl+Alt+arrows in screen readers), `aria-sort`, captions and zero JS.
- **Grid costs:** 29 KB extra, every cell becomes client-rendered, and authors must manage cell focus.
- **The tab-stop problem** (2–3 tab stops per row) is solved with pagination (the Figma design has `Pagination`), plus a "Skip to pagination" link for long pages.
- **Rules.**
  - The primary column (product name, order number) is `<th scope="row">`.
  - The row link is a **stretched link** in that cell (`::after { inset: 0 }` on a positioned row), never `onClick` on `<tr>` or `role="link"` (06, 08).
  - Row checkboxes are labelled "Select {row name}".
  - Do not set `aria-selected` on `<tr>` in a `table` (it is defined for `grid`/`treegrid` rows). Use `data-selected` for styling and the checkbox for state.

### 3.4 Parts sketch

```tsx
// Server Component page: zero client JS except the selection island and the row menus
import { TableContainer, TableRoot, TableCaption, TableHeader, TableBody, TableRow, TableHead,
         TableRowHeader, TableCell, TableSortButton, TableRowLink, TableSelection, TableSelectAll,
         TableSelectRow, BulkActionBar } from '@nizivo/ui/table';
import Link from 'next/link';

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const q = parseOrderQuery(await searchParams);                 // { sort: 'total', dir: 'descending', page: 2, status: 'unfulfilled' }
  const { rows, total } = await db.orders.list(q);
  const sortProps = (col: string) => ({
    sort: q.sort === col ? q.dir : ('none' as const),                       // → aria-sort + data-sort on <th>
    href: withQuery(q, { sort: col, dir: q.sort === col && q.dir === 'ascending' ? 'descending' : 'ascending', page: 1 }),
  });
  return (
    <TableSelection total={total} label="orders">              {/* 'use client' island; server children pass through */}
      <BulkActionBar>{/* actions get selection.ids or { mode: 'all', except, query } */}</BulkActionBar>
      <form id="bulk" action={bulkUpdate} />
      <TableContainer stickyHeader scroll="x" label="Orders">
        <TableRoot layout="fixed" size="md">
          <TableCaption className="nz-visually-hidden">Orders, sorted by {q.sort}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead width="44px"><TableSelectAll /></TableHead>
              <TableHead width="90px" {...pick(sortProps('number'), 'sort')}>
                <TableSortButton render={<Link href={sortProps('number').href} />}>Order</TableSortButton>
              </TableHead>
              <TableHead>Customer</TableHead>
              <TableHead align="end" width="90px" {...pick(sortProps('total'), 'sort')}>
                <TableSortButton render={<Link href={sortProps('total').href} />}>Total</TableSortButton>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={o.id} interactive>
                <TableCell><TableSelectRow value={o.id} form="bulk" label={`Select order ${o.number}`} /></TableCell>
                <TableRowHeader><TableRowLink render={<Link href={`/orders/${o.id}`} />}>#{o.number}</TableRowLink></TableRowHeader>
                <TableCell>{o.customer}</TableCell>
                <TableCell numeric>{formatMoney(o.total, { locale: 'en-GB', currency: 'GBP' })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </TableRoot>
      </TableContainer>
    </TableSelection>
  );
}
```

Rendered contract (stable classes and `data-slot`, settled 4):

```html
<div class="nz-table-container" data-slot="table-container" data-sticky-header data-scroll="x" role="region" aria-label="Orders" tabindex="0">
  <table class="nz-table" data-slot="table" data-size="md" data-layout="fixed">
    <thead class="nz-table-header" data-slot="table-header"><tr class="nz-table-row" data-slot="table-row">
      <th class="nz-table-head" data-slot="table-head" scope="col" aria-sort="descending" data-sort="descending">
        <a class="nz-table-sort-button" data-slot="table-sort-button" href="?sort=total&dir=ascending">Total<svg aria-hidden="true">…</svg></a>
      </th>…
    <tbody>…<tr class="nz-table-row" data-slot="table-row" data-interactive data-selected>…
```

`role="region"`, `tabindex="0"` and the label are added only when `scroll` is set. Chrome 130+ makes scrollers without focusable children keyboard-focusable by default ([Chrome blog](https://developer.chrome.com/blog/keyboard-focusable-scrollers)), but Safari and Firefox need the explicit `tabindex`. axe's `scrollable-region-focusable` rule checks this.

### 3.5 Server-driven sorting, filtering and pagination

- **State lives in the URL.** Every sort header, filter chip and pagination link is an `href`. Through `render={<Link/>}` (settled 1 and 8) this is **zero-JS, shareable, back-button-correct and RSC-native**.
- **Filters:** a `<search><form method="get">` with a SearchField, ChipGroup and Select submits to the same URL with no JS. With JS, the registry block upgrades to debounced `router.replace` with `useTransition` and `useDeferredValue`. That code is framework-specific, so it lives in the registry, not core.
- **Sorting:** `aria-sort` only on the currently sorted `<th>`. The control's accessible name is the column name; the direction comes from `aria-sort`. The decorative chevron is `aria-hidden`.
- **Client-side tables** (TanStack in the registry block): the same `TableSortButton` with its default `<button>` render calls `column.getToggleSortingHandler()`.
- **Empty and loading states:** `TableEmpty` (a full-width `colSpan` cell holding an `EmptyState`) and `TableSkeletonRows count={n}` (Skeleton mirrors the column widths, G20).

### 3.6 Selection and the bulk-action bar

Row checkboxes are **native, server-rendered `<input type="checkbox" name="ids" value={id} form="bulk">`**. One `TableSelection` client island (event delegation on its subtree) adds:

- **Tri-state select-all.** Header `TableSelectAll` sets the native `indeterminate` property in an effect (the r3 T0 note) and toggles the page.
- **Shift-click range** selection.
- **A live count** in the `BulkActionBar`: `role="status"` text such as "3 orders selected", announced politely and debounced.
- **Select all matching.** After "select all on page", the bar offers "Select all 1,240 orders" (the Gmail pattern). The selection becomes `{ mode: 'all', except, total }`.
- **Escape** clears the selection when focus is inside the table.

```ts
export type TableSelectionState =
  | { mode: 'some'; ids: ReadonlySet<string> }
  | { mode: 'all'; except: ReadonlySet<string>; total: number };   // bulk action receives the current query, not 1,240 ids
```

**Why form-based selection.**
- **Progressive enhancement:** select rows, press a bulk action, and the `ids` arrive in `FormData` at the server action, even before hydration.
- **No per-row hydration:** 500 rows mean one island, not 500.
- **TanStack users** pass `checked`/`onCheckedChange` on `TableSelectRow` instead (controlled mode).

**BulkActionBar a11y.** It is a labelled group with a `role="status"` count. It is **not** `role="toolbar"` unless it implements APG roving focus. It never steals focus when it appears. On mobile it is a sticky bottom bar with `padding-block-end: env(safe-area-inset-bottom)` (M-B #26). Visibility can also be CSS-only before hydration: `.nz-table-scope:has([data-slot=table-select-row]:checked) .nz-bulk-action-bar { display: flex }` (`:has()` is Widely Baseline).

### 3.7 Large data: pagination first, virtualization opt-in

1. **Default: pagination.** Figma has `Pagination`, and r5's bench row count is 500. 25/50/100 rows per page need nothing else.
2. **`content-visibility: auto` does not help native tables.** The spec excludes internal table boxes (§1.4 item 7). Apply it to the **List** presentation's items (`contain-intrinsic-size: auto 72px`), where it works (Newly Baseline 2025-09-15).
3. **Virtualization** is the `data-table-virtual` registry block using `@tanstack/react-virtual` (8.3 KB gz):
   - **Spacer rows, not absolute positioning.** TanStack's own table guide turns `<table>`/`<tr>` into grid and flex with absolutely positioned rows ([TanStack virtualization guide](https://tanstack.com/table/latest/docs/framework/react/guide/virtualization)). Display changes no longer strip table semantics in current engines, except `display: contents` ([Roselli 2018, updated 2023](https://adrianroselli.com/2018/02/tables-css-display-properties-and-aria.html)). But it gives up native column sizing and any CSS that relies on table layout. Spacer rows keep both.
   - **`table-layout: fixed` with explicit widths is mandatory.** Auto layout would re-measure columns as different rows mount. Figma already uses fixed px columns (340/120/160/100).
   - **`aria-rowcount` on `<table>`** and `aria-rowindex` on rendered rows. Screen-reader behaviour of `aria-rowcount` on a native table is **UNVERIFIED**; add it to r5's NVDA and VoiceOver scripts.

```tsx
const v = useVirtualizer({ count: rows.length, getScrollElement: () => scrollRef.current, estimateSize: () => 56, overscan: 8 });
const items = v.getVirtualItems();
const padTop = items[0]?.start ?? 0;
const padBottom = v.getTotalSize() - (items.at(-1)?.end ?? 0);
<TableContainer ref={scrollRef} scroll="both" maxHeight="70dvh" stickyHeader label="Products">
  <TableRoot layout="fixed" aria-rowcount={rows.length + 1}>
    <TableHeader>{/* aria-rowindex={1} */}</TableHeader>
    <TableBody>
      {padTop > 0 && <tr aria-hidden="true" data-slot="table-spacer"><td colSpan={cols} style={{ height: padTop }} /></tr>}
      {items.map((it) => (
        <TableRow key={rows[it.index].id} ref={v.measureElement} data-index={it.index} aria-rowindex={it.index + 2}>…</TableRow>
      ))}
      {padBottom > 0 && <tr aria-hidden="true" data-slot="table-spacer"><td colSpan={cols} style={{ height: padBottom }} /></tr>}
    </TableBody>
  </TableRoot>
</TableContainer>
```

### 3.8 Responsive Table↔List swap (08 §6.3)

**Requirement.** Recent Orders is a table on desktop and tablet and an **Order List Item** list on mobile. CSS reflow cannot produce that (08).

**Choice: render both presentations and switch with a container query.** It is the only option that is **SSR-deterministic**: no JS width measurement, so no hydration mismatch and no layout shift.

```tsx
<DataView collapseBelow="sm"                                   // 'sm' = 40rem, the designer's 640px (settled 11)
  table={<OrdersTable rows={rows} />}
  list={<OrderList rows={rows} />} />
```

```css
@layer nz.components {
  .nz-data-view { container: nz-data-view / inline-size; }
  .nz-data-view > [data-slot="data-view-list"] { display: none; }
  @container nz-data-view (width < 40rem) {          /* container conditions cannot use var(); the threshold is a fixed class of variants */
    .nz-data-view[data-collapse="sm"] > [data-slot="data-view-table"] { display: none; }
    .nz-data-view[data-collapse="sm"] > [data-slot="data-view-list"]  { display: block; }
  }
  .nz-list-item { content-visibility: auto; contain-intrinsic-size: auto 72px; }  /* works here, not on <tr> */
}
```

**Costs and rules.**
1. **The HTML doubles per row**, so use DataView for paginated sets (≤ 100 rows). `display: none` already removes the hidden presentation from the accessibility tree and the tab order, so no `aria-hidden` is needed.
2. **Form-control trap.** Controls inside a `display: none` subtree **are still submitted** with their form. The hidden presentation must not contain named controls; a dev-mode check warns when both slots do. In the Figma design the mobile Order List Item has no checkbox, so selection is table-only. A mobile selection mode is a design question.
3. **Container, not viewport.** The same table inside a narrow drawer or split pane also collapses. Only `sm` is designer-backed (C11); `md`/`lg` variants wait for design.
4. **Rejected options:**
   - restyling `<tr>` as cards (`display: block`): tables lose column-header association in the card view, and the Figma list item has a different information order;
   - a JS `useContainerWidth` (hydration mismatch plus CLS);
   - user-agent sniffing.

### 3.9 Sticky header and horizontal scroll

```css
@layer nz.components {
  .nz-table { border-collapse: separate; border-spacing: 0; inline-size: 100%; }   /* collapse would drop the sticky header's borders */
  .nz-table[data-layout="fixed"] { table-layout: fixed; }
  .nz-table-cell, .nz-table-head { border-block-end: var(--nz-border-width-default) solid var(--nz-border-subtle); padding: var(--nz-space-3) var(--nz-space-5); }
  .nz-table-cell[data-numeric] { text-align: end; font-variant-numeric: tabular-nums; }
  .nz-table-container[data-sticky-header] .nz-table-header .nz-table-head {
    position: sticky; inset-block-start: var(--nz-table-sticky-offset, 0px); z-index: 1;
    background: var(--nz-bg-surface); box-shadow: inset 0 -1px 0 var(--nz-border-subtle);
  }
  .nz-table-row[data-interactive]:hover { background: var(--nz-bg-hover); }
  .nz-table-row[data-selected] { background: var(--nz-bg-brand-subtle); }
  .nz-table-container[data-scroll="x"] { overflow-x: auto; }
  .nz-table-container[data-scroll="both"] { overflow: auto; max-block-size: var(--nz-table-max-height); }
}
```

**The real constraint.** A horizontal-scroll wrapper (`overflow-x: auto`) is a scroll container on both axes. A sticky header then sticks to the **wrapper**, not the page. So:
- page-level sticky works only when the wrapper does not scroll (`scroll="none"`, with `overflow: clip` if needed);
- in-wrapper sticky works with `scroll="both"` and a max height;
- on narrow containers, the List swap removes the need for horizontal scroll.

`--nz-table-sticky-offset` lets an app clear its sticky top bar (Figma `size/topbar`).

### 3.10 Rejected alternatives and risks

**Rejected:**
- React Aria `Table` (grid semantics, +29 KB, all-client).
- TanStack Table as a core dependency (version coupling, app-specific).
- AG Grid or MUI X as a core option (heavy, licensed tiers); a consumer can still use them through the registry pattern.
- Per-row client checkboxes (hydration cost).
- CSS card-mode tables.

**Risks:**
1. The `aria-rowcount` screen-reader behaviour on native tables (UNVERIFIED).
2. The dual-render form-control trap (mitigated by the dev check and documentation).
3. TanStack v9 is two months into stable with frequent patches (9.2.5 → 9.3.1 in 8 days). Registry blocks pin a caret range, and Renovate watches them.
4. Row-link stretched `::after` conflicts with the row's other interactive cells. Those cells need `position: relative; z-index: 1`, which is part of the CSS contract.
5. The bulk "select all matching" needs a server contract (query replay). The registry block documents it.

---

## 4. Q3: Dates and time (D18)

### 4.1 Recommendation

1. **Public value type: ISO 8601 plain-date strings**, `'YYYY-MM-DD'`, the shape of `Temporal.PlainDate.prototype.toString()`. Ranges are `{ start, end }`, inclusive. **Never `Date`.**
   - The main reason is time-zone ambiguity: a `Date` is an instant, and "Oct 7" means different instants in London and Mumbai.
   - Strings are also trivially RSC-serializable, form-submittable through hidden inputs, URL-friendly and engine-independent. React Flight does serialize `Date`, so serialization alone is not the argument.
   - Class instances such as `CalendarDate` cannot cross the server→client boundary as props.
2. **Internals: `@internationalized/date` 3.12.4.** It is 5.8 KB gz for a calendar-math subset. It has non-Gregorian calendars, locale-aware week start, `toZoned` with DST-correct disambiguation, and is Apache-2.0.
   - It must be declared as an **explicit `dependency`** of the date entries. If D1 later swaps to Base UI, whose optional peer is `date-fns`, the date entries must not lose their library silently.
   - With React Aria it is already in the tree through RAC (registry), so its marginal install and bundle cost is about 0.
3. **No Temporal polyfill.** Safari stable has not shipped Temporal: BCD 8.1.5 says `safari: "preview"` and iOS Safari `false`. `temporal-polyfill` costs **19.3 KB gz**, 3.3× the `@internationalized/date` subset.
   - Since the public type is the PlainDate string, swapping the internals to native Temporal later is a **patch release**.
   - **Gate for the swap:** `web-features` marks `temporal` Baseline, and the measured saving is positive.
4. **Engine.**
   - **With React Aria:** `RangeCalendar` inside the existing Popover/Dialog. The Figma-shaped picker costs 70.1 KB gz standalone, or **+21.4 KB** for the Calendar module over the dashboard set.
   - **With Base UI:** there is no calendar (§1.4 item 6), so we would build our own grid on `@internationalized/date`. **This is a D1 input.**
   - The adapter seam is unchanged either way.
5. **Placement:** core subpaths `@nizivo/ui/unstable/calendar` and `@nizivo/ui/unstable/date-range-picker` (r8 §5.3 "unstable" lane). Promote them when design delivers the Day-cell states (G9).

### 4.2 Library comparison (sizes from §1.5)

| Option | Size (gz) | Time zones | Non-Gregorian | Week start | Fit |
|---|---:|---|---|---|---|
| **`@internationalized/date`** | 5.8 (subset) | `toZoned`, `getLocalTimeZone`, `now(tz)` | Yes (`createCalendar`) | `startOfWeek(date, locale, firstDayOfWeek?)` | **Chosen.** Free with RAC; RAC calendars take its types |
| date-fns 4.4 + `@date-fns/tz` | 8.7 | `TZDate` | No | `weekStartsOn` option | Base UI's optional peer. Fine if D1 = Base UI, but it is the `Date`-object model |
| temporal-polyfill 1.0.6 | 19.3 | Full | Full | Via `Intl` | The future API, but 19.3 KB for every Safari user today |
| Native Temporal | 0 | Full | Full | — | Not in Safari or iOS (BCD) |
| Plain `Intl` + own math | ~1–2 (UNVERIFIED) | No arithmetic | No | `getWeekInfo` (Newly 2026-07-21; Firefox 153) | Too thin for range math with DST |

### 4.3 Types and helpers (engine-free, public)

```ts
// @nizivo/ui/unstable/date-range-picker  (types only; no engine types in public .d.ts, r3 §8)
/** ISO 8601 calendar date, e.g. '2026-10-14'. Temporal.PlainDate#toString() shape. */
export type IsoDate = string;
export interface DateRange { start: IsoDate; end: IsoDate }            // inclusive

/** Serializable presets: RSC-safe (functions cannot cross server→client). */
export type DatePreset =
  | { id: string; label: string; kind: 'last'; days: number; includeToday?: boolean }   // "Last 7 days"
  | { id: string; label: string; kind: 'to-date'; unit: 'week' | 'month' | 'quarter' | 'year' } // "Year to date"
  | { id: string; label: string; kind: 'previous'; unit: 'day' | 'week' | 'month' | 'quarter' | 'year' } // "Yesterday", "Last month"
  | { id: string; label: string; kind: 'fixed'; range: DateRange };

/** Half-open instant interval in a business time zone, for queries: [start 00:00, end+1 00:00). DST-correct. */
export function toInstantRange(range: DateRange, timeZone: string): { from: string; to: string };   // ISO instants
/** Same-length period immediately before, for "compare to previous period" (03, 04 analytics). */
export function previousPeriod(range: DateRange): DateRange;
export function samePeriodLastYear(range: DateRange): DateRange;
```

The Figma presets map to these kinds: Today, Yesterday, Last 7 days, Last 30 days, This quarter (`to-date: quarter`) and Year to date.

### 4.4 Time zones

- **Three different zones matter:**
  - the **viewer's** zone, for "today" highlighting;
  - the **business** zone (the store's reporting zone), which defines what "Oct 7" means for analytics;
  - **UTC**, for storage.

  The picker deals only in **plain dates**. A `timeZone` prop, which is **required whenever relative presets or "today" are used**, says which zone "today" is computed in. Analytics apps pass the store zone.
- **`toInstantRange(range, storeZone)`** produces the query interval. It is half-open, so the end is the next day's midnight. DST is handled by `@internationalized/date`'s `toZoned` disambiguation.
- **Explicit `timeZone` on every formatter** (r1 §6.2, r6 Risk 9). No component calls `new Date()` or `Date.now()` in render (r1).

### 4.5 SSR determinism: where the hydration mismatches are

| Surface | Mismatch source | Rule |
|---|---|---|
| **Trigger label** ("Oct 1 – Oct 7, 2026") | Formatting a plain date through `Date` in the runtime's zone; Node and browser ICU/CLDR differences | Format from the value with `Intl.DateTimeFormat(locale, { timeZone: 'UTC', … }).formatRange(Date.UTC(…), Date.UTC(…))` (formatRange: Chrome 76, Firefox 91, Safari 14.1, BCD). **`locale` is a required prop when SSR'd** (r8 §6.10: default `'en-US'`, never `navigator.language` in render). The trigger is the deterministic SSR surface |
| **"Today" ring, relative presets** | The clock and the viewer's zone differ between server and client, and an explicit zone still flips across midnight between render and hydration | Calendar and preset list render **only inside the popover**, which is client-only after open, so nothing to hydrate. For an **inline** `Calendar`, today comes from `useSyncExternalStore(subscribeMidnight, () => todayIn(timeZone), () => serverToday ?? null)`. A server/client difference then causes a **post-hydration re-render, not a mismatch error** |
| **CLDR drift** (e.g. U+202F narrow no-break space before AM/PM in newer CLDR) | Node and browser ship different ICU versions | Date-only formats avoid most of it. For times, format on one side only (server), or mark the single text node `suppressHydrationWarning`. The class of issue is well known; specific Node-versus-Safari pairs are UNVERIFIED |
| **Week start** | Locale data on server vs client | `weekStartsOn` prop wins; otherwise `@internationalized/date` locale data, identical on both sides because it is bundled, not runtime ICU |

### 4.6 Component API (fits Figma 746:267)

```tsx
<DateRangePicker
  name="period"                                   // hidden inputs `period.start` and `period.end`, ISO dates; FormData-ready
  defaultValue={{ start: '2026-10-08', end: '2026-10-14' }}   // or value + onValueChange(value, details)
  presets={[{ id: 'today', label: 'Today', kind: 'last', days: 1, includeToday: true },
            { id: '7d', label: 'Last 7 days', kind: 'last', days: 7, includeToday: true },
            { id: 'ytd', label: 'Year to date', kind: 'to-date', unit: 'year' }]}
  timeZone="Europe/London" locale="en-GB"         // required when SSR'd with relative presets
  commit="apply"                                  // Figma footer: Cancel / Apply. 'instant' = no footer
  numberOfMonths={1}                              // Figma draws 1; 2 is common on desktop (design to confirm)
  minValue="2024-01-01" maxValue="2026-10-14" weekStartsOn="mon"
  isDateUnavailable={undefined}                   // function → only from client components (not RSC-serializable)
  compare={false}                                 // reserved: compare-to-previous-period toggle (not in Figma, 03/04 want it)
  labels={{ apply: 'Apply', cancel: 'Cancel' }}   // r8 §6.10 labels pattern
/>
```

- **Anatomy (Figma):**
  - Trigger: the Select skin (calendar icon + value + chevrons).
  - Popover body: presets list, then the calendar.
  - Footer: range text, Cancel, Apply.
- **Commit model:** `apply` keeps a draft. Esc or Cancel reverts the draft and closes. A preset click sets the draft and highlights the preset. Whether a preset click should auto-apply is a **design question** ("Presets first").
- **a11y:**
  - APG Date Picker Dialog with a grid.
  - Presets are a `listbox` (single-select).
  - The month heading is live.
  - Month navigation is IconButtons at a 24 px minimum (Figma's bare 20 px icons fail 2.5.8).
  - The day grid uses the engine's grid keyboard model (arrows, PageUp/PageDown, Home/End).
- **Figma shape versus RAC's `DateRangePicker`.** Figma has **no typed date segments**. Dropping RAC's `DateInput` saves about **7 KB** (70.1 vs 77.0). Typed entry (`DateField`) can be added later as a variant. It is not required for WCAG, because the grid is keyboard-operable.
- **Lazy calendar.** The trigger is light. `RangeCalendar` is `React.lazy`-loaded on pointer-enter or focus of the trigger (intent) and on open. Initial page cost is then the trigger alone. Target budget below.
- **State vocabulary additions for day cells** (adapter-mapped, engine-independent): `data-today`, `data-outside-month`, `data-unavailable`, `data-selected`, `data-range-start`, `data-range-end`, `data-in-range`, `data-focus-visible`.
- **Tokens:** range fill `--nz-bg-brand-subtle`; ends `--nz-bg-brand` with `--nz-text-on-brand`; today marker `--nz-text-brand`.

### 4.7 Placement: subpaths, not `@nizivo/dates`

- 02 proposed an `@nizivo/dates` package. **Rejected:**
  - every npm package needs its own trusted-publisher setup with 2FA, and there is no scope-wide OIDC (r4; C12 verdict);
  - the date library already arrives with the engine;
  - subpath entries are already tree-shaken and pluggable.
- Unpublishing a subpath later is a major, but `unstable/` carries no semver promise (r8).
- **Revisit** if a non-React consumer needs date math, at which point `@nizivo/dates-core` becomes plausible.

### 4.8 Rejected alternatives and risks

**Rejected:**
- `Date` as the public type (instant versus calendar-date confusion).
- `CalendarDate` objects as the public type (engine leak, not serializable, settled-8 conflict).
- The Temporal polyfill (19.3 KB tax for Safari users).
- date-fns as the internal library under RAC (a second date model).
- A separate npm package.

**Risks:**
1. **D1 dependency.** If Base UI wins, the calendar grid must be built in-house: the APG grid keyboard model plus range state, high-risk a11y work (r3 warns against own combobox-class widgets).
2. **CLDR and ICU drift** for time formats.
3. **Design gaps:** no Day-cell component or states, a single month, no compare, no time picker. Ship in `unstable/` until G9 closes.
4. **Native Temporal timing is unknown.** Do not plan around a Safari version.

---

## 5. Q4: Command menu and hotkeys (D19)

### 5.1 Recommendation

**`CommandMenu`** lives in core as a **lazy-loaded subpath** (`@nizivo/ui/command-menu`, as 06 proposed), built on the engine.

- **With React Aria:** `Modal` › `Dialog` › `Autocomplete` (`filter` from `useFilter`) › `SearchField` › `Menu` with `MenuSection`s.
  - RAC's own docs say Autocomplete builds "command palettes, searchable menus, filterable selects", and its Menu supports **virtual focus**: arrows move while focus stays in the input ([RAC Autocomplete](https://react-aria.adobe.com/Autocomplete)).
  - Cost: **+4.7 KB gz** over the dashboard set, or 50.6 KB standalone.
- **With Base UI:** `Dialog` + `Autocomplete` (49.1 KB standalone).
- Either way the public API is Nizivo's, and the adapter is one file.
- **Hotkeys** are a core `/hotkeys` subpath: an **own module-level registry** (no provider, settled 8) over **`tinykeys` 4.0.1** (1.0 KB gz, zero dependencies, active in 2026).
- **`Kbd`** is a server-safe core primitive and is platform-aware without hydration mismatch (§5.4).
- **`CommandTrigger`** is the field-looking button in the top bar (06's recommendation), separate from `SearchField`, which filters in-page.

### 5.2 Why not cmdk

| Signal | Evidence |
|---|---|
| Release cadence | Last release 1.1.1 on **2025-03-14**; last code change 2025-08-03; last commit a README edit on 2025-10-29 (GitHub API) |
| Ownership | Moved to the `dip` org in Oct 2025; 76 open issues and PRs |
| **Second engine** | Depends on `@radix-ui/react-dialog`. Even inline-only usage bundles the Radix Dialog stack (17.5 KB gz either way; §1.4 item 5). That is exactly the engine-mixing cost r3 measured (C4) and duplicate focus-trap/dismiss layers (r3) |
| API shape | `Command.Dialog` static-property compound: breaks across RSC (r1 D5) and defeats tree-shaking |
| What we'd gain | Fuzzy `command-score` ranking. Replaceable with a ~1 KB own scorer or RAC `useFilter` (`contains`/`startsWith`, `Intl.Collator`-based) |

### 5.3 API and adapter sketch

```tsx
// Public API (06's shape, adjusted to settled 2). `CommandMenu` is a NAMESPACE import
// (`export * as CommandMenu from './command-menu.parts'`), not a component with static members.
// The flat names CommandMenuRoot, CommandMenuInput, CommandMenuList, CommandMenuEmpty, CommandMenuLoading,
// CommandMenuGroup, CommandMenuItem and CommandMenuFooter are exported too.
import { CommandMenu } from '@nizivo/ui/command-menu';

<CommandMenu.Root open={open} onOpenChange={setOpen} hotkey="$mod+k" label="Command menu"
  sources={[productsSource, ordersSource, actionsSource]}       // async, abortable providers
  filter="contains"                                               // 'contains' | 'startsWith' | (item, query) => number (score)
  maxPerGroup={8}>                                                // cap rendering; "Show all N" row per group
  <CommandMenu.Input placeholder="Search or jump to…" />
  <CommandMenu.List>
    <CommandMenu.Empty>No results for “{query}”</CommandMenu.Empty>
    <CommandMenu.Loading />
    <CommandMenu.Group heading="Actions">
      <CommandMenu.Item value="new-product" icon={<PlusIcon />} shortcut="$mod+n"
                        onAction={createProduct}>Add product</CommandMenu.Item>
      <CommandMenu.Item value="orders" render={<Link href="/orders" />}>Go to orders</CommandMenu.Item>
    </CommandMenu.Group>
  </CommandMenu.List>
  <CommandMenu.Footer />                                          {/* ↑↓ Navigate · ↵ Open · esc Close, from the registry */}
</CommandMenu.Root>

type CommandSource = { id: string; heading: string; search(query: string, signal: AbortSignal): Promise<CommandItem[]> };
```

`sources`, `filter` (function form) and `onAction` are functions, so `CommandMenu.Root` must be rendered from a client component. That is inherent: it is an interactive client widget. The serializable `filter="contains"` form works from server components.

```tsx
// _engines/react-aria/command-menu.tsx (the only file that imports the engine)
'use client';
import { ModalOverlay, Modal, Dialog, Autocomplete, SearchField, Input, Menu, MenuSection, MenuItem, Header, useFilter } from 'react-aria-components';
export function EngineCommandMenu(p: EngineProps) {
  const { contains } = useFilter({ sensitivity: 'base' });
  return (
    <ModalOverlay isOpen={p.open} onOpenChange={p.onOpenChange} isDismissable className="nz-command-menu-overlay" data-slot="command-menu-overlay">
      <Modal className="nz-command-menu" data-slot="command-menu">
        <Dialog aria-label={p.label}>
          <Autocomplete filter={p.async ? undefined : contains} inputValue={p.query} onInputChange={p.onQuery}>
            <SearchField aria-label={p.label} autoFocus><Input className="nz-command-menu-input" data-slot="command-menu-input" /></SearchField>
            <Menu items={p.groups} renderEmptyState={p.renderEmpty} className="nz-command-menu-list" data-slot="command-menu-list">
              {(g) => <MenuSection id={g.id}><Header>{g.heading}</Header>{/* items → MenuItem with href/onAction */}</MenuSection>}
            </Menu>
          </Autocomplete>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
```

**Behaviour contract.**
- APG combobox semantics inside a modal dialog: Esc closes, focus returns to the trigger, `aria-activedescendant` virtual focus.
- A polite result-count live region ("5 results"), debounced.
- Async sources race through `AbortController`; the newest query wins.
- Results are **capped per group** (default 8) with a "Show all" row. **Virtualization is opt-in** (`virtualize` → RAC `Virtualizer` with `ListLayout`, +8.8 KB) for un-grouped very large lists.
  - **UNVERIFIED:** RAC's Virtualizer docs list ListBox, GridList and Table, but not Menu ([RAC Virtualizer](https://react-aria.adobe.com/Virtualizer)). Our build measured `Virtualizer` + `Menu` compiling inside `Autocomplete`. A conformance test (keyboard plus screen reader) must pass before the option is documented; the fallback is a virtualized `ListBox`.
- **Mobile:** full-screen sheet below `sm`. Figma has no mobile variant, so this is a design gap.
- **Highlighted row:** Figma's highlight is 1.08:1 against the surface (06). Use `[data-highlighted] { background: var(--nz-bg-brand-subtle) }` plus a 2 px inline-start indicator, pending design.
- **Lazy loading:** the subpath exports `CommandMenuLazy`. The hotkey and trigger are tiny and load the dialog chunk with `React.lazy` on first ⌘K or pointer-enter. 06 already calls for this.

### 5.4 Hotkeys: an own registry over tinykeys

| Option | Size | Status | Verdict |
|---|---:|---|---|
| **tinykeys 4.0.1** | **1.0 KB** | 2026-09-25; zero deps; `$mod` (⌘ on Apple, Ctrl elsewhere), sequences, optional modifiers `[Shift]`; ignores events from `input`/`textarea`/`select`/`[contenteditable]` unless they are the target; 4.0 changed defaults for **repeat and composition (IME) events** and fixed AltGraph ([README](https://github.com/jamiebuilds/tinykeys); commits) | **Chosen** as the matcher |
| @tanstack/react-hotkeys 0.13 | 6.7 KB | Pre-1.0 since 2026-02; store dependency; recorder and hold hooks | Later candidate; too young |
| react-hotkeys-hook 5.3.3 | — | Hook-per-component; no global listing | Doesn't give a registry for Kbd/footer listing |
| Own matcher | ~1 KB | We own AltGraph, IME, layout and `event.code`/`key` edge cases | Not worth it; tinykeys is MIT and swappable behind our API |

```ts
// @nizivo/ui/hotkeys: module-level store (Astro-island safe, no provider), useSyncExternalStore for listing
'use client';
import { tinykeys } from 'tinykeys';
type Hotkey = { id: string; keys: string; description: string; scope?: 'global' | 'dialog'; allowInInputs?: boolean; run(e: KeyboardEvent): void };
const registry = new Map<string, Hotkey>();                       // single source for Kbd hints, CommandMenu footer, help dialog
export function registerHotkey(h: Hotkey): () => void { /* conflict warning in dev; one window listener per binding set */ }
export function useHotkey(h: Hotkey) { /* useEffect(() => registerHotkey(h), [h.keys]); useEffectEvent for run (19.2) */ }
export function useHotkeys() { return useSyncExternalStore(subscribe, snapshot, () => EMPTY); }  // for listing
```

**Policy.**
1. **Never fire during IME composition** (`event.isComposing`, or `keyCode === 229`). tinykeys 4 changed its composition default; we assert it in a test rather than rely on the default.
2. **Ignore editable targets** except bindings marked `allowInInputs` (⌘K itself).
3. **`aria-keyshortcuts`** goes on the control that the shortcut activates, using ARIA's syntax (`"Meta+K Control+K"`). `<Kbd>` hints are `aria-hidden` when paired (06).
4. **Never bind single printable keys globally** without a setting to turn them off (WCAG 2.1.4 Character Key Shortcuts). ⌘K, ⌘B and F8 are modifier or function keys and pass.
5. **Scope:** dialog-scoped hotkeys register on open and unregister on close; transient overlays clean up in a layout-effect cleanup (Activity rule, r1 §2.5).

**`Kbd` without a hydration mismatch.** The server cannot know the platform.
- `<Kbd keys="$mod+k" />` renders both glyph sets: `<kbd><span data-platform="apple">⌘K</span><span data-platform="other">Ctrl K</span></kbd>`.
- CSS shows one, based on `:root[data-nz-platform]`. A one-line addition to r1's blocking `ThemeScript` sets it (`/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent)`).
- Without the script, `other` shows and a `useSyncExternalStore` fallback flips it after hydration: a re-render, not a mismatch error.
- This is zero-flash, server-safe and needs no provider.

### 5.5 Rejected alternatives and risks

**Rejected:**
- cmdk (§5.2).
- Making `SearchField` itself the command combobox. No inline results are designed (06), and it would invent UI.
- A provider-based hotkey registry (settled 8; Astro islands).
- `@tanstack/react-hotkeys` (pre-1.0).
- Virtualization by default.

**Risks:**
1. RAC `Autocomplete` is exported without `UNSTABLE_`, but **its hooks package is still `3.0.0-rc.8`**, and the RAC docs page states no stability level. Use caret ranges (not exact pins, r3) and gate upgrades on the conformance suite.
2. Menu inside Virtualizer (UNVERIFIED, above).
3. `navigator.platform` is deprecated. The detection uses `userAgentData?.platform ?? userAgent`, and the result is presentation-only.

---

## 6. Q5: Engine choice per input-family item (D20)

| Item | Tier and engine | RSC | Measured or estimated cost | Notes |
|---|---|---|---|---|
| **Input** (text, email, url, tel) | T0 native in a thin client leaf (Field wiring) | Client leaf, full SSR | ~0.3 KB own (UNVERIFIED until built) | `inputMode`, `enterKeyHint`, `autoComplete` pass through |
| **Prefix/suffix** | Part of `Input` (`prefix`, `suffix`, `leadingIcon` slots) | same leaf | +~0.2 KB | Text affixes get an id and join `aria-describedby` ("USD"), or belong in the label ("Price (USD)"). Icons are `aria-hidden`. Clicking an affix focuses the input (pointerdown handler in the leaf). The group shows `:focus-within` |
| **Textarea** | T0 native + **`field-sizing: content`** | client leaf | ~0.3 KB | Auto-grow with no JS (Newly Baseline 2026-06-16). `min-block-size: calc(var(--rows) * 1lh)`, `max-block-size` cap. Older Firefox/Safari fall back to fixed `rows` |
| **Character count** | Own part `Textarea count` (`data-slot="field-count"`) | client | ~0.4 KB | Visual `n / max` is `aria-hidden`. A polite SR live region announces **after the user pauses typing**, never per keystroke. An optional `threshold` stays silent until the user nears the limit. **Soft limit by default:** over-limit sets `setCustomValidity` → error, and a hard `maxLength` is opt-in. GOV.UK's component "does not restrict the user from entering information" and announces "when they stop typing" ([GOV.UK character count](https://design-system.service.gov.uk/components/character-count/)) |
| **Password toggle** | Own `PasswordInput` | client leaf | ~0.4 KB | A `<button type="button" aria-pressed aria-controls={id}>` with a constant label "Show password". Swaps `type`. **Reverts to `type=password` on the form's `submit`** so the plain value is not exposed or saved. Hides Edge's built-in reveal via `::-ms-reveal { display: none }` when our toggle is present (UNVERIFIED in current Edge). Passes `autoComplete="current-password"`/`"new-password"`, `spellCheck={false}`, `autoCapitalize="off"` |
| **SearchField** (in-page filter) | T0: `<search>` (Widely) + `<input type="search">` | client leaf | ~0.3 KB | The native clear button is hidden; ours (IconButton) is shown when there is a value. Esc clears. With `<form method="get">` it is zero-JS filtering (§3.5). Use RAC `SearchField` only inside Autocomplete (+2.4 KB) |
| **CommandTrigger** | Button styled as a field | server-safe button + client hotkey | — | §5 |
| **Combobox / search suggestions** | **T1 engine.** RAC `ComboBox` (**+9.8 KB** over the dashboard set; 61.0 standalone) or Base UI `Combobox` (50.8 standalone) | client | measured | For "pick a value from suggestions" (form value via a hidden input, `allowsCustomValue` as an option). Async items: abortable `fetch` + `useDeferredValue`; empty and loading states announced (RAC 1.22 fixed the Empty announcement, r3). **Never build our own** (r3: hardest widget). `<datalist>` is rejected (not stylable, `datalist` not Baseline) |
| **QuantityStepper** (PDP; M-B #35) | **Own T0:** native `<input type="number" inputMode="numeric" min max step>` + 2 buttons calling `stepUp()`/`stepDown()` and dispatching `input`/`change` | client leaf | ~0.6 KB (UNVERIFIED) | Native `role=spinbutton` with arrows and min/max from attributes. The buttons have `tabIndex={-1}` (keyboard uses arrows, as RAC does) and `onPointerDown` → `preventDefault` so focus and announcements stay on the input. Disables at bounds. `onWheel` is not hijacked. Integer only |
| **NumberField** (currency, percent, decimals, locale parsing) | **T1 engine.** RAC `NumberField` (**+9.8 KB**; 25.9 standalone) or Base UI `NumberField` (13.3 standalone) | client | measured | Native `type=number` mishandles locale decimal separators and formatting. The engine gives `formatOptions` (`Intl.NumberFormat`) parsing and a hidden input carrying the raw number |
| **Select** (for context) | T1 engine; `NativeSelect` T0 | client | r3 | Shares the Field contract and the hidden-native-element rule (§2.3) |

**Sketches.**

```tsx
<Field label="Price" description="Before tax">
  <Input inputMode="decimal" prefix={<span>$</span>} suffix={<span>USD</span>} name="price" />
</Field>

<Field label="Description" description="Shown on the product page">
  <Textarea name="description" rows={3} maxRows={10} count={{ max: 500, mode: 'soft' }} />
</Field>

<Field label="Password"><PasswordInput name="password" autoComplete="new-password" minLength={12} /></Field>

<Field label="Quantity"><QuantityStepper name="qty" min={1} max={stock} defaultValue={1} /></Field>
```

```css
@layer nz.components {
  .nz-input-group { display: flex; align-items: center; gap: var(--nz-space-2); block-size: var(--nz-size-control-md);
    padding-inline: var(--nz-space-3); border: var(--nz-border-width-default) solid var(--nz-border-default);
    border-radius: var(--nz-radius-md); background: var(--nz-bg-surface); }
  .nz-input-group:focus-within { outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px; }
  .nz-input-group > .nz-input { all: unset; flex: 1; min-inline-size: 0; font: var(--nz-font-body-m); }
  .nz-input-affix { color: var(--nz-text-secondary); }
  .nz-textarea { field-sizing: content; min-block-size: calc(var(--_nz-rows, 3) * 1lh); max-block-size: calc(var(--_nz-max-rows, 10) * 1lh); }
}
```

The `--_nz-` private-variable prefix follows C7's leading option. C7 is not yet decided, so the prefix may change.

---

## 7. Contract additions proposed for the "contract sheet" (critique §5.1)

**`data-*` state vocabulary additions** (settled 4; to be ratified with the rest). Every one is adapter-mapped and engine-independent:

| Attribute | On | Meaning |
|---|---|---|
| `data-invalid` | field, control | A message is **presented** (definition in §2.3) |
| `data-pending` | SubmitButton, form, async field | An action or validation is in flight |
| `data-sort="ascending\|descending"` | `<th>` | Mirrors `aria-sort`; absent when unsorted |
| `data-interactive` | table row | Row has a stretched link (hover style) |
| `data-presentation="table\|list"` | DataView slots | |
| `data-today`, `data-outside-month`, `data-unavailable`, `data-range-start`, `data-range-end`, `data-in-range` | calendar cell | |
| `data-platform="apple\|other"` | Kbd glyph spans | Paired with `:root[data-nz-platform]` |

**`data-slot` names introduced:**
- Field: `field`, `field-label`, `field-description`, `field-error`, `field-count`.
- Input: `input`, `input-group`, `input-affix`.
- Table: `table-container`, `table`, `table-header`, `table-body`, `table-row`, `table-head`, `table-cell`, `table-sort-button`, `table-select-row`, `table-spacer`.
- Other: `bulk-action-bar`, `data-view-table`, `data-view-list`, `command-menu*`.

**CSS hooks:** `--nz-table-sticky-offset`, `--nz-table-max-height`.

**Inlined glyphs counted against r6's "about 10" budget.** Core imports no icon package (settled 7). This report adds these core-owned glyphs:
1. the field error mark;
2. the sort chevron (one glyph, rotated per direction);
3. the select-all indeterminate dash (shared with Checkbox);
4. the password show/hide eye pair;
5. the stepper plus/minus pair;
6. the calendar previous/next chevrons (shared with Pagination).

Each is overridable through a slot (`errorIcon`, `sortIcon`, …). The plan must keep a single list, so the glyph count does not drift past r6's budget.

**Tokens requested from design** (on top of 02's list):
- a **field description** text token at ≥ 4.5:1 (text/tertiary fails, G19);
- a command-menu highlight that reaches 3:1 against the surface, or an indicator token;
- a `size/table-row` scale for the `sm`/`md` row heights the Figma rows imply (12 vs 14 px padding inconsistency, 05).

**Layer usage:** all CSS here sits in `@layer nz.components`. The canonical order itself is fixed in the plan (settled 3).

---

## 8. Size budgets derived from the measurements (settled 13)

Budgets are **gzip, measured with r3's method**, and stated as increments over the engine core already on the page (the r3 dashboard set). Each is set at measured + ~10% headroom. Own-code targets are **UNVERIFIED until built** and become hard size-limit entries after the first implementation.

| Entry | Measured | Budget |
|---|---:|---:|
| `field` + `form` (own: Field shell, FieldScope, Form, SubmitButton, native-validity hook) | — | **≤ 2.5 KB** (target) |
| `input`, `textarea`, `password-input`, `quantity-stepper` (own leaves, each) | — | ≤ 1 KB each (target) |
| `table` parts | 0 client JS | **0** (server-safe; CI asserts no `'use client'`) |
| `table` selection + bulk bar (own) | — | ≤ 2 KB (target) |
| `combobox` (RAC) | +9.8 | ≤ 11 KB incremental |
| `number-field` (RAC) | +9.8 | ≤ 11 KB incremental |
| `command-menu` (RAC Autocomplete + SearchField over Modal/Menu, + own sources/scorer ~1.5) | +4.7 | ≤ 7.5 KB incremental (lazy chunk) |
| `command-menu` with `virtualize` | +8.8 more | ≤ 10 KB more |
| `hotkeys` (tinykeys + registry) | 1.0 + own | ≤ 2 KB |
| `unstable/date-range-picker` trigger (eager) | — | ≤ 1.5 KB (target) |
| `unstable/date-range-picker` calendar chunk (lazy; RAC Calendar module) | +21.4 | ≤ 24 KB incremental |
| `@internationalized/date` (inside the chunk above with RAC) | 5.8 standalone | counted in the chunk |
| Registry `data-table` block (consumer bundle, informative) | TanStack 12.9–17.0 | Documented, not gated |

For comparison, the engine-agnostic **ceilings if D1 = Base UI**: Combobox 50.8 standalone, NumberField 13.3 standalone, Autocomplete 49.1 standalone. **No calendar exists in Base UI, so its cost is unknown.**

---

## 9. Open questions (for design or the plan)

1. **Field visual stacking:** does the description stay visible when an error shows (recommended), and is the error above or below it? Is the required/optional marker style "optional" text (GOV.UK) or an asterisk? (Figma has neither.)
2. **DateRangePicker:**
   - Does a preset click auto-apply under `commit="apply"`?
   - 1 or 2 months on desktop?
   - Is compare-to-previous-period in v1?
   - Is a time-of-day picker needed?
   - Which business time-zone source (store setting) does the app pass?
3. **Mobile selection** in the List presentation: needed? (Figma: no.)
4. **CommandMenu:** mobile full-screen variant; the highlight indicator; and whether ⌘K also focuses the top-bar SearchField when no CommandMenu is mounted (06's open ⌘K-semantics question).
5. **D1 coupling:** if Base UI wins, approve building our own calendar grid, or defer date pickers to a later release.
6. **Row density** (`sm`/`md`) and the column-width tokens for tables.

## 10. Proposed decision-log entries

- **D16 Field and forms:** §2.1 points 1–8. Evidence: P (React, Next and BCD docs; registry), M (jsdom invalid test; react-server exports), A (announcement policy, from GOV.UK and WCAG techniques).
- **D17 Data table:** §3.1 table. Evidence: M (sizes; RAC role grep; Containment spec), P (Roselli; TanStack v9 announcement), F (fixed-px columns, Pagination, Order List Item swap).
- **D18 Dates and time:** §4.1. Evidence: P (BCD Temporal `preview`; WebKit history), M (5.8 vs 8.7 vs 19.3 KB).
- **D19 Command menu and hotkeys:** §5.1. Evidence: P (GitHub activity; RAC docs), M (+4.7 KB; cmdk bundles Radix Dialog).
- **D20 Input family:** §6 table. Evidence: P (`field-sizing` Newly Baseline), M (RAC/Base UI sizes).

---

## Sources

**Registry and repositories**
- https://registry.npmjs.org/ (react-hook-form, @hookform/resolvers, @tanstack/react-form, @tanstack/react-form-nextjs, @conform-to/react, zod, @tanstack/react-table, @tanstack/table-core, @tanstack/react-virtual, cmdk, tinykeys, @tanstack/react-hotkeys, react-hotkeys-hook, @internationalized/date, date-fns, @date-fns/tz, temporal-polyfill, @js-temporal/polyfill, @react-aria/autocomplete; queried 2026-10-14)
- https://api.github.com/repos/dip/cmdk/commits , https://api.github.com/repos/jamiebuilds/tinykeys/commits
- https://github.com/dip/cmdk · https://x.com/pacocoursey/status/1983342409401688342 · https://github.com/jamiebuilds/tinykeys

**React and frameworks**
- https://react.dev/blog/2026/09/09/react-19-3 · https://react.dev/reference/react-dom/components/form · https://react.dev/reference/react/useId
- https://nextjs.org/docs/app/guides/forms

**Engines and libraries**
- https://react-aria.adobe.com/Autocomplete · https://react-aria.adobe.com/Table · https://react-aria.adobe.com/Virtualizer
- https://tanstack.com/blog/announcing-tanstack-table-v9 · https://tanstack.com/table/latest/docs/framework/react/guide/virtualization · https://tanstack.com/form/latest/docs/framework/react/guides/ssr

**Platform**
- https://web-platform-dx.github.io/web-features-explorer/features/temporal/ · https://github.com/mdn/browser-compat-data/issues/30337 · https://webkit.org/blog/18325/webkit-features-for-safari-27-0/
- https://www.w3.org/TR/css-contain-2/ · https://developer.chrome.com/blog/keyboard-focusable-scrollers

**Accessibility**
- https://adrianroselli.com/2018/02/tables-css-display-properties-and-aria.html · https://adrianroselli.com/2023/11/dont-turn-a-table-into-an-aria-grid-just-for-a-clickable-row.html
- https://a11ysupport.io/tech/aria/aria-errormessage_attribute · https://github.com/chakra-ui/ark/issues/4150 · https://github.com/w3c/aria/issues/2048 · https://www.w3.org/TR/WCAG20-TECHS/ARIA19.html
- https://design-system.service.gov.uk/patterns/validation/ · https://design-system.service.gov.uk/components/error-summary/ · https://design-system.service.gov.uk/components/character-count/

**Local data and scripts** (scratchpad)
- `bench/webdata/bcd/package/data.json` (BCD 8.1.5) · `bench/webdata/wf/package/data.json` (web-features 3.42.0)
- `gapa/tools/measure.mjs`, `gapa/tools/incr.mjs`, `gapa/tools/sizes.json`, `gapa/tools/invalid-test.cjs`; installed packages in `gapa/deps/node_modules`

**Internal inputs**
- `docs/research/00-critique.md` (G11, G12, G13, G18, C3, C4, C12, C16, C27, S6)
- r1 §2.3–2.5, D10 · r3 §8–9 · r5 bench · r6 Risk 9 · r8 §5.3, §6.8–6.10
- figma/02 §5.4, §5.13 · 05 Product/Order Row · 06 Search Field, Command Menu, Kbd · 08 §6.3, DataTable
