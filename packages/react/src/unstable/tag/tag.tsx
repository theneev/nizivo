// NO directive: Tag is server-safe, 0 KB of client JS (ARCHITECTURE.md §21.4a; D-do; Figma's Tag
// 7370:69). A filter chip or a removable token: "Ceramics ×". With `selected` it is a toggle, a
// button with `aria-pressed` that shows a check when pressed, so the state is never colour alone;
// with `removable` it ends in its own 24 px remove button, named "Remove Ceramics". The two are
// sibling buttons in one pill, never one inside the other. For read-only status, use Badge.
// UNSTABLE: v0.5 is new and unreviewed.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { renderElement, type RenderProp } from '../../contracts/render';
import { cx } from '../../_internal/cx';
import { CheckGlyph, CloseGlyph } from '../../_internal/glyphs';
import { formatLabel } from '../../i18n/format-label';

/** Tag's own strings (§16.4): serialisable, English defaults. */
export interface TagLabels {
  /**
   * The remove button's name: `{label}` is the tag's.
   * @default 'Remove {label}'
   */
  remove: string;
}

export interface TagProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** What the tag says: "Ceramics". */
  label: string;
  /** A filter: whether it is on. Leave it out for a token that does not toggle. */
  selected?: boolean;
  /** The toggle calls it, when `selected` is given. */
  onToggle?: () => void;
  /** Adds the remove button. @default false */
  removable?: boolean;
  /** The remove button calls it. */
  onRemove?: () => void;
  /** @default false */
  disabled?: boolean;
  labels?: Partial<TagLabels>;
  /** Must render a `<span>`. */
  render?: RenderProp<Record<string, never>>;
}

export function Tag({
  label,
  selected,
  onToggle,
  removable = false,
  onRemove,
  disabled = false,
  labels,
  render,
  className,
  ...rest
}: TagProps): ReactElement {
  const toggles = selected !== undefined;
  return renderElement(
    'span',
    render,
    {},
    {
      'data-slot': 'tag',
      'data-selected': selected === true ? '' : undefined,
      'data-disabled': disabled ? '' : undefined,
      ...rest,
      className: cx('nz-tag', className),
      children: (
        <>
          {toggles ? (
            <button
              type="button"
              className="nz-tag-toggle"
              data-slot="tag-toggle"
              aria-pressed={selected}
              disabled={disabled}
              onClick={onToggle}
            >
              {selected && (
                <span className="nz-tag-check" aria-hidden="true">
                  <CheckGlyph />
                </span>
              )}
              {label}
            </button>
          ) : (
            <span className="nz-tag-label" data-slot="tag-label">
              {label}
            </span>
          )}
          {removable && (
            <button
              type="button"
              className="nz-tag-remove"
              data-slot="tag-remove"
              aria-label={formatLabel(labels?.remove ?? 'Remove {label}', { label })}
              disabled={disabled}
              onClick={onRemove}
            >
              <CloseGlyph />
            </button>
          )}
        </>
      ),
    },
  );
}
