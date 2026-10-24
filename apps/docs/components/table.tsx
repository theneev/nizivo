// Every generated table sits in its own horizontal scroller. Fumadocs' docs layout clips overflow
// (`overflow-x: clip` on #nd-docs-layout), so a wide props or token table on a phone would otherwise
// be cut off with no way to reach the clipped columns (WCAG 1.4.10). The scroller is focusable and
// named, so a keyboard user can scroll it too: Safari does not make scrollers focusable on its own.
// The classes are those of Fumadocs' own MDX table wrapper, so both kinds of table look the same.
import type { ComponentProps, JSX, ReactNode } from 'react';

export function Table({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      className="nz-docs-table relative my-6 overflow-auto prose-no-margin"
      // A named group, not a landmark: a component page has a dozen tables. No element fits (the
      // suggested fieldset is for form controls).
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      aria-label={label}
      // The scroller must take keyboard focus to be scrolled from the keyboard.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table aria-label={label} className={className}>
        {children}
      </table>
    </div>
  );
}

/**
 * A table written in Markdown, in the same focusable scroller as the generated tables: Fumadocs'
 * own wrapper is not focusable, so a Markdown table wider than a phone could not be scrolled from
 * the keyboard (axe `scrollable-region-focusable`; the Strings guide's table at 375px).
 */
export function MarkdownTable(props: ComponentProps<'table'>): JSX.Element {
  return (
    <div
      className="nz-docs-table relative my-6 overflow-auto prose-no-margin"
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="group"
      aria-label="Table"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table {...props} />
    </div>
  );
}
