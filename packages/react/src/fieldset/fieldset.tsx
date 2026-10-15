// NO directive: zero client JS under RSC (ARCHITECTURE.md §9.5, §16.1). A native <fieldset> and
// <legend> (no role="group" fallback): the browser disables every control inside a disabled fieldset, so no context is needed.
// RadioGroup and checkbox groups build on it (field/FIELD-CONTRACT.md, last section).
import { useId, type ComponentPropsWithRef, type ReactElement, type ReactNode } from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { stateAttrs } from '../contracts/state';
import { cx } from '../_internal/cx';
import { joinIds, presented } from '../_internal/field';
import { CircleXGlyph } from '../_internal/glyphs';
import { InlineError } from '../inline-error/inline-error';

export interface FieldsetState {
  /** An error message is presented. */
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

export interface FieldsetProps extends Omit<ComponentPropsWithRef<'fieldset'>, 'children'> {
  /** The group's name, a native `<legend>`. */
  legend?: ReactNode;
  /** Help text after the group, announced on entering it through `aria-describedby`. */
  description?: ReactNode;
  /**
   * The group's error, rendered through InlineError and joined to `aria-describedby`; sets
   * `data-invalid`. Not a live region (§16.5). `null`, `false` and `''` present no error.
   */
  error?: ReactNode;
  /** Replaces the internal error mark (`circle-x`). Decorative. */
  errorIcon?: ReactNode;
  /** Draws an `aria-hidden` mark after the legend; the controls inside carry `required`. @default false */
  required?: boolean;
  /** Native: disables every control inside, with no client code. @default false */
  disabled?: boolean;
  /** Ids replacing the generated ones. */
  ids?: { description?: string | undefined; error?: string | undefined };
  /** Composition of the root; anything but a `<fieldset>` loses native `disabled`. */
  render?: RenderProp<FieldsetState>;
  children?: ReactNode;
}

export function Fieldset({
  legend,
  description,
  error,
  errorIcon,
  required = false,
  disabled = false,
  ids,
  render,
  'aria-describedby': ariaDescribedBy,
  className,
  children,
  ...rest
}: FieldsetProps): ReactElement {
  const base = useId();
  const descriptionId = ids?.description ?? `${base}-description`;
  const errorId = ids?.error ?? `${base}-error`;
  const hasDescription = presented(description);
  const invalid = presented(error);
  return renderElement(
    'fieldset',
    render,
    { invalid, disabled, required },
    {
      'data-slot': 'fieldset',
      ...stateAttrs({ invalid, disabled, required }),
      ...rest,
      className: cx('nz-fieldset', className),
      // Only a real <fieldset> may receive `disabled`.
      disabled: render === undefined && disabled ? true : undefined,
      // Joined, never replaced: description, error, then the consumer's own (FIELD-CONTRACT.md).
      'aria-describedby': joinIds(
        hasDescription && descriptionId,
        invalid && errorId,
        ariaDescribedBy,
      ),
      children: (
        <>
          {presented(legend) && (
            <legend className="nz-fieldset-legend" data-slot="fieldset-legend">
              {legend}
              {required && (
                <span
                  className="nz-fieldset-required"
                  data-slot="fieldset-required"
                  aria-hidden="true"
                >
                  *
                </span>
              )}
            </legend>
          )}
          {/* The rows sit in their own box: a rendered legend is not a flex item in every engine
              (WebKit), so the fieldset itself is never the flex container. */}
          <div className="nz-fieldset-content" data-slot="fieldset-content">
            {children}
            {hasDescription && (
              <div
                className="nz-fieldset-description"
                data-slot="fieldset-description"
                id={descriptionId}
              >
                {description}
              </div>
            )}
            {invalid && (
              <InlineError
                className="nz-fieldset-error"
                data-slot="fieldset-error"
                id={errorId}
                icon={errorIcon ?? <CircleXGlyph />}
              >
                {error}
              </InlineError>
            )}
          </div>
        </>
      ),
    },
  );
}
