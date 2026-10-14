// What the week 2 and week 3 components actually chose for each value the Figma facts leave to the
// builder (docs/figma/11-w2-server-safe-components.md, "builder decides"; docs/figma/12-w3-forms.md §5). The facts file states the
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
      'Success fills with `--nz-icon-success`. Neutral fills with `--nz-icon-secondary`: `chart/neutral` is 1.4:1 on the track, and `icon/secondary` reaches 3:1 in both themes. Meter and ProgressRing use the same fills.',
    hook: '--nz-progress-bar-fill',
    file: src('progress-bar'),
    declarations: [
      '--_nz-progress-bar-fill: var(--nz-icon-success);',
      '--_nz-progress-bar-fill: var(--nz-icon-secondary);',
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
      '`--nz-border-subtle` on Input, Textarea and NativeSelect. The shipped Select keeps `--nz-border-control` until its visual pass (week 4).',
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
      'Matches the shipped Select: `--nz-space-3` both sides, `--nz-font-label-m` value, `--nz-text-secondary` chevron.',
    hook: '--nz-native-select-font',
    file: sheet('native-select'),
    declarations: [
      '--_nz-native-select-padding: var(--nz-space-3);',
      'font: var(--nz-native-select-font, var(--nz-font-label-m));',
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

/** The recorded week 3 choice for one §5 item; throws when there is none or it has drifted. */
export function builderChoiceW3(n: number): BuilderChoiceW3 {
  const choice = W3_CHOICES[n];
  if (!choice) {
    throw new Error(
      `docs: docs/figma/12-w3-forms.md §5 item ${n} is left to the builder, and apps/docs/lib/builder-choices.ts records no choice for it.`,
    );
  }
  const text = readRepoText(choice.file);
  for (const d of choice.declarations) {
    if (!text.includes(d)) {
      throw new Error(
        `docs: ${choice.file} no longer contains "${d}", which apps/docs/lib/builder-choices.ts cites for week 3 item ${n}. Update the recorded choice.`,
      );
    }
  }
  return choice;
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
