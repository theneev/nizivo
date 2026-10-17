# Field contract

How a form control plugs into `Field` (ARCHITECTURE.md §10.6, §16.1, D16). Input, Textarea,
Checkbox, Switch, SegmentedControl, NativeSelect and third-party controls build on this API;
RadioGroup and checkbox groups build on `Fieldset` (last section). Tests that pin it:
`test/ssr/field.test.tsx` (RSC boundary, markup, precedence), `test/browser/field.spec.tsx`
(hydration, native validation; Chromium and WebKit) and `test/browser/field-announcer.spec.tsx`
(the announcer; Chromium, WebKit and Firefox).

## The shape

```
Field (field.tsx, NO directive, server-safe; calls useId and nothing else)
 ├─ children is a function ─► renders the anatomy itself, calls children(FieldControlProps)
 └─ otherwise ─────────────► <FieldScope anatomy name messages>{children}</FieldScope>
                              field-scope.client.tsx ('use client'):
                               ├─ provides the context useFieldControl() reads
                               ├─ owns the native validation message (useState)
                               ├─ owns the announcer, §16.5's one exception (below)
                               └─ renders the same anatomy (fieldRootProps() in field.tsx)
control leaf ('use client') ─► useFieldControl({ …its own props }) → spreads controlProps
```

React context does not cross from a Server Component to a Client Component, so the server shell
provides none. It computes the ids with `useId` (the one hook a server part may call) and hands
them, with the flags and the `label` / `description` / `error` nodes, to the `FieldScope` client
leaf as **serialisable props** (a test walks them). FieldScope is the provider, so a client control
rendered inside it reads the context whether `<Field>` was written in a Server or a Client
Component. Both paths render one DOM shape, from `fieldRootProps()` in `field.tsx`:

```
div.nz-field             data-slot="field"  [data-disabled] [data-readonly] [data-required] [data-invalid] [data-validate-on]
├─ label.nz-field-label  data-slot="field-label"  id={label}  for={control} (none with `group`)
│   └─ span.nz-field-required  data-slot="field-required"  aria-hidden="true"  "*"   (when required)
├─ the control (children)
├─ div.nz-field-description  data-slot="field-description"  id={description}         (when given)
├─ InlineError: div.nz-inline-error.nz-field-error  data-slot="field-error"  id={error}   (when invalid)
└─ span.nz-visually-hidden  aria-live="polite"  aria-atomic="true"   (FieldScope path only: the announcer)
```

- DOM order is label, control, description, error; the description stays visible while an error
  shows (Q30, builder default). `data-validate-on` and the announcer are written only on the
  FieldScope path; the zero-JS path intercepts nothing, so it has neither, and both paths print the
  same HTML otherwise.
- The error is **not a live region** (§16.5): it is reached through the control's
  `aria-describedby` and `aria-invalid`, so typing never announces anything. Moving focus to the
  form's first invalid control on submit is what makes a screen reader read it. When focus is
  already there, the announcer speaks it instead (next section).
- The error mark is the internal `circle-x` glyph (`errorIcon` replaces it).

## The announcer (§16.5's one exception, M29)

Focus is the announcement: a submit moves focus to the form's first invalid control, and a screen
reader reads the new error through `aria-describedby`. When focus is already in that control (Enter
in it, a shortcut that calls `requestSubmit()`, a Server Action replying while the user waits in the
field), nothing moves, so nothing would be read. For that case alone, FieldScope renders one polite
live region, the last child of the Field root. It is the only live region a Nizivo form part adds;
InlineError and the error part stay not live.

- **It exists before the message.** The region is in the server HTML, empty (a live region must
  exist before its content changes, WCAG technique ARIA19), and hydration adopts it unchanged. The
  zero-JS path has none: there the browser's own bubble speaks. It is visually hidden
  (`nz-visually-hidden`, base.css), never `display: none`, and has no `data-slot`.
- **When it speaks.** A _validation request made while focus is in the Field_ arms it: an `invalid`
  event at the control when it is the form's first invalid control, where focus goes (native
  validation), or a `submit` event of the form (any form library or Server Action; listened for on
  the document, in the capture phase, so before the app's own handler validates). The next error
  text that then commits is spoken once, if focus is still in the Field. Native validation answers
  at once, so its message is spoken even when it is the one already shown (typing may have changed
  it silently). For the `error` prop, a re-render that keeps the text (a pending state while the
  action runs) says nothing; the reply that changes it is spoken. A commit that empties the error
  keeps the request, so an app that clears its errors when a submit starts still has the reply
  spoken.
- **When it says nothing.** On the first render and at hydration (Strict Mode included); when the
  request moves focus to the control (the focus move reads the error); at a control that is not the
  form's first invalid one (focus goes to that one, moved by the browser or by its own Field, and
  is read there; so a `reportValidity()` call on such a control is silent too); in a Field focus is
  not in;
  while the user types (an input event withdraws the request, so the native message `onInput`
  updates, or an `error` an app derives per keystroke, stays silent); when a reply's text equals the
  error already shown; and when the text is the one the region still holds (a second Enter on an
  unchanged message within 7 s is not repeated).
- **What it says.** The text of the InlineError message: the `messages` entry, the browser's
  `validationMessage`, or the text of the `error` node. Not the mark, which is `aria-hidden` and
  which an `errorIcon` could give text.
- **Cleared after.** The region empties 7 s after it speaks (the delay React Aria's own announcer
  uses), and at once when the error changes silently or clears; assistive technology does not
  announce a removal (`aria-relevant`'s default is additions and text). While it holds the text, a reader moving through the form meets the
  message twice: the error, then the region.
- **Outside the rule.** A library that moves focus into the control itself is not a request from
  inside the Field: if focus lands before the error commits, a screen reader reads the control
  without it and the region says nothing. Let the Field move focus (native validation), or move it
  after the error renders.

## `useFieldControl(options?)`: what a control calls

Inside the package: `import { useFieldControl } from '../field/field-scope.client';`. Public:
`import { useFieldControl } from '@nizivo/react/field'`. Client code only (a control's module is
`'use client'`).

```ts
type FieldControlOptions = {
  id?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined;
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  invalid?: boolean | undefined;
  'aria-describedby'?: string | undefined; // joined after the Field's ids
  labelBehavior?: 'focus' | undefined; // button controls: a label click focuses, never presses
};

interface FieldControl {
  inField: boolean; // false with no Field around the control
  id: string | undefined;
  labelledBy: string | undefined; // the Field label's id; undefined without a label
  describedBy: string | undefined;
  name: string | undefined;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean; // a message is presented (data-invalid semantics, §8.3)
  controlProps: FieldControlElementProps; // spread on the native element
}

// Type aliases, not interfaces, so they pass to mergeProps(): Record<string, unknown>.
type FieldControlProps = {
  // also what a function child receives
  id?: string | undefined;
  name?: string | undefined;
  required?: boolean | undefined; // true or undefined, never false
  disabled?: boolean | undefined;
  readOnly?: boolean | undefined;
  'aria-describedby'?: string | undefined;
  'aria-invalid'?: boolean | undefined;
};
type FieldControlElementProps = FieldControlProps & {
  onInvalid?: (event: SyntheticEvent<FieldValidatable>) => void; // inside a Field
  onInput?: (event: SyntheticEvent<FieldValidatable>) => void; // inside a Field
  onBlur?: (event: FocusEvent<FieldValidatable>) => void; // only with validateOn="blur"
};
type FieldValidatable = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
```

### Precedence (one rule for every control)

| Value                                         | Result                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`, `name`                                  | the control's own prop, else the Field's                                                                     |
| `required`, `disabled`, `readOnly`, `invalid` | the control's own prop when it is a boolean (an explicit `false` wins), else the Field's, else `false`       |
| `describedBy`                                 | joined, never replaced: Field description id, Field error id, then the control's own (a text affix, a count) |
| `labelledBy`                                  | the Field label's id                                                                                         |

A control's own `id` inside a Field detaches the `<label for>`; custom ids go through
`<Field ids={{ control: '…' }}>` (Conform, tests).

### With no Field around it

`inField` is `false`; every value comes from the options alone, flags default to `false`,
`labelledBy` is `undefined`, and `controlProps` carries the attributes and no handlers.

`controlProps` (and a function child's argument) carries **only the attributes it sets**: no key
is present with `undefined`, so `<input name="title" {...control} />` keeps `name`. A control
outside a Field costs one `use()` call and one effect that does nothing (it registers `labelBehavior`).

### How a native control uses it (Input, the reference shape)

```tsx
'use client';
import { mergeProps } from '../contracts/merge-props';
import { stateAttrs } from '../contracts/state';
import { useFieldControl } from '../field/field-scope.client';

export function Input({
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-describedby': describedBy,
  className,
  ...rest
}: InputProps): JSX.Element {
  const field = useFieldControl({
    id,
    name,
    required,
    disabled,
    readOnly,
    invalid,
    'aria-describedby': describedBy,
  });
  return (
    <span
      className="nz-input"
      data-slot="input"
      {...stateAttrs({
        invalid: field.invalid,
        disabled: field.disabled,
        readOnly: field.readOnly,
      })}
    >
      {/* consumer handlers run first; a prevented event skips Field's */}
      <input
        {...mergeProps(field.controlProps, rest)}
        className={cx('nz-input-control', className)}
        data-slot="input-control"
      />
    </span>
  );
}
```

Rules:

1. **Destructure** `id`, `name`, `required`, `disabled`, `readOnly`, `invalid` and
   `aria-describedby` and pass them as options, so they reach the element once. **Do not default
   them** (`disabled = false`): `undefined` means "inherit from the Field"; `false` overrides it.
2. **Spread `controlProps` on the native element** that holds the value (`<input>`, `<textarea>`,
   `<select>`) through `mergeProps(field.controlProps, rest)`. A consumer `onInvalid` / `onInput` /
   `onBlur` runs first; if it calls `preventDefault()`, Field's handler is skipped (the consumer
   took over). Never drop the handlers: they carry native validation, and later Field features
   arrive through them with no change to the control.
3. **State attributes on the styled root** come from the returned flags through `stateAttrs()`.
   Invalid CSS reads `[data-invalid]` (or `[aria-invalid='true']` on the native element), never
   `:invalid` or `:user-invalid`: "invalid" means a message is presented (§8.3).
4. **Disabled by a Fieldset.** A disabled `<fieldset>` disables the control natively and the hook
   does not know: style the disabled look from `:disabled` on the native element as well as from
   `[data-disabled]` (for example `.nz-input:has(> input:disabled)`).
5. **Checkbox, Radio, Switch:** `readOnly` does nothing on those inputs. Do not spread it there
   (`const { readOnly, ...attrs } = field.controlProps`); support read-only with `aria-readonly`
   and a blocked change, or not at all. Their own `<label>` wraps the input (the hit target);
   inside a Field the Field's label names the control as well, so use a Field around one checkbox
   only when the Field label is the question and the checkbox label the answer.
6. **One Field labels one control.** Two controls in one Field would share an id; related
   controls go in a `Fieldset`.

### Controls that are not one labelable element

A `<label for>` names one `<input>`, `<textarea>`, `<select>` or `<button>`. Two kinds of control
need `labelledBy` instead:

- **Group controls** (SegmentedControl: hidden radios inside `<label>`s under a root
  `role="radiogroup"`): the Field takes `group`, so its label renders with no `for` (a `for` would
  name no element, or a non-labelable one). The Field cannot detect the control itself: under RSC
  the child reaches it as a client reference, and on the client it may still be a lazy one, so a
  detected answer could differ between the server HTML and hydration. On the **root**, put `aria-labelledby={field.labelledBy}`,
  `aria-describedby={field.describedBy}`, `aria-invalid` and `aria-required` (both valid on
  `radiogroup`); take no `id`. On **each** native radio, spread `name`, `required`, `disabled` and
  the handlers (`const { id, readOnly, 'aria-describedby': _, 'aria-invalid': __, ...each } =
  field.controlProps`). A required group fires `invalid` on every radio; the handler is idempotent,
  and focus goes to the first radio, the form's first invalid control.
- **Button controls** (Select, third-party pickers): `aria-labelledby={field.labelledBy}` on the
  button, because `aria-labelledby` overrides `<label for>` (§16.1), and `id={field.id}`, so the
  label's `for` points at it. Call `useFieldControl({ labelBehavior: 'focus' })`: a `<label for>` a
  button presses it, which would open its popup, so FieldScope (which renders the label) cancels the
  label's click and focuses the control instead, with `focus({ focusVisible: true })` so the ring
  shows where focus went (React Aria's own Select label does the same). A disabled button takes no
  focus. Native controls are unchanged; the option is registered in an effect, so the server HTML
  and the zero-JS path are unchanged too. Select passes the Field's `name` and `required` to React
  Aria's hidden native `<select>`, which carries the value into `FormData`. React Aria owns that
  element's `invalid` event (it cancels it and focuses the trigger), so the Field's handlers do not
  attach there yet and a native message is not shown inline: pass `error` for a required Select.
  A button cannot carry `aria-required` or `aria-invalid` (ARIA 1.2), and the hidden `<select>` is
  `aria-hidden`, so assistive technology hears neither state from the trigger: the error reaches it
  only as the description, and the Field's `*` is `aria-hidden`. Until the accessibility owner picks
  the wording for a spoken "required" (week 6 review R1-2, R1-5), put it in the label or the
  description of a required Select.

### Invalid, required, disabled and read-only: how they flow

- **invalid** = a message is rendered. Sources, in priority order (§16.1, one error channel): the
  Field's `error` prop, then (v0.2) `Form errors[name]`, then the native validation message.
  FieldScope computes the Field root's `data-invalid`, the control's `aria-invalid` and
  `aria-describedby`, and the error element from one value, so they always agree.
- **Native validation stays on** (no `noValidate`). On submit the browser fires `invalid` at each
  invalid control. Field's `onInvalid` cancels the browser bubble, renders the message inline
  (`messages[flag]` for the first failing `ValidityState` flag, else the browser's
  `validationMessage`), and focuses the control if it is the form's first invalid control in
  `form.elements` order (cancelling `invalid` also cancels the browser's own focus move; not
  `querySelector(':invalid')`, which matches an ancestor `fieldset` first).
- While a native message shows, `onInput` updates it and removes it once the value is valid, with
  no announcement. A submit from inside the first invalid control (focus already there, so it does
  not move) has its message spoken by the announcer instead. With `validateOn="blur"` (opt-in),
  `onBlur` reads `validity` directly and shows or clears the message; it never calls `checkValidity()`, which would fire `invalid` and pull focus
  back. The `error` prop is never cleared by the Field: the caller owns it.
- A consumer's own `form.checkValidity()` / `reportValidity()` also fires `invalid`, so it shows the
  inline messages and may move focus to the first invalid control. Accepted: both are validation
  requests.
- **required / disabled / readOnly** become the native attributes through `controlProps`, and
  `data-required` / `data-disabled` / `data-readonly` on the Field root. `required` also draws an
  `aria-hidden` `*` after the label; the native attribute is what assistive technology announces.

## Zero-JS mode (Server-Component forms, server-safe controls)

```tsx
<Field label="Country" description="Where the order ships" error={state.errors?.country}>
  {(control) => (
    <NativeSelect {...control} defaultValue="IN">
      …
    </NativeSelect>
  )}
</Field>
```

A function child receives `FieldControlProps`: serialisable, no handlers. Field renders the anatomy
itself and renders no client component, and native validation shows the browser's own bubble. This
is the path for **NativeSelect** (server tier) and for plain elements; any control may also accept
these props directly, since they are ordinary attributes.

A **NativeSelect placed directly** in a Field (`<Field label="Country"><NativeSelect>…</NativeSelect></Field>`)
takes the same path: Field recognises it by an internal mark on the component (`FIELD_CONTROL` in
`_internal/field.ts`) and passes it the same props, its own winning (an explicit `false` included)
and `aria-describedby` joined; its own `id`, if any, becomes the label's `for`. A NativeSelect inside a
consumer's own wrapper component is not recognised: use the function child there. `field.tsx` still imports the FieldScope
module, so a bundler that collects every `'use client'` module reachable from a route (Next) may
load FieldScope's chunk on such a page without running it.

## `Field` props

| Prop                               | Type                                                       | Notes                                                                                        |
| ---------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `label`                            | `ReactNode`                                                | `<label for>`; omit only when the control is named another way                               |
| `description`                      | `ReactNode`                                                | help text, Body/M `text/tertiary`                                                            |
| `error`                            | `ReactNode`                                                | rendered through InlineError; `null`, `undefined`, booleans and `''` mean no error           |
| `errorIcon`                        | `ReactNode`                                                | replaces the internal `circle-x` glyph                                                       |
| `name`                             | `string`                                                   | passed to the control (Form errors by name in v0.2)                                          |
| `required`, `disabled`, `readOnly` | `boolean`                                                  | see above                                                                                    |
| `ids`                              | `{ control?, label?, description?, error? }`               | overrides each generated id                                                                  |
| `messages`                         | `Partial<Record<FieldValidityKey, string>>`                | native messages by flag, for example `{ valueMissing: 'Enter a title' }`                     |
| `validateOn`                       | `'submit' \| 'blur'`                                       | default `'submit'`                                                                           |
| `render`                           | `RenderProp<FieldState>`                                   | composition of the root `<div>`; `FieldState` is `{ invalid, disabled, required, readOnly }` |
| `children`                         | `ReactNode \| ((control: FieldControlProps) => ReactNode)` | the control, or the zero-JS function                                                         |

Every prop is serialisable except a function `children` (consumed by the shell itself) and a
function `render` (client code only, as for every component).

## `Fieldset` (`@nizivo/react/fieldset`, server-safe, no client leaf)

A native `<fieldset>` and `<legend>`; no `role="group"` fallback. The rows sit in a content box,
because a rendered legend is not a flex item in every engine (the float technique fails in WebKit;
the browser test checks the spacing in Chromium and WebKit).

```
fieldset.nz-fieldset  data-slot="fieldset"  aria-describedby="{description} {error} {own}"  [disabled] [data-disabled] [data-invalid] [data-required]
├─ legend.nz-fieldset-legend  data-slot="fieldset-legend"   (+ span.nz-fieldset-required when required)
└─ div.nz-fieldset-content    data-slot="fieldset-content"  (flex column, --nz-fieldset-gap)
    ├─ children
    ├─ div.nz-fieldset-description  data-slot="fieldset-description"
    └─ InlineError .nz-fieldset-error  data-slot="fieldset-error"
```

- Props: `legend`, `description`, `error`, `errorIcon`, `required` (legend mark only), `disabled`,
  `ids` (`{ description?, error? }`), `render`, and native fieldset attributes (`name`, `form`,
  `role`). A consumer `aria-describedby` is joined after the description and error ids.
- `disabled` is the native attribute: the browser disables every form control inside, with no
  context (only on a real `<fieldset>`: a `render` element gets `data-disabled` alone).
- The description and the error are announced on entering the group through the fieldset's
  `aria-describedby`. Fieldset writes no `aria-invalid` or `aria-required`: neither is allowed on
  role `group`.
- **RadioGroup** renders `<Fieldset role="radiogroup" …>` (allowed on `<fieldset>`), where it may
  add `aria-required` and `aria-invalid`; it passes its own error as `error` and gives its radios
  `name` from its own context. **Checkbox groups** use Fieldset as it is. Neither calls
  `useFieldControl` for the group.
- DOM order matches Field (legend, controls, description, error), not GOV.UK's hint-before-items
  (builder default, for one anatomy across Field and Fieldset).

## Shared helpers

`_internal/field.ts` (no directive): `presented(node)` (does an error or description node render
anything) and `joinIds(...ids)` (an `aria-describedby` value, or `undefined`). A control that joins
its own ids (a count, an affix) may use `joinIds`. No other shared control helper exists yet; add
one to `_internal/` only when two controls need the same non-Field code.

## Not yet (follow-ups)

- `form.reset()` does not clear a shown native message (§9.6 case 5 will catch it).
- Select's native validation message: React Aria cancels the hidden `<select>`'s `invalid` event,
  so an empty required Select blocks the submit and takes focus with no inline message.
- RadioGroup and checkbox groups have no native-validation path through Fieldset; RadioGroup owns
  its group message.
- `Form errors[name]` (v0.2) joins the error channel between the `error` prop and the native message.
  Form's planned focus move to the first invalid control after a Server Action (gap report A §2.5)
  must run after the errors commit, or the control is read without its error (see "Outside the
  rule" above).
- The announcer's speech in real screen readers (NVDA, JAWS, VoiceOver on macOS and iOS, TalkBack)
  is not verified: the browser tests check the DOM and Chromium's accessibility tree only (the
  accessibility owner's manual pass, NIZ-78).
