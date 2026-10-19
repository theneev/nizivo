// A focusable, named horizontal scroller around a Markdown table on the charts pages, like the
// generated pages' <Table> (components/table.tsx): a wide props table on a phone stays reachable by
// keyboard (WCAG 1.4.10, 2.1.1; axe's scrollable-region-focusable). Fumadocs wraps every Markdown
// table in its own scroller, which is not focusable; components/charts.css turns that inner one off
// inside this wrapper, so this one scrolls.
import type { JSX, ReactNode } from 'react';

export function ChartsTable({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      className="nz-docs-table nz-docs-charts-table relative my-6 overflow-auto prose-no-margin"
      // A named group, as components/table.tsx explains.
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      aria-label={label}
      // The scroller must take keyboard focus to be scrolled from the keyboard.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      {children}
    </div>
  );
}
