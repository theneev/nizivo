'use client';
// Form: an optional client `<form>` (ARCHITECTURE.md §16.1, gap report A §2.1 item 6, §2.5). It adds
// what a plain `<form>` cannot do across a server round trip: errors keyed by Field `name`, presented
// through each Field's one error channel (after the Field's own `error`, before the native message),
// focus on the first invalid control when new errors arrive, and an optional error summary. Native
// constraint validation stays on and is still each Field's (FieldScope); Form never sets noValidate
// and never intercepts submit. Without Form, every Field works as before.
import {
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type FormEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useLabels } from '../config/config.client';
import { mergeProps } from '../contracts/merge-props';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Alert } from '../alert/alert';
import { FormScope } from '../field/field-scope.client';

/** One Field's errors: a message, or several (the first is shown), or none. */
export type FormErrorValue = string | readonly string[] | null | undefined;

/**
 * Errors keyed by the Field's `name`, as a server action returns them (Zod's
 * `z.flattenError(error).fieldErrors`, or Conform's and TanStack Form's issues mapped to text). A
 * nested name is one key, written as the Field's `name` is: `items.0.title`. Serialisable.
 */
export type FormErrors = Readonly<Record<string, FormErrorValue>>;

/** Form's own strings (§16.4): serialisable, English defaults. */
export interface FormLabels {
  /** The error summary's title. @default 'There is a problem' */
  summaryTitle: string;
}

export interface FormProps extends Omit<ComponentPropsWithRef<'form'>, 'children'> {
  /**
   * Errors by Field `name`, typically a server action's reply. Each one is presented by the Field
   * with that `name` (the Field's own `error` prop wins over it) until the user edits that control.
   * A new object (by identity) presents them all again and moves focus: to the error summary with
   * `summary`, else to the first invalid control. The first render moves no focus.
   */
  errors?: FormErrors | undefined;
  /**
   * Renders an error summary at the start of the form while `errors` presents a message: a title
   * and one link per error to its control, in page order. New errors focus the summary instead of
   * the first invalid control (GOV.UK's error summary). For long forms. @default false
   */
  summary?: boolean;
  /** Overrides Form's strings, for example `labels={{ summaryTitle: 'Es gibt ein Problem' }}`. */
  labels?: Partial<FormLabels>;
  /** Composition of the `<form>`. */
  render?: RenderProp<Record<string, never>>;
  children?: ReactNode;
}

type Placed = ReadonlyArray<readonly [name: string, id: string | undefined]>;

const NONE: ReadonlySet<string> = new Set();

export function Form({
  errors,
  summary = false,
  labels: labelsProp,
  render,
  className,
  children,
  ...rest
}: FormProps): ReactElement {
  const labels = useLabels('form', labelsProp);
  // Names edited since `errors` last changed: a server message is stale once the user changes the
  // value, so it is hidden, as React Aria's Form does with its server errors.
  const [edited, setEdited] = useState<{ for: FormErrors | undefined; names: ReadonlySet<string> }>(
    { for: errors, names: NONE },
  );
  const hidden = edited.for === errors ? edited.names : NONE;
  const shown = useMemo(() => {
    const out = new Map<string, string>();
    for (const [name, value] of Object.entries(errors ?? {})) {
      const message = typeof value === 'string' ? value : value?.[0];
      if (message !== undefined && message !== '' && !hidden.has(name)) out.set(name, message);
    }
    return out;
  }, [errors, hidden]);

  const form = useRef<HTMLFormElement | null>(null);
  const summaryRef = useRef<HTMLDivElement | null>(null);
  const listed = summary && shown.size > 0;

  // The summary's links, read from the DOM after a commit that changes them: Form cannot know the
  // ids a Field generates, nor where its control sits. Names in page order with their control's
  // id; a name with no control comes last, as text.
  const [placed, setPlaced] = useState<Placed>([]);
  useLayoutEffect(() => {
    const element = form.current;
    if (!listed || element === null) return;
    const next: Placed = [...shown.keys()]
      .map((name) => [name, controlOf(element, name)] as const)
      .toSorted(([, a], [, b]) => order(a, b))
      .map(([name, control]) => [name, control?.id || undefined] as const);
    setPlaced((previous) => (same(previous, next) ? previous : next));
  }, [listed, shown]);

  // New errors (a new object) move focus once, after the commit that presents them, so the control
  // already carries aria-invalid and its error's id when focus lands. Not on the first render: a
  // page that arrives with errors, or a docs example, must not take focus on hydration.
  // Keyed on the errors object alone, so an edit that hides one moves nothing.
  const seen = useRef(errors);
  const moveFocus = useEffectEvent(() => {
    const element = form.current;
    if (element === null || shown.size === 0) return;
    (summaryRef.current ?? firstInvalid(element))?.focus();
  });
  useLayoutEffect(() => {
    if (seen.current === errors) return;
    seen.current = errors;
    moveFocus();
  }, [errors]);

  const own = {
    'data-slot': 'form',
    className: cx('nz-form', className),
    ref: form,
    onInput(event: FormEvent<HTMLFormElement>) {
      const { target } = event;
      const name = 'name' in target ? target.name : undefined;
      if (typeof name === 'string' && shown.has(name)) {
        setEdited({ for: errors, names: new Set([...hidden, name]) });
      }
    },
  };
  const rank = new Map(placed.map(([name], index) => [name, index]));
  const ids = new Map(placed);
  const items = [...shown].toSorted(
    ([a], [b]) => (rank.get(a) ?? rank.size) - (rank.get(b) ?? rank.size),
  );
  const props = {
    // mergeProps only composes the refs into one callback ref; nothing reads them in render.
    // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
    ...mergeProps(own, rest),
    children: (
      <>
        {listed && (
          <div ref={summaryRef} tabIndex={-1} className="nz-form-summary" data-slot="form-summary">
            <Alert
              tone="critical"
              role="alert"
              title={labels?.summaryTitle ?? 'There is a problem'}
            >
              <ul className="nz-form-summary-list" data-slot="form-summary-list">
                {items.map(([name, message]) => {
                  const id = ids.get(name);
                  return (
                    <li key={name}>
                      <a
                        href={id === undefined ? undefined : `#${id}`}
                        className="nz-form-summary-link"
                        data-slot="form-summary-link"
                        onClick={(event) => focusControl(event, name)}
                      >
                        {message}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </Alert>
          </div>
        )}
        {children}
      </>
    ),
  };
  return <FormScope value={shown}>{renderElement('form', render, {}, props)}</FormScope>;
}

/** The control a Field `name` names: the first of a radio group. */
function controlOf(form: HTMLFormElement, name: string): HTMLElement | undefined {
  const item = form.elements.namedItem(name);
  const element = item instanceof RadioNodeList ? item[0] : item;
  return element instanceof HTMLElement ? element : undefined;
}

/**
 * The form's first control that presents an error (`aria-invalid="true"`), in tree order: through
 * the error prop, a Form error or a native message. Not a disabled one, nor an unfocusable root.
 */
function firstInvalid(form: HTMLFormElement): HTMLElement | undefined {
  for (const element of form.querySelectorAll<HTMLElement>('[aria-invalid="true"]')) {
    if (element.tabIndex >= 0 && !element.matches(':disabled')) return element;
  }
  return undefined;
}

/** A summary link focuses its control, which scrolls it into view, and leaves the URL as it is. */
function focusControl(event: MouseEvent<HTMLAnchorElement>, name: string): void {
  const form = event.currentTarget.closest('form');
  const control = form === null ? undefined : controlOf(form, name);
  if (control === undefined) return;
  event.preventDefault();
  control.focus();
}

/** Two controls in page order; a missing one comes last. */
function order(a: HTMLElement | undefined, b: HTMLElement | undefined): number {
  if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? 1 : -1;
  return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
}

function same(a: Placed, b: Placed): boolean {
  return (
    a.length === b.length && a.every(([name, id], i) => b[i]?.[0] === name && b[i]?.[1] === id)
  );
}
