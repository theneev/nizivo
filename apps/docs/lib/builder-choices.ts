// What the week 2, 3 and 4 components actually chose for each value the Figma facts leave to the
// builder (docs/figma/11-w2-server-safe-components.md, "builder decides"; docs/figma/12-w3-forms.md
// and 13-w4-menu-tabs.md §5). The facts file states the
// question; this file states the answer, with the declaration that ships it. The docs build fails
// when a "builder decides" item has no answer here, or when an answer's declaration is no longer in
// its stylesheet, so the Deviations page cannot drift from the CSS.
import { readRepoText } from './repo';

export interface BuilderChoice {
  /** The facts file's component heading (`Kbd`). */
  component: string;
  /** The facts file's table property (`Padding`), or '' for a bullet item. */
  property: string;
  /** What ships, as inline Markdown. */
  chosen: string;
  /** The public hook that sets the value, when there is one. */
  hook?: string;
  /** The stylesheet that ships it, and declarations it must contain. */
  file: string;
  declarations: string[];
}

const src = (name: string): string => `packages/react/src/${name}/${name}.css`;

const CHOICES: BuilderChoice[] = [
  {
    component: 'Kbd',
    property: 'Padding',
    chosen:
      'Block `1px`, a literal (no space token is 1 px), which keeps the 24 px box; inline `--nz-space-1-5` (6 px).',
    file: src('kbd'),
    declarations: ['padding-block: 1px;', 'padding-inline: var(--nz-space-1-5);'],
  },
  {
    component: 'Badge',
    property: 'Padding',
    chosen:
      'Snapped to `--nz-space-0-5` (2 px) block and `--nz-space-2` (8 px) inline, so the badge is 24 px tall, not 26.',
    hook: '--nz-badge-padding-inline',
    file: src('badge'),
    declarations: [
      'padding-block: var(--nz-space-0-5);',
      'padding-inline: var(--nz-badge-padding-inline, var(--nz-space-2));',
    ],
  },
  {
    component: 'Card',
    property: '',
    chosen:
      'Every tone keeps the 1 px border box, as Surface does; Subtle and Inverse paint it `transparent`, so they draw no stroke and no tone changes size.',
    hook: '--nz-card-border',
    file: src('card'),
    declarations: [
      'border: var(--nz-border-width-default) solid var(--nz-card-border, var(--_nz-card-border));',
      '--_nz-card-border: transparent;',
    ],
  },
  {
    component: 'Delta',
    property: 'Padding',
    chosen:
      'Both sides `--nz-space-2` (8 px), since 10 is off the scale; block `--nz-space-1` (4 px).',
    hook: '--nz-delta-padding-inline',
    file: src('delta'),
    declarations: [
      'padding-block: var(--nz-space-1);',
      'padding-inline: var(--nz-delta-padding-inline, var(--nz-space-2));',
    ],
  },
  {
    component: 'ProgressBar',
    property: 'Success, Neutral',
    chosen:
      'Settled by Figma on 2026-10-18: success fills with `--nz-chart-success` and neutral with `--nz-chart-neutral`, the chart variables Figma added (both reach 3:1 on the track in both themes). Until then the code used `--nz-icon-success` and `--nz-icon-secondary`, the same colours. Meter and ProgressRing use the same fills.',
    hook: '--nz-progress-bar-fill',
    file: src('progress-bar'),
    declarations: [
      '--_nz-progress-bar-fill: var(--nz-chart-success);',
      '--_nz-progress-bar-fill: var(--nz-chart-neutral);',
    ],
  },
  {
    component: 'Meter',
    property: '',
    chosen:
      "`--nz-space-1-5` (6 px), the compositions' track; ProgressBar's track is `--nz-space-2` (8 px), the component's.",
    hook: '--nz-meter-height',
    file: src('meter'),
    declarations: ['block-size: var(--nz-meter-height, var(--nz-space-1-5));'],
  },
  {
    component: 'Skeleton',
    property: '',
    chosen:
      'Radius 6 snapped to `--nz-radius-xs` (4 px); 8 and 999 map to `--nz-radius-sm` and `--nz-radius-full`.',
    hook: '--nz-skeleton-radius',
    file: src('skeleton'),
    declarations: ['--_nz-skeleton-radius: var(--nz-radius-xs);'],
  },
  {
    component: 'InlineError',
    property: '',
    chosen:
      'The glyph defaults to the internal `circle-x` (Lucide, Feather-derived; `icon` replaces it). It is drawn at `--nz-size-icon-sm` (16 px) in `--nz-icon-critical`, one line box tall, `--nz-space-1-5` (6 px) from the message.',
    hook: '--nz-inline-error-gap',
    file: src('inline-error'),
    declarations: [
      'gap: var(--nz-inline-error-gap, var(--nz-space-1-5));',
      'inline-size: var(--nz-size-icon-sm);',
    ],
  },
];

/** A week 3 answer: as `BuilderChoice`, keyed by the facts file's §5 item number. */
export type BuilderChoiceW3 = Omit<BuilderChoice, 'component' | 'property'>;

const sheet = (name: string): string => `packages/react/src/${name}/${name}.css`;

// docs/figma/12-w3-forms.md §5. A source file other than a stylesheet is cited where the answer is
// an API (a prop, a default) rather than a declaration.
const W3_CHOICES: Record<number, BuilderChoiceW3> = {
  1: {
    chosen:
      '`--nz-space-2` (8 px) between the control and its label on all three. Rows inside a Fieldset or RadioGroup sit `--nz-space-3` (12 px) apart.',
    hook: '--nz-checkbox-gap',
    file: sheet('checkbox'),
    declarations: ['column-gap: var(--nz-checkbox-gap, var(--nz-space-2));'],
  },
  2: {
    chosen: 'A private `1.25rem` (20 px) for the box and the circle.',
    hook: '--nz-checkbox-size',
    file: sheet('checkbox'),
    declarations: ['--_nz-checkbox-size: 1.25rem;'],
  },
  3: {
    chosen: 'Kept at 14 px (`0.875rem`), as drawn: 16 px crowds the 20 px box.',
    file: sheet('checkbox'),
    declarations: ['font-size: 0.875rem;'],
  },
  4: {
    chosen:
      'The 8 px dot is the input background inside a 5 px inset ring of the fill; the disabled-selected dot is `--nz-text-disabled` on `--nz-bg-muted`.',
    hook: '--nz-radio-accent',
    file: sheet('radio-group'),
    declarations: [
      'box-shadow: inset 0 0 0 0.3125rem var(--_nz-radio-ring);',
      '--_nz-radio-bg: var(--nz-text-disabled);',
    ],
  },
  5: {
    chosen:
      'A private `1rem` thumb and a `--nz-space-0-5` pad; the track (36 × 20) and the travel (16 px) derive from them.',
    file: sheet('switch'),
    declarations: ['--_nz-switch-thumb-size: 1rem;', '--_nz-switch-pad: var(--nz-space-0-5);'],
  },
  6: {
    chosen: '`--nz-bg-surface`, which passes 3:1 on both tracks in both themes.',
    hook: '--nz-switch-thumb-bg',
    file: sheet('switch'),
    declarations: ['background: var(--nz-switch-thumb-bg, var(--nz-bg-surface));'],
  },
  7: {
    chosen: '`--nz-elevation-1`.',
    hook: '--nz-switch-thumb-shadow',
    file: sheet('switch'),
    declarations: ['box-shadow: var(--nz-switch-thumb-shadow, var(--nz-elevation-1));'],
  },
  8: {
    chosen: '`--nz-bg-brand-muted`.',
    file: sheet('switch'),
    declarations: ['--_nz-switch-bg: var(--nz-bg-brand-muted);'],
  },
  9: {
    chosen:
      'The track colour fades on `--nz-duration-fade`, so a 120 ms fade survives reduced motion; the thumb moves on the spring pair.',
    file: sheet('switch'),
    declarations: [
      'transition: background-color var(--nz-duration-fade) var(--nz-easing-standard);',
      'transition: translate var(--nz-duration-spring) var(--nz-easing-spring);',
    ],
  },
  10: {
    chosen:
      'The track is a control height (32 / 40 / 48) with a `--nz-space-1` (4 px) inset (`--nz-space-0-5` at sm) and `--nz-radius-md`, so md items are 32 px with concentric 8 px radii.',
    hook: '--nz-segmented-control-radius',
    file: sheet('segmented-control'),
    declarations: [
      '--_nz-segmented-control-inset: var(--nz-space-1);',
      '--_nz-segmented-control-radius: var(--nz-radius-md);',
    ],
  },
  11: {
    chosen: '`--nz-space-3` (12 px); `--nz-space-2` at sm and `--nz-space-4` at lg.',
    file: sheet('segmented-control'),
    declarations: ['--_nz-segmented-control-item-padding-inline: var(--nz-space-3);'],
  },
  12: {
    chosen:
      'Reserved: a hidden copy of each label in the strong weight sizes the item, so selecting never moves its neighbours.',
    file: sheet('segmented-control'),
    declarations: ['font-weight: var(--nz-font-label-m-strong-font-weight);'],
  },
  13: {
    chosen: "Opt-in `fullWidth`: equal shares of the width, never narrower than an item's text.",
    file: sheet('segmented-control'),
    declarations: ['flex: 1 1 0;', 'min-inline-size: fit-content;'],
  },
  14: {
    chosen:
      'Sizes sm, md and lg on the control scale; icon-only items named by `aria-label`; `disabled` on the group or one item, a selected disabled item keeping a `--nz-border-subtle` ring; invalid, a 1 px `--nz-border-critical` ring on the track. No sliding thumb: the selection changes with a colour fade.',
    file: sheet('segmented-control'),
    declarations: ['--_nz-segmented-control-inset: var(--nz-space-0-5);'],
  },
  15: {
    chosen: '1 px `--nz-border-critical`, no halo at rest (the halo is the focus decoration).',
    file: sheet('input'),
    declarations: ['--_nz-input-border: var(--nz-border-critical);'],
  },
  16: {
    chosen:
      'The 2 px outline from `nz.base` (on the box, `focusTarget` within) plus the `--nz-focus-halo` decoration, `--nz-focus-halo-critical` while invalid; the border colour does not change. Textarea and NativeSelect draw the same halo.',
    file: sheet('input'),
    declarations: [
      'box-shadow: 0 0 0 calc(var(--nz-border-width-focus) + 4px) var(--_nz-input-halo);',
    ],
  },
  17: {
    chosen:
      'sm, md and lg on the control scale, as Select; sm also takes `--nz-radius-sm` and a `--nz-space-1-5` gap.',
    file: sheet('input'),
    declarations: ['--_nz-input-radius: var(--nz-radius-sm);'],
  },
  18: {
    chosen: '`--nz-icon-secondary`; text affixes are `--nz-text-secondary`.',
    hook: '--nz-input-icon-fg',
    file: sheet('input'),
    declarations: ['color: var(--nz-input-icon-fg, var(--nz-icon-secondary));'],
  },
  19: {
    chosen:
      '`--nz-border-subtle` on Input, Textarea, NativeSelect and (since its week 6 visual pass) Select, a disabled Fieldset included.',
    file: sheet('native-select'),
    declarations: ['--_nz-native-select-border: var(--nz-border-subtle);'],
  },
  20: {
    chosen: 'Kept `--nz-text-tertiary`; only the label dims when the Field is disabled.',
    hook: '--nz-field-description-fg',
    file: sheet('field'),
    declarations: ['color: var(--nz-field-description-fg, var(--nz-text-tertiary));'],
  },
  21: {
    chosen:
      "Required mark `*` in `--nz-text-critical`, hidden from assistive technology (the control is `required`; handoff Q30 still open). The error glyph is InlineError's (16 px, 6 px gap). The legend is Label/M, `--nz-space-2` above the rows.",
    hook: '--nz-field-required-fg',
    file: sheet('field'),
    declarations: ['color: var(--nz-field-required-fg, var(--nz-text-critical));'],
  },
  22: {
    chosen:
      'Block padding `--nz-space-2`, 3 rows, vertical resize. It grows with its content where `field-sizing` is supported (never below its rows); Firefox 129 and Safari 17.5 keep the rows height. No counter yet.',
    hook: '--nz-textarea-padding-block',
    file: sheet('textarea'),
    declarations: [
      'padding-block: var(--nz-textarea-padding-block, var(--nz-space-2));',
      'resize: vertical;',
      'field-sizing: content;',
    ],
  },
  23: {
    chosen:
      'Matches the shipped Select: `--nz-space-3` both sides, `--nz-font-label-m` value (`--nz-font-label-l`, 16 px, under a coarse pointer, M25), `--nz-text-secondary` chevron.',
    hook: '--nz-native-select-font',
    file: sheet('native-select'),
    declarations: [
      '--_nz-native-select-padding: var(--nz-space-3);',
      '--_nz-native-select-font: var(--nz-font-label-m);',
      'font: var(--nz-native-select-font, var(--_nz-native-select-font));',
    ],
  },
  24: {
    chosen: 'A `leadingIcon` prop, off by default, as on Select.',
    file: sheet('native-select'),
    declarations: ['&:has(> .nz-native-select-icon) {'],
  },
  25: {
    chosen: 'No elevation on Primary, as Figma draws it.',
    file: sheet('icon-button'),
    declarations: ['--_nz-icon-button-bg: var(--nz-bg-brand);'],
  },
  26: {
    chosen: '16 px at sm, 20 px at md, 24 px (`--nz-size-icon-lg`) at lg.',
    file: sheet('icon-button'),
    declarations: [
      '--_nz-icon-button-icon-size: var(--nz-size-icon-sm);',
      '--_nz-icon-button-icon-size: var(--nz-size-icon-lg);',
    ],
  },
  27: {
    chosen: '`--nz-border-default`, as Button.',
    hook: '--nz-icon-button-border',
    file: sheet('icon-button'),
    declarations: ['--_nz-icon-button-border: var(--nz-border-default);'],
  },
  28: {
    chosen:
      'No arrow; at most `20rem` wide; `--nz-bg-surface-raised` under the inverse scheme; the shortcut is plain Mono text in `--nz-text-tertiary`.',
    hook: '--nz-tooltip-bg',
    file: sheet('tooltip'),
    declarations: [
      'max-inline-size: 20rem;',
      'background: var(--nz-tooltip-bg, var(--nz-bg-surface-raised));',
    ],
  },
  29: {
    chosen:
      'Both map to `--nz-duration-fast`; a colour change that must survive reduced motion uses `--nz-duration-fade` (item 9).',
    file: sheet('input'),
    declarations: ['border-color var(--nz-duration-fast) var(--nz-easing-standard),'],
  },
};

const tsx = (path: string): string => `packages/react/src/${path}.tsx`;

// docs/figma/13-w4-menu-tabs.md §5, the week 4 builders' answers (Menu, Tabs, TabNav, and the items
// week 3 left open on Select, Tooltip and IconButton).
const W4_CHOICES: Record<number, BuilderChoiceW3> = {
  1: {
    chosen:
      'Menu rows have a `2.25rem` (36 px) minimum height around `--nz-space-1-5` (6 px) block padding, so a one-line row is 36 px. Select rows share the recipe since the week 6 `select.css` pass (item 11).',
    file: sheet('menu'),
    declarations: ['min-block-size: 2.25rem;', 'padding-block: var(--nz-space-1-5);'],
  },
  2: {
    chosen:
      '`--nz-space-3` (12 px) inline padding and `--nz-space-2` (8 px) between icon, label, shortcut and check, on Menu and Select rows alike; the group label starts at `--nz-space-3` too.',
    file: sheet('menu'),
    declarations: [
      'padding-inline: var(--nz-space-3);',
      'gap: var(--nz-space-2);',
      'padding-inline-start: var(--nz-space-3);',
    ],
  },
  3: {
    chosen:
      'A checked row is `--nz-bg-brand-subtle` with `--nz-text-brand`; under the pointer it swaps to the `--nz-bg-hover` fill and keeps `--nz-text-brand` (7.91:1 light, 5.87:1 dark), so a hovered checked row still answers the pointer. A critical item keeps `--nz-text-critical` on the `--nz-bg-hover` highlight. Disabled is `--nz-text-disabled`, its icon and shortcut included; in forced colours it is `GrayText`.',
    file: sheet('menu'),
    declarations: [
      'background: var(--nz-bg-brand-subtle);',
      '&[data-checked][data-highlighted] {',
      'color: GrayText;',
      'color: var(--nz-text-critical);',
      'color: var(--nz-text-disabled);',
    ],
  },
  4: {
    chosen:
      'The same trailing check as a checkbox item; no dot. A menu that mixes plain items with checkable ones reserves the check column on the plain items too, so every shortcut lines up.',
    file: sheet('menu'),
    declarations: [
      '.nz-menu-list [data-checked] > .nz-menu-item-indicator {',
      '.nz-menu-list:has(.nz-menu-item-indicator) .nz-menu-item {',
    ],
  },
  5: {
    chosen:
      'The check sits at the end, after the shortcut, and the shortcut stays visible (`--nz-text-tertiary`, 5.71:1 light and 6.67:1 dark on `--nz-bg-brand-subtle`). Figma hides the shortcut on a selected row.',
    file: sheet('menu'),
    declarations: ['color: var(--nz-text-tertiary);', 'visibility: hidden;'],
  },
  6: {
    chosen:
      'The generated 2 px outline, drawn inside the row (`data-focus-inset`, offset −2 px) because rows sit 2 px apart in a scrolling list. It follows only the keyboard report from React Aria (`focusTarget: "engine"`), so the pointer never draws it, though the engine moves DOM focus to the hovered row. The `--nz-bg-hover` fill (1.07:1 light, 1.16:1 dark) is a pointer hint only.',
    file: tsx('menu/menu.client'),
    declarations: ['data-focus-inset=""'],
  },
  7: {
    chosen: 'At least `12rem`, and never narrower than the trigger.',
    file: sheet('menu'),
    declarations: ['min-inline-size: max(12rem, var(--nz-trigger-width, 0px));'],
  },
  8: {
    chosen:
      'Both kept on Menu: the 1 px `--nz-border-subtle` border and `--nz-elevation-3`, so dark mode shows the double edge Figma draws; `--nz-menu-border` and `--nz-menu-shadow` change either. The Select popup has the same border and elevation since week 6, with no public hook yet.',
    hook: '--nz-menu-shadow',
    file: sheet('menu'),
    declarations: [
      'border: var(--nz-border-width-default) solid var(--nz-menu-border, var(--nz-border-subtle));',
      'box-shadow: var(--nz-menu-shadow, var(--nz-elevation-3));',
    ],
  },
  9: {
    chosen: '`side="bottom"`, `align="start"` and `sideOffset={8}`, as Select; each is a prop.',
    file: tsx('menu/menu.client'),
    declarations: ["side = 'bottom',", "align = 'start',", 'sideOffset = 8,'],
  },
  10: {
    chosen:
      'Instant: the highlight follows the keyboard and the pointer with no fade, so arrowing through a list never lags.',
    file: sheet('menu'),
    declarations: ['background: var(--nz-bg-hover);'],
  },
  11: {
    chosen:
      "Week 4 changed the entry motion: the popup enters on the spring pair with `--nz-scale-enter` and fades out, like Menu and Dialog (§12.2), so reduced motion keeps its fade. The week 6 `select.css` pass gave it the Menu recipe: `--nz-radius-lg`, a 1 px `--nz-border-subtle` border and `--nz-elevation-3`; 36 px rows 2 px apart with the inset ring; the selected row `--nz-bg-brand-subtle` with `--nz-text-brand` and a trailing check (the check, not the colour, carries the state; `indicator` replaces it); Label/M `--nz-text-tertiary` group labels; a separator spaced only by the gaps. The trigger gained NativeSelect's `--nz-radius-sm` at sm, invalid border and halo, and disabled border.",
    file: sheet('select'),
    declarations: [
      'scale: var(--nz-scale-enter);',
      'scale var(--nz-duration-spring) var(--nz-easing-spring),',
      'border-radius: var(--nz-radius-lg);',
      'box-shadow: var(--nz-elevation-3);',
      'background: var(--nz-bg-brand-subtle);',
      'min-block-size: 2.25rem;',
      'gap: var(--nz-space-0-5);',
      'color: var(--nz-text-tertiary);',
      '--_nz-select-radius: var(--nz-radius-sm);',
    ],
  },
  12: {
    chosen: '`--nz-border-width-focus` (2 px); no new token.',
    hook: '--nz-tabs-indicator',
    file: sheet('tabs'),
    declarations: ['block-size: var(--nz-border-width-focus);'],
  },
  13: {
    chosen:
      "Figma's stacking: the indicator sits on the tab's bottom edge, above the strip's 1 px `--nz-border-subtle` hairline, so a 40 px tab makes a 41 px strip. TabNav does the same.",
    hook: '--nz-tabs-border',
    file: sheet('tabs'),
    declarations: ['inset-block-end: 0;', 'border-block-end: var(--nz-border-width-default) solid'],
  },
  14: {
    chosen:
      'Reserved, as SegmentedControl: a hidden copy of the label at the strong weight sizes the tab, so selecting never moves its neighbours.',
    file: sheet('tabs'),
    declarations: ['grid-area: 1 / 1;', 'font-weight: var(--nz-font-label-m-strong-font-weight);'],
  },
  15: {
    chosen:
      "Figma's 24 px gap becomes padding: 14 px a side (`--nz-space-3` + `--nz-space-0-5`) and 2 px at the strip's ends, so labels sit where Figma puts them and the space between two labels is target, not dead space. Tabs are 40 px tall; no `nz-hit-target`.",
    file: sheet('tabs'),
    declarations: ['--_nz-tabs-tab-start: calc(var(--nz-space-3) + var(--nz-space-0-5));'],
  },
  16: {
    chosen:
      'The generated 2 px outline, drawn inside the tab (`data-focus-inset`), because the scrolling strip would clip a 2 px offset. TabNav links do the same.',
    file: tsx('tabs/tabs.client'),
    declarations: ['data-focus-inset=""'],
  },
  17: {
    chosen:
      'The indicator is pinned to the bottom edge, and `--nz-space-1` (4 px) of bottom padding centres the 20 px label 8 px from the top, as in Figma; no token needed.',
    file: sheet('tabs'),
    declarations: ['padding-block: 0 var(--nz-space-1);'],
  },
  18: {
    chosen:
      'Disabled (`--nz-text-disabled`), a 16 px icon and a count pill (Label/S on `--nz-bg-subtle`) ship. An overflowing strip scrolls sideways, with no wrap, no fades and no other overflow cue: only the clipped last tab says more tabs exist (the fade techniques are outside the Safari 17.5 floor; a cue is a follow-up). Where scrollbars are classic (Windows, Linux), the scrollbar shows between the indicator and the hairline, because `scrollbar-width` is outside the floor too. No vertical orientation and no sizes: neither is drawn.',
    hook: '--nz-tabs-count-bg',
    file: sheet('tabs'),
    declarations: [
      'overflow: auto hidden;',
      'background: var(--nz-tabs-count-bg, var(--nz-bg-subtle));',
    ],
  },
  19: {
    chosen:
      "A `stateIndicator` fill: the current link's indicator paints `Highlight` in forced colours, as well as the strong weight. `tab-nav.css` repeats the generated rule, which loses to `nz.components` (§8.5).",
    file: sheet('tab-nav'),
    declarations: [".nz-tab-nav-link[aria-current='page']::before {", 'background: Highlight;'],
  },
  20: {
    chosen:
      'No arrow, as shipped in week 3 (week 3 item 28); the popup sits `sideOffset={8}` from its trigger.',
    file: tsx('tooltip/tooltip.client'),
    declarations: ['sideOffset = 8,'],
  },
  21: {
    chosen:
      "Not built. IconButton keeps Figma's Icon Button set (radius/md, no badge); the Top Bar's round bell with its unread dot stays a composition, rounded through the `--nz-icon-button-radius` hook.",
    hook: '--nz-icon-button-radius',
    file: sheet('icon-button'),
    declarations: ['border-radius: var(--nz-icon-button-radius, var(--_nz-icon-button-radius));'],
  },
  22: {
    chosen:
      'Hover colour changes use `--nz-duration-fast` (Tabs and TabNav labels and indicators); the Menu highlight is instant (item 10). Nothing animates on click this week, so `--nz-duration-base` has no user yet.',
    file: sheet('tabs'),
    declarations: ['transition: color var(--nz-duration-fast) var(--nz-easing-standard);'],
  },
};

/** The recorded choice for item `n` of a week's table; throws when there is none or it has drifted. */
function weekChoice(
  choices: Record<number, BuilderChoiceW3>,
  facts: string,
  n: number,
): BuilderChoiceW3 {
  const choice = choices[n];
  if (!choice) {
    throw new Error(
      `docs: ${facts} §5 item ${n} is left to the builder, and apps/docs/lib/builder-choices.ts records no choice for it.`,
    );
  }
  const text = readRepoText(choice.file);
  for (const d of choice.declarations) {
    if (!text.includes(d)) {
      throw new Error(
        `docs: ${choice.file} no longer contains "${d}", which apps/docs/lib/builder-choices.ts cites for ${facts} item ${n}. Update the recorded choice.`,
      );
    }
  }
  return choice;
}

/** The recorded week 3 choice for one §5 item; throws when there is none or it has drifted. */
export function builderChoiceW3(n: number): BuilderChoiceW3 {
  return weekChoice(W3_CHOICES, 'docs/figma/12-w3-forms.md', n);
}

/** The recorded week 4 choice for one §5 item; throws when there is none or it has drifted. */
export function builderChoiceW4(n: number): BuilderChoiceW3 {
  return weekChoice(W4_CHOICES, 'docs/figma/13-w4-menu-tabs.md', n);
}

/** The recorded choice for one facts-file item; throws when there is none or it has drifted. */
export function builderChoice(component: string, property: string): BuilderChoice {
  const choice = CHOICES.find((c) => c.component === component && c.property === property);
  const label = property === '' ? component : `${component} ${property}`;
  if (!choice) {
    throw new Error(
      `docs: the Figma facts leave "${label}" to the builder, and apps/docs/lib/builder-choices.ts records no choice for it.`,
    );
  }
  const css = readRepoText(choice.file);
  for (const d of choice.declarations) {
    if (!css.includes(d)) {
      throw new Error(
        `docs: ${choice.file} no longer contains "${d}", which apps/docs/lib/builder-choices.ts cites for "${label}". Update the recorded choice.`,
      );
    }
  }
  return choice;
}
