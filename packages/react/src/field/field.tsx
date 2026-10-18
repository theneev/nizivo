// NO directive: the server-safe Field shell (ARCHITECTURE.md §10.6, §16.1). It calls `useId` and
// nothing else, then hands serialisable props to the FieldScope client leaf, which provides the
// context a control reads. A function child is the zero-JS path: the shell renders it with
// FieldStatic's own render (field-static.tsx), with no client component; this module still imports
// FieldScope, so a page that needs no Field JavaScript at all uses FieldStatic (M31).
// The contract every control builds on is FIELD-CONTRACT.md in this folder.
import { cloneElement, isValidElement, useId, type ReactElement } from 'react';
import { FIELD_CONTROL, joinIds } from '../_internal/field';
import { FieldScope } from './field-scope.client';
import { resolveIds, staticField, type FieldControlProps, type FieldProps } from './field-static';

// The types live in the leaf-free module, so FieldStatic can use them without importing this file
// (which imports FieldScope); they stay importable from here.
export type {
  FieldControlProps,
  FieldIds,
  FieldProps,
  FieldState,
  FieldValidateOn,
  FieldValidityKey,
} from './field-static';

export function Field({
  label,
  description,
  error,
  errorIcon,
  group = false,
  name,
  required = false,
  disabled = false,
  readOnly = false,
  ids,
  messages,
  validateOn = 'submit',
  render,
  children,
  ...root
}: FieldProps): ReactElement {
  const base = useId();
  // A server-safe control placed directly inside: wired as a function child would be, and its own
  // id, if any, is the one the label points at.
  const wired = staticControl(children) ? children : undefined;
  const ownId = wired?.props['id'];
  const anatomy = {
    ids: resolveIds(base, ids, typeof ownId === 'string' ? ownId : undefined),
    label,
    group,
    description,
    error,
    errorIcon,
    required,
    disabled,
    readOnly,
    render,
    root,
  };
  // The zero-JS path is FieldStatic's own render (field-static.tsx), so both print the same HTML.
  if (typeof children === 'function') return staticField(anatomy, name, children);
  if (wired !== undefined) {
    return staticField(anatomy, name, (control) => cloneElement(wired, fill(control, wired.props)));
  }
  // Every prop here crosses the server/client boundary, so each is serialisable.
  return (
    <FieldScope anatomy={{ ...anatomy, validateOn }} name={name} messages={messages}>
      {children}
    </FieldScope>
  );
}

/** A server-safe control (NativeSelect) that takes the zero-JS wiring as plain props. */
function staticControl(children: unknown): children is ReactElement<Record<string, unknown>> {
  return (
    isValidElement(children) &&
    typeof children.type === 'function' &&
    Object.hasOwn(children.type, FIELD_CONTROL)
  );
}

/**
 * The Field's attributes a directly placed control did not set itself: the control's own props win
 * (an explicit `false` included), and `aria-describedby` is joined after the Field's ids.
 */
function fill(control: FieldControlProps, own: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(control)) if (own[key] === undefined) out[key] = value;
  const ownDescribedBy = own['aria-describedby'];
  const described = joinIds(
    control['aria-describedby'],
    typeof ownDescribedBy === 'string' ? ownDescribedBy : undefined,
  );
  if (described !== undefined) out['aria-describedby'] = described;
  return out;
}
