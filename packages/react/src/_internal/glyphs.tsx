// NO directive: server-safe. The few glyphs core draws itself, so @nizivo/react imports no icon
// package (ARCHITECTURE.md §6, §14.2). Paths are Lucide's (ISC; notice in THIRD_PARTY_NOTICES).
// Stroke follows settled 7: 1.92 on the 24 viewBox, non-absolute, so it renders 1.28 px in the 16 px
// slots (Button icon, Select chevron) that size the glyph through font-size.
import type { JSX } from 'react';

export type GlyphName = 'spinner' | 'chevrons-up-down';

const PATHS: Record<GlyphName, JSX.Element> = {
  spinner: <path d="M21 12a9 9 0 1 1-6.219-8.56" />,
  'chevrons-up-down': (
    <>
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </>
  ),
};

export function Glyph({ name }: { name: GlyphName }): JSX.Element {
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
      {PATHS[name]}
    </svg>
  );
}
