// "Skip to content": the first focus stop on a page, shown only while focused (app/global.css). The
// docs layout's sidebar alone is some 45 Tab stops. The target takes focus (tabIndex={-1}), so the
// next Tab starts inside it rather than back in the navigation.
import type { JSX } from 'react';

export function SkipLink({ target }: { target: string }): JSX.Element {
  return (
    <a href={`#${target}`} className="nz-docs-skip">
      Skip to content
    </a>
  );
}
