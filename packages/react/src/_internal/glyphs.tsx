// NO directive: server-safe. The few glyphs core draws itself, so @nizivo/react imports no icon
// package (ARCHITECTURE.md §6, §14.2). Paths are Lucide's (ISC; notice in THIRD_PARTY_NOTICES).
// Stroke follows settled 7: 1.92 on the 24 viewBox, non-absolute, so it renders 1.28 px in the 16
// px slots (Button icon, Select chevron) that size the glyph through font-size. `chevron` (Lucide's
// `chevron-right`, the Breadcrumb separator and Pagination's marks), `circle-x` (the error mark of
// Field, Fieldset and InlineError), `close` (Lucide's `x`, AlertDismiss's default), and `check` and
// `minus` (Checkbox's checked mark and indeterminate dash; with `plus`, QuantityStepper's buttons),
// `info` (the neutral Toast's mark), `search` (SearchField's magnifier), `calendar` (the
// DateRangePicker trigger's) and `ellipsis` (MobileTabBar's More, Feather's `more-horizontal`) are
// on Lucide's list of Feather-derived icons, so they also carry the Feather MIT notice in
// THIRD_PARTY_NOTICES; `circle-check` (the success Toast's) and `eye` and `eye-off`
// (PasswordInput's show and hide marks) are Lucide's own, as are the AI kit's `sparkles` (the AI
// mark), `globe` and `file-text` (SourceCard's web and file marks).
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
  | 'plus'
  | 'eye'
  | 'eye-off'
  | 'search'
  | 'calendar'
  | 'ellipsis'
  | 'sparkles'
  | 'globe'
  | 'file-text';

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

/** QuantityStepper's increment mark. */
export const PlusGlyph = (): JSX.Element =>
  svg(
    'plus',
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>,
  );

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

/** Lucide's `ellipsis` (Feather's `more-horizontal`): MobileTabBar's More. */
export const EllipsisGlyph = (): JSX.Element =>
  svg(
    'ellipsis',
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>,
  );

/** The DateRangePicker trigger's calendar. */
export const CalendarGlyph = (): JSX.Element =>
  svg(
    'calendar',
    <>
      <path d="M8 2v3" />
      <path d="M16 2v3" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
    </>,
  );

export const SparklesGlyph = (): JSX.Element =>
  svg(
    'sparkles',
    <>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 2v4" />
      <path d="M22 4h-4" />
      <circle cx="4" cy="20" r="2" />
    </>,
  );

export const GlobeGlyph = (): JSX.Element =>
  svg(
    'globe',
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </>,
  );

export const FileTextGlyph = (): JSX.Element =>
  svg(
    'file-text',
    <>
      <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" />
      <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      <path d="M10 9H8" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
    </>,
  );
