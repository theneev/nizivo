// The sprout mark, in the brand colours (Figma's Brand/Logo 739:64; ASSETS.md, M90): the header's,
// the footer's and the design-language band's. No directive: a server part, decorative.
import type { JSX } from 'react';

export function Mark({ size = 32 }: { size?: number }): JSX.Element {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="nz-site-mark">
      <rect width="32" height="32" rx="10" />
      <path d="M16 25V15.5" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M16 16.5C16 11.8 19.4 8 24.5 8C24.5 12.7 20.9 16.5 16 16.5Z" />
      <path d="M16 19C16 15.4 13.2 12.5 9.2 12.5C9.2 16.1 12.1 19 16 19Z" opacity="0.72" />
    </svg>
  );
}
