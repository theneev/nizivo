# `component.json` reference

Every component folder (`packages/react/src/<name>/`, or `src/unstable/<name>/`) has a
`component.json`. `nz gen` validates it (`gen/schema.ts`) and derives the barrels, `engine.ts`, the
exports map and `design/component-map.json` from it (ARCHITECTURE.md §6). The `nz.base` a11y floor
in `css/base.css` is generated from `interactive`, `focusTarget` and `stateIndicator` (§8.5); this
file fixes what those fields hold and what each one produces.

`pnpm gen:check` fails on any invalid field, naming the file, the field and what was expected.

## Fields

| Field            | Required           | Shape                                                            |
| ---------------- | ------------------ | ---------------------------------------------------------------- |
| `name`           | yes                | kebab-case; equals the folder name                               |
| `status`         | no (`stable`)      | `stable` \| `unstable` (`unstable` lives in `src/unstable/`)     |
| `tier`           | yes                | `server` \| `client` \| `engine` \| `own` (below)                |
| `engine`         | with tier `engine` | kebab-case engine family, such as `react-aria`                   |
| `overlay`        | no                 | `true` for the overlay family; needs tier `engine`               |
| `parts`          | with tier `engine` | PascalCase part names; exported as `<Pascal><Part>`              |
| `exports`        | no                 | values of a multi-export subpath, such as `["Grid", "GridItem"]` |
| `interactive`    | no                 | `data-slot` values (below)                                       |
| `focusTarget`    | no (`self`)        | a mode, or `{ "<slot>": mode }` (below)                          |
| `stateIndicator` | no                 | `{ "slot", "state"?, "paint" }` objects (below)                  |
| `cssDeps`        | no                 | CSS files this component needs, such as `["base"]`               |
| `variants`       | no                 | `{ "<prop>": ["<value>", …] }`, copied to the component map      |
| `figma`          | no                 | `canonical`, `ghosts`, `variantsSeen`, `related`: node ids       |
| `budget`         | no                 | `measuredKB`, `limitKB`, `source`                                |

`adapter` is rejected until v0.2 defines the second adapter's file layout. Unknown keys are errors. `budget` is accepted but read by nothing: since week 5 the size budgets are derived from the package exports and live in `packages/tooling/size/budgets.json` (D-ah), and no manifest carries one.

## `tier`

The behaviour source from §9.5, not a file's directive: a `server` component may still own
`*.client.tsx` leaves (§9.5's "split").

| `tier`   | §9.5                                    | Examples                                                                       | Extra checks                                                                                                                                                                 |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server` | T0, RSC "server" or "split"             | Button, Text, Card, Badge, ProgressBar, NativeSelect, IconButton, Alert, Field | none                                                                                                                                                                         |
| `client` | T0 native element in a thin client leaf | Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl                | none                                                                                                                                                                         |
| `engine` | T1                                      | Select, Dialog, Tooltip, Menu, Tabs, Popover                                   | `engine` and `parts` required; `<Pascal>Engine` exported from `<name>.contract.ts`; adapter at `_engines/<engine>/<name>.client.tsx`; `overlay` engine equals `engines.json` |
| `own`    | T2, our code on platform APIs           | Toast, FileUpload, TableSelection, CountUp                                     | none                                                                                                                                                                         |

`engine` is allowed only with tier `engine` today. §9.5 puts Toast and FileUpload (`own`) behind an
engine contract; allowing `engine` on `own` is a v0.2 schema change.

## Slots

Every slot in `interactive` and `stateIndicator` is a full `data-slot` value: the element's class
minus `nz-` (§8.2). It must equal the component name or start with `<name>-`. A subpath with
several `exports` may also use each member in kebab-case, so `grid` (Grid, GridItem) can name
`grid-item`. A root's slot is the bare name: `Select.Root` is `select`, not `select-root`. Internal elements that carry a `data-slot` (a switch thumb, a
progress fill) are slots too, even though they are not `parts`.

## `interactive`

The slots a keyboard or pointer user operates: buttons, triggers, close buttons, collection items,
the visible part of a native control, a label wrapping a hidden input, a group around an editable
field. Each one gets, in `@layer nz.base`:

- the focus outline for its `focusTarget` mode (next section), with
  `outline: var(--nz-border-width-focus) solid var(--nz-border-focus); outline-offset: 2px;`
- `touch-action: pan-x pan-y pinch-zoom` (§8.5, survives a blocked engine `<style>` under strict CSP),
  except slots in `within` mode, which wrap an editable field.

Leave it out (or `[]`) for components nobody operates: layout, text, Badge, Skeleton.

The 44 px coarse-pointer hit area is **not** derived from this list. It is the static
`.nz-hit-target` rule; a standalone pressable adds the `nz-hit-target` class in its markup (Button,
the Select trigger). Items and rows inside a list do not, because an expanded hit area would overlap
their neighbours. `::after` stays reserved for it.

## `focusTarget`

| Mode           | Selector `base.css` gets                                                          | Use for                                                                                                                                                                                                                                                                                |
| -------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `self`         | `:where(…):is(:focus-visible, [data-focus-visible])`                              | an element that takes focus itself: buttons, triggers, native inputs                                                                                                                                                                                                                   |
| `engine`       | `:where(…):focus-visible { outline: none }`, then `:where(…)[data-focus-visible]` | a collection item whose DOM focus the engine moves by script (to the list on open, to the item under the pointer): Select and Menu items. Chromium matches `:focus-visible` on that script focus after a pointer open, so only the adapter's `data-focus-visible` report (§8.3) counts |
| `nested-input` | `:where(…):is(:has(> input:focus-visible), [data-focus-visible])`                 | a visible `<label>` wrapping a hidden native radio or checkbox: a SegmentedControl item, Chip, ChoiceCard. WebKit matches no `:focus-visible` on a radio reached by an arrow key, so the component sets `data-focus-visible` on the label then                                         |
| `within`       | `:where(…):focus-within`                                                          | a group that draws the outline for the field inside it (the Input box); the inner field draws none                                                                                                                                                                                     |

A string applies to every `interactive` slot. Mixed components map each slot, and the keys must be
exactly the `interactive` slots: `{ "chip": "self", "chip-group": "within" }` (illustrative). Without
`interactive`, `focusTarget` is an error. `focusTargetOf(config, slot)` in `gen/schema.ts` resolves a
slot's mode.

## `stateIndicator`

Forced colours replace backgrounds and drop shadows (§8.5, §15.1). List every slot whose state, or
whose edge, is painted with a fill or a shadow. Each entry becomes one rule inside
`@media (forced-colors: active)` in `@layer nz.base`: `.nz-<slot><state> { <paint> }`.

| `paint`     | Declarations                                                                                        | For                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `border`    | `border: 1px solid CanvasText`                                                                      | an edge drawn by a fill or a shadow: overlay popups, a toast, native checkbox, radio and switch inputs |
| `fill`      | `background: Highlight; forced-color-adjust: none`                                                  | a shape whose fill is the state: a checked input, progress and meter fills                             |
| `highlight` | `background: Highlight; color: HighlightText; outline-color: CanvasText; forced-color-adjust: none` | an item with text whose background marks the state: selected Select and Menu items                     |
| `mark`      | `background: CanvasText; forced-color-adjust: none`                                                 | a shape that must stay visible on any background: the switch thumb                                     |
| `outline`   | `outline: 2px solid Highlight`                                                                      | a selection drawn as a ring: the selected SegmentedControl item                                        |

`state` is optional (absent for an at-rest rule such as a popup border). It is a compound-selector
suffix appended to `.nz-<slot>`: it starts with `:` or `[` and has no `,` or braces. Use a vocabulary
attribute (`[data-selected]`, §8.3), a native or ARIA state from §8.3 rule 1 (`:checked`,
`:indeterminate`, `[aria-current="page"]`), `:has(> input:checked)` for a nested input, or a native
pseudo-element that paints the state (`::-webkit-progress-value`, `::-moz-progress-bar`). A vendor
pseudo-element must go in a rule of its own, because one unknown pseudo-element invalidates a whole
selector list. `nz gen` does not check names against `contracts/vocabulary.json`; the emitted-CSS
vocabulary check runs on the built `base.css`.

Rules: an exact repeat of slot, state and paint is an error, and every `"overlay": true` component
must list its popup edge, `{ "slot": "<name>-popup", "paint": "border" }` with no state.

## The W1 manifests

| Component | `interactive`                        | `focusTarget` | `stateIndicator`                                                                                                               |
| --------- | ------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| button    | `["button"]`                         | `"self"`      | `[]`                                                                                                                           |
| select    | `["select-trigger", "select-item"]`  | `"self"`      | `{ "slot": "select-popup", "paint": "border" }`, `{ "slot": "select-item", "state": "[data-selected]", "paint": "highlight" }` |
| dialog    | `["dialog-trigger", "dialog-close"]` | `"self"`      | `{ "slot": "dialog-popup", "paint": "border" }`                                                                                |
| tooltip   | `["tooltip-trigger"]`                | `"self"`      | `{ "slot": "tooltip-popup", "paint": "border" }`                                                                               |

They should generate this (selector order and grouping are the generator's choice). Since week 4 the
shipped Select maps `select-item` to `engine` (`{ "select-trigger": "self", "select-item": "engine" }`),
which moves `.nz-select-item` into a rule of its own, `:where(.nz-select-item)[data-focus-visible]`.

```css
@layer nz.base {
  :where(
    .nz-button,
    .nz-dialog-close,
    .nz-dialog-trigger,
    .nz-select-item,
    .nz-select-trigger,
    .nz-tooltip-trigger
  ):is(:focus-visible, [data-focus-visible]) {
    outline: var(--nz-border-width-focus) solid var(--nz-border-focus);
    outline-offset: 2px;
  }
  :where(
    .nz-button,
    .nz-dialog-close,
    .nz-dialog-trigger,
    .nz-select-item,
    .nz-select-trigger,
    .nz-tooltip-trigger
  ) {
    touch-action: pan-x pan-y pinch-zoom;
  }
  @media (forced-colors: active) {
    :where(.nz-dialog-popup, .nz-select-popup, .nz-tooltip-popup) {
      border: 1px solid CanvasText;
    }
    :where(.nz-select-item)[data-selected] {
      background: Highlight;
      color: HighlightText;
      outline-color: CanvasText;
      forced-color-adjust: none;
    }
  }
}
```

## Patterns for the next components

Illustrative; the component's own markup decides its slot names.

- **Checkbox** (`client`): `interactive: ["checkbox-input"]`; `stateIndicator`:
  `{ "slot": "checkbox-input", "paint": "border" }`,
  `{ "slot": "checkbox-input", "state": ":checked", "paint": "fill" }`,
  `{ "slot": "checkbox-input", "state": ":indeterminate", "paint": "fill" }`.
- **Switch**: as Checkbox, plus `{ "slot": "switch-thumb", "paint": "mark" }`.
- **SegmentedControl**: `interactive: ["segmented-control-item"]`, `focusTarget: "nested-input"`,
  `{ "slot": "segmented-control-item", "state": ":has(> input:checked)", "paint": "outline" }`.
- **Input**: the root is the bordered box, so it carries the component's own slot (§8.2):
  `interactive: ["input"]`, `focusTarget: "within"` on `.nz-input`, around the native
  `input.nz-input-control`, which draws no outline. **Textarea** and **NativeSelect** have no group:
  the native element is the box (`focusTarget: "self"`).
- **ProgressBar and Meter** (`server`, one subpath each): `{ "slot": "progress-bar-fill", "paint": "fill" }`
  for a drawn fill; on a native `<progress>` or `<meter>`, the pseudo-elements as `state` on the
  element's slot, one entry each (week 2 ships `progress-bar-track` and `meter-track` this way).
- **ProgressRing** (`server`): its arc is an SVG stroke, which no `paint` covers yet, so its
  `stateIndicator` is empty and `progress-ring.css` carries its forced-colours rules. That is an
  exception to §8.5 until a `stroke` paint lands.
- **Alert** (`server`, split): its dismiss button is `interactive` only if Alert renders it with its
  own class; a dismiss that renders `IconButton` is covered by IconButton's manifest.
- **Text, layout, Badge, Card, Skeleton**: no `interactive`, `focusTarget` or `stateIndicator`.
