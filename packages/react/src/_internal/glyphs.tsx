// NO directive: server-safe. The few glyphs core draws itself, so @nizivo/react imports no icon
// package (ARCHITECTURE.md §6, §14.2). Paths are Lucide's (ISC; notice in THIRD_PARTY_NOTICES).
// Stroke follows settled 7: 1.92 on the 24 viewBox, non-absolute, so it renders 1.28 px in the 16 px
// slots (Button icon, Select chevron) that size the glyph through font-size. `chevron` (Lucide's
// `chevron-right`, the Breadcrumb separator and Pagination's marks), `circle-x` (the error mark of
// Field, Fieldset and InlineError), `close` (Lucide's `x`, AlertDismiss's default), and `check` and
// `minus` (Checkbox's checked mark and indeterminate dash), `info` (the neutral Toast's mark) and
// `search` (SearchField's magnifier) are on Lucide's list of Feather-derived icons, so they also
// carry the Feather MIT notice in THIRD_PARTY_NOTICES; `circle-check` (the success Toast's) and
// `eye` and `eye-off` (PasswordInput's show and hide marks) are Lucide's own.
//
// One export per glyph, so an entry carries only the paths it draws (a name → paths table kept every
// glyph in every entry that drew one: about 160 B gzip on the Dialog entry).
import type { JSX, ReactNode } from 'react';

export type GlyphName =
  | 'spinner'
  | 'chevron'
  | 'chevrons-up-down'
  | 'circle-x'
  | 'circle-check'
  | 'info'
  | 'close'
  | 'check'
  | 'minus'
  | 'eye'
  | 'eye-off'
  | 'search';

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

export const CircleCheckGlyph = (): JSX.Element =>
  svg(
    'circle-check',
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>,
  );

export const InfoGlyph = (): JSX.Element =>
  svg(
    'info',
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
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

/** PasswordInput's toggle while the password is hidden. */
export const EyeGlyph = (): JSX.Element =>
  svg(
    'eye',
    <>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
      <circle cx="12" cy="12" r="3" />
    </>,
  );

/** PasswordInput's toggle while the password is shown. */
export const EyeOffGlyph = (): JSX.Element =>
  svg(
    'eye-off',
    <>
      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
      <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
      <path d="m2 2 20 20" />
    </>,
  );

/** SearchField's magnifier. */
export const SearchGlyph = (): JSX.Element =>
  svg(
    'search',
    <>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </>,
  );
