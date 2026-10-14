// What the week 2 components actually chose for each value the Figma facts leave to the builder
// (docs/figma/11-w2-server-safe-components.md, "builder decides"). The facts file states the
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
      'The glyph is the `icon` prop, required until an internal error glyph ships. It is drawn at `--nz-size-icon-sm` (16 px) in `--nz-icon-critical`, one line box tall, `--nz-space-1-5` (6 px) from the message.',
    hook: '--nz-inline-error-gap',
    file: src('inline-error'),
    declarations: [
      'gap: var(--nz-inline-error-gap, var(--nz-space-1-5));',
      'inline-size: var(--nz-size-icon-sm);',
    ],
  },
];

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
