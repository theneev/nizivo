# @nizivo/react

## 0.4.0

### Minor Changes

- 2cdae5c: The AI kit gains its answer and agent parts (unstable): `ResponseBlock`
  (`@nizivo/react/unstable/response-block`) is one answer from thinking through streaming, with a Stop
  button, to complete or an error with Retry, read once when complete; `ToolCallCard`
  (`./unstable/tool-call-card`) shows an action the AI takes step by step, each step's status spoken;
  `FeedbackBar` (`./unstable/feedback-bar`) is a thumbs up and down that toggle, with optional reasons;
  `ApprovalCard` (`./unstable/approval-card`) asks before an action that cannot be undone, with focus on
  Cancel and Escape to cancel. ResponseBlock and ToolCallCard are server parts. Their strings join the
  unstable catalogue (`./locales/en-US-unstable`).
- fa0e7fe: The AI kit gains its controls (unstable): `ModelSelector` (`@nizivo/react/unstable/model-selector`)
  picks a model by its trade-off in words, on Select; `InlineAssist` (`./unstable/inline-assist`) is a
  toolbar of AI actions for selected text, with one Tab stop and the arrow keys; `VoiceOrb`
  (`./unstable/voice-orb`) is voice mode, a written state and one start and stop button, with a CSS
  orb that an `orb` slot can replace. VoiceOrb is a server part. Their strings join the unstable
  catalogue (`./locales/en-US-unstable`).
- 74451f5: The AI kit gains the conversation (unstable): `ChatMessage` and `ChatLog`
  (`@nizivo/react/unstable/chat-message`) are a turn with its sender named in text and the
  `role="log"` live region that holds them; `PromptComposer` (`./unstable/prompt-composer`) is a
  growing textarea with tools and a send button, Enter to send and Shift+Enter for a line;
  `AiWelcome` (`./unstable/ai-welcome`) is a new conversation's empty state. ChatMessage, ChatLog and
  AiWelcome are server parts. Their strings join the unstable catalogue (`./locales/en-US-unstable`).
- 63c8cf8: The AI kit begins (unstable, Figma's AI page), with six server parts and no client JavaScript:
  `AiBadge` (`@nizivo/react/unstable/ai-badge`) says content was written or changed by AI, in the lime
  that marks AI; `ThinkingIndicator` (`./unstable/thinking-indicator`) is the wait before the first
  word, a polite status with CSS dots; `Citation` (`./unstable/citation`) links a claim to its source,
  named "Source 1: …"; `SourceCard` (`./unstable/source-card`) is a web page or file as one link;
  `SuggestionChip` and `SuggestionGroup` (`./unstable/suggestion-chip`) are prompt starters that fill
  the composer; `UsageMeter` (`./unstable/usage-meter`) shows AI usage left on a Meter that warns from
  80 %. Their strings join the unstable catalogue (`./locales/en-US-unstable`).
- 9b7590a: v0.5 adds Figma's Link and docs-site parts (unstable): `Link` (`@nizivo/react/unstable/link`),
  underlined navigation in text that says when it opens a new tab; `DocsCard`
  (`./unstable/docs-card`), an entry point into documentation as one link; `CopyButton`
  (`./unstable/copy-button`), which copies text and announces "Copied" for 2 seconds; and `CodeBlock`
  (`./unstable/code-block`), copyable commands or snippets on a dark surface with versions as tabs.
  Link and DocsCard are server parts. Their strings join the unstable catalogue (`./locales/en-US-unstable`).
- d9526ea: Labels sit in the middle of their box. In Chromium, Geist's letters sat about 0.055em above the
  middle of every centred control (0.77 px at 14 px). Labels now take
  `text-box: trim-both cap alphabetic` with `padding-block: calc((1lh - 1cap) / 2)` inside
  `@supports (text-box: …)`: each box keeps its height and only the letters move (Chromium 133+,
  Safari 18.2+; other browsers are unchanged). Badge, Kbd, Breadcrumb, Pagination's pages,
  AvatarGroup's overflow, Table's sort button and RankedList's action now wrap their text in a new
  slot (`badge-label`, `kbd-label`, `breadcrumb-text`, `pagination-page-text`,
  `avatar-group-more-text`, `table-sort-text`, `ranked-list-action-text`); CSS that targets these
  parts' text as a direct child of the part needs the new span. The unstable AiBadge, SuggestionChip,
  Tag, ToolCallCard, InlineAssist, Comment, Citation and LivePulse do the same. ToolCallCard's steps
  sit 6 px under its header and its actions 16 px under the steps, and a BentoTile narrower than
  360 px keeps its caption 16 px in and padded 16.
- c69db58: v0.6 adds three more marketing parts (unstable): `CtaBand` (`@nizivo/react/unstable/cta-band`), a
  closing heading, line and two actions on a band dark in both themes; `SiteFooter`
  (`./unstable/site-footer`), a footer whose link columns are navs named by their headings and that
  stacks when narrow; and `NewsletterSignup` (`./unstable/newsletter-signup`), an
  email form with a visible label, inline validation and an announced success. NewsletterSignup's
  strings join the unstable catalogue (`./locales/en-US-unstable`).
- 01abc25: v0.6's last marketing parts (unstable): `BentoTile` (`@nizivo/react/unstable/bento-tile`), a
  showcase tile with a frosted caption card, wide, square or tall in a 12-column grid; and
  `SiteNavbar` (`./unstable/site-navbar`), a website's main navigation as a bar or a floating pill,
  its links folding into a native `<details>` menu below 768 px. Both are server parts.
  SiteNavbar's strings join the unstable catalogue (`./locales/en-US-unstable`).
- 98b8cc3: v0.6 begins (unstable, Figma's Marketing page) with five server parts: `AnnouncementBar`
  (`@nizivo/react/unstable/announcement-bar`), one site-wide message with a link and a named close
  button; `SectionHeader` (`./unstable/section-header`), a section's heading and supporting line;
  `FeatureCard` (`./unstable/feature-card`), one benefit, plain, tinted or inverse; `StatBlock`
  (`./unstable/stat-block`), a headline number and its label, for a `<dl>`; and `TestimonialCard`
  (`./unstable/testimonial-card`), an attributed quote in a figure. AnnouncementBar's strings join
  the unstable catalogue (`./locales/en-US-unstable`).
- 7cf2148: Figma's CSS motion parts (unstable; D-dq): `Ticker` (`@nizivo/react/unstable/ticker`), an endless
  strip that pauses under the pointer or focus; `CaretHeadline` (`./unstable/caret-headline`), a
  heading with a blinking caret; `LivePulse` (`./unstable/live-pulse`), a pulsing dot beside its words;
  and `WordRotator` (`./unstable/word-rotator`), a headline keyword that turns over while a screen
  reader hears every word once. Every loop stops under Reduced motion. The first three are server
  parts.
- b01beae: v0.5 adds three more server parts (unstable): `Comment` (`@nizivo/react/unstable/comment`), a
  comment with Like (a toggle named with its count) and Reply, and its replies indented under it;
  `EventCard` (`./unstable/event-card`), an event with a presentational date block, a full `<time>`,
  when and where, and who is going; `ProfileCard` (`./unstable/profile-card`), a person with a cover,
  the name as the heading, counts as a description list and one action. Their strings join the
  unstable catalogue (`./locales/en-US-unstable`).
- 2cece3c: v0.5 begins (unstable, Figma's Data Display and Product Patterns pages) with four server parts:
  `Tag` (`@nizivo/react/unstable/tag`), a filter chip or removable token with a pressed check and a
  named remove button; `Rating` (`./unstable/rating`), a read-only score read as one sentence;
  `NotificationItem` (`./unstable/notification-item`), an activity row as one link that says
  "Unread"; `FileItem` (`./unstable/file-item`), an upload with real progress, a success mark or a
  written error, and cancel and retry buttons. Their strings join the unstable catalogue (`./locales/en-US-unstable`).
- 69e57df: v0.5 adds two client parts (unstable): `Slider` (`@nizivo/react/unstable/slider`), a value in a
  range on a native `<input type="range">` with its name and value written out and read as
  `aria-valuetext`; and `MediaPlayer` (`./unstable/media-player`), controls for audio or video that
  hold no media of their own, with a Slider scrubber read in minutes and seconds, a play button whose
  name follows its icon, and back and forward. MediaPlayer's strings join the unstable catalogue (`./locales/en-US-unstable`).
- bac9b4e: The unstable parts' built-in strings have their own catalogue, `@nizivo/react/locales/en-US-unstable`
  (`enUSUnstable`, shaped like `enUS`), so `./locales/en-US`, and a translation typed `typeof enUS`,
  changes only with the stable parts. CommandMenu's and DateRangePicker's strings, which shipped in
  `enUS` with 0.3.0, stay there. `NizivoLabels` (`@nizivo/react/config`) covers both catalogues, so
  `NizivoConfig labels` still reaches every client part, unstable ones included.

### Patch Changes

- 38649de: DateRangePicker and CommandMenu (both unstable) load their React Aria parts on the first open, in a
  chunk of their own: a page ships the picker's trigger and presets without the calendar (the
  `./unstable/date-range-picker` entry drops from 61 to 37 KB gzip), and the menu's trigger and Dialog
  without the search (`./unstable/command-menu` from 57 to 34 KB). A placeholder holds each part's
  place while it loads, and on a first open with no presets the calendar takes focus when it arrives.
- Updated dependencies [9981305]
  - @nizivo/tokens@0.4.0

## 0.3.0

### Minor Changes

- bc2bae7: Accordion (`@nizivo/react/accordion`): sections that open and close under their headings, with no
  client JavaScript. Each `Accordion.Item` is a native `<details>` with an `Accordion.Trigger`
  summary and an `Accordion.Panel`; `Accordion.Root name` makes the items exclusive through
  `<details name>`, and `defaultOpen` opens one on the first render.
- 251ef52: BulkActionBar (`@nizivo/react/bulk-action-bar`): the bar over a selectable table, with how many rows
  are selected and the actions. A server part: inside TableSelection, its island writes the count ("2
  selected", announced politely) as the selection changes, and the actions work before hydration
  through the rows' form. `labels.selected` (catalogue key `bulkActionBar`) and `locale` set the
  count.
- f647e89: Combobox (`@nizivo/react/combobox`): a text input that suggests items from a list as the reader
  types, on React Aria's ComboBox. `Combobox.Root` draws Input's box around `Combobox.Input` and an
  optional `Combobox.Trigger`; `Combobox.Popup` holds `Combobox.Item`s with Groups, GroupLabels and
  Separators, in Select's popup and rows. The list filters with a "contains" match in the locale; the
  input keeps focus while the arrow keys move the active item; Enter chooses and Escape reverts.
  `value` and `inputValue` are controllable, `allowsCustomValue` accepts any text, `menuTrigger` sets
  when the list opens, and a hidden input carries the chosen value into forms. It joins the
  react-aria overlay family and passes its conformance suite. Field wiring as Input.
- 3579126: CommandMenu (`@nizivo/react/unstable/command-menu`, unstable): Figma's Command Menu, a search field
  over groups of rows in the Dialog, filtered as the reader types (React Aria's Autocomplete). ⌘K (Ctrl+K
  elsewhere) or `CommandMenu.Trigger` opens it; rows are links or actions with an icon, a kind and a
  shortcut. Unstable until async sources, a per-group cap and the lazy chunk land.
- 533f6dd: DataView (`@nizivo/react/data-view`): the same records as a table on a wide view and as a list on a
  narrow one, with no client JavaScript. The server renders both and a container query on the root
  shows the table from 40rem of its own width, the list below. `DataView.Item` rows follow Figma's
  Order List Item, with an optional stretched `DataView.ItemLink`.
- 565e10b: DateRangePicker (`@nizivo/react/unstable/date-range-picker`, unstable): a range of ISO plain dates
  from a trigger in Select's look, through Figma's popover with presets, one month of React Aria's
  RangeCalendar and Cancel and Apply. "Today" counts in the required `timeZone`; the form gets the ISO
  interval `start/end`. Unstable until design draws the unavailable day and a comparison period.
- 3579126: `@nizivo/react/hotkeys`: keyboard shortcuts in one page-wide registry (`registerHotkey`, `useHotkey`,
  `useHotkeys`), written as Kbd takes them (`"mod+k"`) and matched by tinykeys. Never during an IME
  composition, not while typing unless `allowInInputs`, and a single printable key warns in
  development (WCAG 2.1.4).
- 0814649: NumberField (`@nizivo/react/number-field`): a number in the reader's locale, a price, a percent or
  a unit, in Input's box, on React Aria's NumberField. `formatOptions` takes `Intl.NumberFormat`
  options; what is typed is parsed in the locale on blur or Enter, clamped to `min` and `max`,
  snapped to `step` and formatted, and the server HTML already shows the formatted value. A hidden
  input carries the plain number into forms. `NumberField.Decrement` and `NumberField.Increment` add
  optional step buttons, out of the tab order and named by React Aria ("Increase Price"); `labels`
  replaces the names. Field wiring as Input.
- 100cf18: PageIndicator (`@nizivo/react/page-indicator`): where a carousel or a sequence is, as dots or a
  "2 / 9" chip, with no client JavaScript. The visual is decorative and a visually hidden "2 of 9"
  says the position (`labels.position`, catalogue key `pageIndicator`). `tone="media"` sits on a
  photo, on `bg/code` and `text/on-dark` until design adds on-media tokens.
- 533f6dd: PointerFx and `usePointerFx` (`@nizivo/react/pointer-fx`): an element that tilts toward a mouse
  pointer and lifts (`effect="tilt"`), or leans toward it (`effect="magnetic"`). The hook writes
  `--nz-pointer-x` and `--nz-pointer-y` once per frame; touch, pen and reduced motion leave the element
  still, and the server renders only `data-pointer-fx`.
- 2a535ec: QuantityStepper (`@nizivo/react/quantity-stepper`): a whole-number quantity in Input's box between a
  minus and a plus button. The input is a native number input, so Tab reaches only it and the arrow
  keys step it; the buttons, out of the tab order, step it for the pointer, fire the native `input`
  and `change` events and are disabled at the ends of the range. Field wiring as Input, and
  `labels.decrement` / `labels.increment` ("Decrease quantity" / "Increase quantity") in the `quantityStepper` catalogue
  key.
- 533f6dd: Surface (`@nizivo/react/surface`): a panel of the page's surface colour, with no client JavaScript.
  `material="glass"` is Figma's Surface/Glass, `bg/surface` at 72 % over a 24 px backdrop blur with a
  soft shadow; it stays opaque without `backdrop-filter` (Safari before 18), under
  `prefers-reduced-transparency: reduce` and in forced colours.

### Patch Changes

- @nizivo/tokens@0.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [79d72f3]
  - @nizivo/tokens@0.2.1

## 0.2.0

### Minor Changes

- 9b276eb: Add the app shell. `Sidebar` (`@nizivo/react/sidebar`): the main navigation from 640 px, 264 px wide from 1280 px and a 72 px icon rail below that, through CSS only; `collapsed` keeps either width; `SidebarItem` is a NavItem whose Tooltip shows its label in the rail. `TopBar` and `MobileTopBar`: the bars above the page, with slots for the title, the search and the actions. `MobileTabBar` (`@nizivo/react/mobile-tab-bar`): five destinations at the bottom below 640 px, with `MobileTabBarMore` opening the rest in a bottom sheet, and an island that writes the bar's height to `--nz-layout-bottom-inset`. `AppShell`: places them, shows each at its widths, and renders the page's `<main>` and a skip link. NavItem now folds to the rail inside a rail-narrow Sidebar (a size container query) instead of under any `data-collapsed` ancestor. StickyBar and the toast region no longer add the safe area twice above a tab bar.
- 563ac5b: Banner (`./banner`): a page-wide message under the header, `tone` `brand` (Figma's Promo) or `warning`, with a `title`, a line of text, a 72 px `media` picture or an `icon`, one `action` and an optional `BannerDismiss`. Server-rendered and static; only the dismiss button hydrates, and it calls `onDismiss` for your code to stop rendering the banner. No live role by default.
- 43444d0: Card, and so KpiTile and TrendCard, declares `--nz-surface`, the surface colour it paints in every tone (a `--nz-card-bg` override included), for any child to read with a fallback, such as `var(--nz-surface, var(--nz-bg-surface))`; it is not a token and is undefined outside a Card. On `tone="brand"` and `tone="accent"`, a Delta pill inside the Card is `bg/surface` (the nearest Card decides), so it shows on the tint (Figma draws it in `bg/success-subtle`, which equals `bg/brand-subtle`); its text colour is unchanged. Text and Heading `tone="accent"` are deprecated in favour of `tone="brand"`, which paints the same colour; they keep working.
- 2d3ec64: The dashboard parts (M41), each on its own subpath with its own stylesheet: NumberValue and `formatNumber` (`./number-value`), Metric (`./metric`), KpiTile (`./kpi-tile`), TrendCard (`./trend-card`) and RankedList (`./ranked-list`), server components that ship no client JavaScript under React Server Components and keep their box in the loading, empty and error states; CountUp and `useCountUp` (`./motion`), the one client part, which renders the final value on the server and counts on the client (0 ms under reduced motion); and Avatar with AvatarGroup (`./avatar`), Breadcrumb (`./breadcrumb`) and Pagination (`./pagination`), server components. Card gains `tone="brand"` and `tone="accent"`, the tinted surfaces of the dashboard widgets; its other tones are unchanged.
- e88d7bf: FileUpload (`./file-upload`): a dropzone over a native `<input type="file">`, with a list of the chosen files. Before hydration a click or a drop chooses files natively and a plain form submits them; hydrated, each pick or drop is checked against `accept` and `maxSize` (refused files get a message under the dropzone and reach `onReject`), `multiple` adds to the list, and the component writes the list back into the input so the form submits exactly what is listed. It never uploads: `onFilesChange` gives each held file with an id, and the app passes each upload's state back as `items` (`uploading` with a ProgressBar, `complete`, or `error` with Retry), with `onRemove`, `onRetry` and `onCancel`. Inside a Field it is labelled, described and validated natively, `required` included. Every string is in `labels`. The drop target is React Aria's `useDrop`, behind an engine contract; the dropzone carries the new `data-drag-over` attribute while files are dragged over it.
- 1fc3213: Form, SubmitButton and FormMessage (`./form`), and PasswordInput (`./password-input`). `Form` is an optional client `<form>`: its `errors`, keyed by Field `name` (a server action's field errors), appear in each Field after the Field's own `error` and before the native message, until the user edits that control; a new `errors` object moves focus to the first invalid control, or, with `summary`, to an error summary that links to each control. Native validation stays on. `SubmitButton` is a primary submit Button that is `pending` while its form's action runs (`useFormStatus`). `FormMessage` is a server part: the form-level message in a live container that is always rendered (`role="alert"` for `critical`, else `role="status"`). `PasswordInput` is a password input in Input's box with a show/hide toggle that keeps the name "Show password" and reports its state through `aria-pressed`; the password is hidden again when its form submits. Field reads Form's errors; a Field outside a Form is unchanged.
- 8ecdc09: `NizivoConfig` takes `labels`, shaped like the `enUS` catalogue (`NizivoLabels` from `@nizivo/react/config`: keyed by component, every key and string optional, so a whole catalogue of another locale fits). The client parts read it: BannerDismiss, ChipGroup, Dialog.Close, Drawer.Close, FileUpload, Form, MobileTabBarMore, PasswordInput, Popover.Close, SearchField and Toaster. A part's own `labels` prop still wins key by key, and without a provider every part shows its English default, as before. Server parts (Pagination, Button, Breadcrumb and the others) cannot read a context and keep per-instance `labels`; the Strings and locales guide shows the one-file wrapper that passes them the same catalogue. AlertDismiss and SubmitButton do not read the provider yet.
- e6b2e63: Strings and locales. `@nizivo/react/i18n` exports `formatLabel(template, values, locale = 'en-US')` and the `PluralLabel` type: a label is a string or a CLDR plural object (`{ one, few, many, other }`, the categories of its locale), `values.count` picks the category through `Intl.PluralRules`, and each `{name}` placeholder is replaced (numbers formatted for the locale, unknown placeholders kept). `@nizivo/react/locales/en-US` exports `enUS`, every built-in English string as one plain object keyed by component (`enUS.pagination`, `enUS.avatarGroup`, …), the shape an app copies for its own locale and passes as `labels`; the root entry does not re-export it. AvatarGroup's `labels.more` and `labels.overflow` (the only labels whose default has a `{count}` placeholder) now take `string | PluralLabel`; their English defaults and every other label are unchanged.
- c1931f7: Add `PageHeader` (`@nizivo/react/page-header`): the page's one `<h1>`, an optional status beside it and a line under it, and the page's controls at the row's end; Heading/H2's size under 40rem. Add `Table` (`@nizivo/react/table`): native table parts with no client JS, rows that link as a whole (`interactive` and `Table.RowLink`), sorting through the URL (`Table.SortButton`, `aria-sort`), and `numeric` columns in tabular figures.
- 1ee7cd4: Add `onPageChange` to `Pagination`, for client state with no URL: each page, previous and next is then a `<button type="button">`, and choosing another page calls `onPageChange(page, details)` with no navigation; the ends are disabled buttons. `getHref` becomes optional (give one of the two). Pagination stays server-safe: a Server Component still uses links and ships no client JavaScript.
- b198228: Popover (`./popover`) and Drawer (`./drawer`), client parts on React Aria in the overlay family. Popover is a dialog anchored to its trigger (`side`, `align`, `sideOffset`; Title, Description and a default close IconButton in the corner); Escape or a press outside closes it and focus returns to the trigger. Drawer is a modal panel at an edge, `side="start" | "end" | "bottom"` (the bottom sheet), with Header, Title, Description, Body (the only scroller), Footer and a default close IconButton; it locks page scroll, keeps focus inside, returns it on close (`returnFocus`, as Dialog's), and only fades under reduced motion. Both nest with Dialog, Select, Menu and Tooltip: an overlay opened inside one paints above it, and Escape and an outside press close only the topmost.
- 40b5d1a: SearchField (`./search-field`): a `<search>` landmark around a native `<input type="search">`, 32, 40 or 48 px, with a magnifier, a clear button (Escape clears too, in every engine) and an optional `shortcut` drawn with Kbd and announced through `aria-keyshortcuts`; `pending` shows a spinner. In a `<form method="get">` it filters with no JavaScript; inside a Field it is labelled, described and validated by the Field. ChipGroup and Chip (`./chip-group`): pill choices as native radios, or checkboxes with `multiple`, with a `leading` swatch slot and an `unavailable` chip that keeps its colour, is struck through and can still be chosen; a group control (Field `group`). ChoiceCardGroup and ChoiceCard (`./choice-card`): cards around real visible radios, with `leading`, `description` and `trailing` slots (a "Default" Badge is composition); a Field's error marks the chosen card invalid. Selection never changes a chip's or card's size. NavItem (`./nav-item`): a server-safe sidebar link, `aria-current="page"` when `current`, a router link through `render`, an `icon`, a `count` and `disabled`, at a fixed 40 px; an ancestor's `data-collapsed` (the future Sidebar's) folds it to the icon rail.
- c5ced7c: Add `Split` (`@nizivo/react/split`): a main column and an aside (360 px, or 232 px with `aside="narrow"`) that sit side by side while the main column keeps 60 % of the row and stack below that, by the Split's own width, with no script. Add `StickyBar` (`@nizivo/react/sticky-bar`): a summary and actions that stick to the bottom of the viewport, above the device's safe area and the shell's bottom chrome. Both are server components with no client JavaScript.
- 4d186f8: Add `@nizivo/react/table-selection`, row selection for `Table`: `TableSelectRow` and `TableSelectAll` are native checkboxes rendered on the server, so a bulk action's form receives the selected ids before any JavaScript runs, and a checked row shows `bg/brand-subtle`. `TableSelection`, its one client part, adds the select-all box's checked and mixed state, Shift-click ranges, Escape to clear and `onSelectionChange`. A page that imports only `@nizivo/react/table` loads no client module. Add `Table.Container`'s `label`, which makes a wide table a named, focusable scroll region.
- b78c25e: Toast (`./toast`): `toast(message, options)` shows a short message bottom-centre, `tone` neutral, success or critical, with an optional `description` and one `action`; `toast.dismiss(id?)` removes one or all. Render one `<Toaster />` in the root layout. A toast with an action, or a critical one, stays until dismissed; any other leaves after 5 s, its time stopped while the pointer or focus is on the stack and while the page is hidden. Each toast is spoken once through the Toaster's announcer (assertive when critical), and `announce(message, politeness)` speaks through it too. The stack is in the top layer above every overlay and stays reachable over a modal Dialog: F8 moves focus to it and back, Escape dismisses the focused toast, and its height keeps focused controls from scrolling under it (`--nz-toast-inset`).

### Patch Changes

- 79c1528: Menu, Select, Popover, Tooltip, Dialog and Drawer close when a hidden `<Activity>` hides them, as Next's `cacheComponents` hides a route: `onOpenChange(false, { reason: 'hidden' })` fires, an uncontrolled overlay closes itself, and it is closed when the route is shown again. Before, the page could stay scroll-locked and the overlay reopened on return; on React 19.2 the popup also stayed on screen. A Toaster inside a hidden route hides its stack until the route is back.
- 85195f3: A Menu or Select opened with the pointer inside a Dialog, while focus was on another control of that Dialog, now returns focus to its own trigger when it closes, on Escape or on a press outside it. Before, focus went to the control that had it before the press, and after an outside press to the Dialog's first control.
- 6c5aaac: A Select, Menu or Dialog opened inside a Dialog now closes on a press outside it, as Escape already closed it; since 0.1.0 such a press did nothing. Presses inside the toast region and on a tooltip still dismiss nothing, and an alertdialog still never closes on an outside press.
- a5b048a: Text and Heading `tone="accent"` now paint `--nz-text-brand`, Figma's `text/brand`: the same green/700 in Light, and green/300 (#79b993) instead of lime/300 in Dark. `--nz-text-accent` is deprecated because Figma will not add `text/accent` (accent text on `bg/inverse` uses `--nz-text-inverse-accent`), and it is removed in 0.2.0.
- Updated dependencies [001e1b4]
- Updated dependencies [a5b048a]
  - @nizivo/tokens@0.2.0

## 0.1.0

### Minor Changes

- 044c0b6: 0.1.0: foundations, forms and core overlays, the first release.

  - `@nizivo/tokens`: `tokens.css` with `light-dark()` themes, the accessibility overrides and the contrast gate; `custom-media.css`, the Tailwind theme and `contract.json`; `tokens.json` (every token's literal value per theme and mode) and the typed `var()` references of the `.` entry.
  - `@nizivo/react`: Button and the server-safe text, layout, display and feedback components; the Field system and the native form controls (Input, Textarea, NativeSelect, Checkbox, RadioGroup, Switch), SegmentedControl and IconButton; ThemeScript, which restores the saved theme (`localStorage` `nz-theme`) and sets `data-nz-platform` before first paint; Select, Dialog, Tooltip, Menu and Tabs on React Aria (a bare `Dialog.Close` is an IconButton, so Dialog's stylesheets include `css/icon-button.css`; a bare `Dialog.Trigger` or `Tooltip.Trigger` is at least 24 x 24 px; `Tabs.Root` takes `dir` for a strip whose direction differs from its locale's), and the server-safe TabNav. Input, Textarea, NativeSelect and the Select trigger use 16 px text under a coarse pointer, so iOS Safari does not zoom into them. One stylesheet per component, compiled by Lightning CSS, with the generated accessibility floor in `base.css`, or everything in one import through `@nizivo/react/styles.css` (tokens included).
  - `@nizivo/icons`: every Lucide icon at the Nizivo stroke plus the Instagram brand glyph, one server-safe module per icon.

### Patch Changes

- Updated dependencies [044c0b6]
  - @nizivo/tokens@0.1.0
