// NO directive: server-safe. The few glyphs core draws itself, so @nizivo/react imports no icon
// package (ARCHITECTURE.md §6, §14.2). Paths are Lucide's (ISC; notice in THIRD_PARTY_NOTICES).
// Stroke follows settled 7: 1.92 on the 24 viewBox, non-absolute, so it renders 1.28 px in the 16 px
// slots (Button icon, Select chevron) that size the glyph through font-size. `chevron` (Lucide's
// `chevron-right`, the Breadcrumb separator and Pagination's marks), `circle-x` (the error mark of
// Field, Fieldset and InlineError), `close` (Lucide's `x`, AlertDismiss's default), and `check` and
// `minus` (Checkbox's checked mark and indeterminate dash) are on Lucide's list of Feather-derived
// icons, so they also carry the Feather MIT notice in THIRD_PARTY_NOTICES.
//
// One export per glyph, so an entry carries only the paths it draws (a name → paths table kept every
// glyph in every entry that drew one: about 160 B gzip on the Dialog entry).
import type { JSX, ReactNode } from 'react';

export type GlyphName =
  | 'spinner'
  | 'chevron'
  | 'chevrons-up-down'
  | 'circle-x'
  | 'close'
  | 'check'
  | 'minus';

function svg(name: GlyphName, paths: ReactNode): JSX.Element {
  return (
    <svg
      className={`nz-glyph nz-glyph-${name}`}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths}
    </svg>
  );
}

export const SpinnerGlyph = (): JSX.Element =>
  svg('spinner', <path d="M21 12a9 9 0 1 1-6.219-8.56" />);

/** Lucide's `chevron-right`: the Breadcrumb separator, and Pagination's next (turned for previous). */
export const ChevronGlyph = (): JSX.Element => svg('chevron', <path d="m9 18 6-6-6-6" />);

export const ChevronsUpDownGlyph = (): JSX.Element =>
  svg(
    'chevrons-up-down',
    <>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </>,
  );

export const CircleXGlyph = (): JSX.Element =>
  svg(
    'circle-x',
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </>,
  );

export const CloseGlyph = (): JSX.Element =>
  svg(
    'close',
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>,
  );

export const CheckGlyph = (): JSX.Element => svg('check', <path d="M20 6 9 17l-5-5" />);

export const MinusGlyph = (): JSX.Element => svg('minus', <path d="M5 12h14" />);
