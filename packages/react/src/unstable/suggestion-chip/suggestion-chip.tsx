// NO directive: SuggestionChip and SuggestionGroup are server-safe, 0 KB of client JS (ARCHITECTURE.md
// §21.4a; D-dn; Figma's Suggestion Chip 7409:46 and Suggestion Group 7409:47). A chip is a prompt
// starter or a follow-up: a button that fills the composer so people can edit first, never one
// that sends. The app's `onClick` does the filling. A group wraps a few chips (Figma: at most about
// five in view) under an empty composer or after an answer, as a labelled group.
// UNSTABLE: the AI kit is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { SparklesGlyph } from '../../_internal/glyphs';

/** SuggestionGroup's own strings (§16.4): serialisable, English defaults. */
export interface SuggestionGroupLabels {
  /**
   * The group's accessible name, unless `aria-label` or `aria-labelledby` names it.
   * @default 'Suggestions'
   */
  label: string;
}

export interface SuggestionChipProps extends ComponentPropsWithRef<'button'> {
  /** Must render a `<button>`. */
  render?: RenderProp<Record<string, never>>;
}

export function SuggestionChip({
  render,
  className,
  children,
  ...rest
}: SuggestionChipProps): ReactElement {
  return renderElement(
    'button',
    render,
    {},
    {
      type: 'button',
      'data-slot': 'suggestion-chip',
      ...rest,
      className: cx('nz-suggestion-chip nz-hit-target', className),
      children: (
        <>
          <span className="nz-suggestion-chip-icon" aria-hidden="true">
            <SparklesGlyph />
          </span>
          {children}
        </>
      ),
    },
  );
}

export interface SuggestionGroupProps extends ComponentPropsWithRef<'div'> {
  labels?: Partial<SuggestionGroupLabels>;
  /** Must render a `<div>`. */
  render?: RenderProp<Record<string, never>>;
}

export function SuggestionGroup({
  labels,
  render,
  className,
  ...rest
}: SuggestionGroupProps): ReactElement {
  const named = rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined;
  return renderElement(
    'div',
    render,
    {},
    {
      role: 'group',
      'data-slot': 'suggestion-group',
      ...(!named && { 'aria-label': labels?.label ?? 'Suggestions' }),
      ...rest,
      className: cx('nz-suggestion-group', className),
    },
  );
}
