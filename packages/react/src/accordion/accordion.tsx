// NO directive: Accordion is server-safe, 0 KB of client JS (ARCHITECTURE.md §9.5, §21.3; Figma's
// Accordion Item 7370:88, whose trigger it draws on <summary>, not a button in a heading). Each item is a native
// `<details>` with its `<summary>` as the trigger, so it opens and closes, by pointer and keyboard,
// before and without hydration, and the browser's find-in-page opens a closed item that holds the
// match. `Accordion.Root name` gives every item the same `<details name>`, so opening one closes the
// others (exclusive, with no script); without it items open independently.
import {
  Children,
  cloneElement,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderElement, type RenderProp } from '../contracts/render';
import { cx } from '../_internal/cx';
import { ChevronGlyph } from '../_internal/glyphs';

type NoState = Record<string, never>;

export interface AccordionRootProps extends ComponentPropsWithRef<'div'> {
  /**
   * Makes the items exclusive: each `Accordion.Item` that sets no `name` gets this one, so opening
   * one closes the others. It groups `<details>` across the whole document, so use a name no other
   * accordion on the page uses. Without it, items open independently.
   */
  name?: string;
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
  /** `Accordion.Item` elements. */
  children?: ReactNode;
}

export interface AccordionItemProps extends Omit<ComponentPropsWithRef<'details'>, 'open'> {
  /** Open on the first render. The browser keeps the open state after that. @default false */
  defaultOpen?: boolean;
  /** The exclusive group; set by `Accordion.Root name` when left out. */
  name?: string;
  /** Must render a `<details>`. */
  render?: RenderProp<NoState>;
  /** An `Accordion.Trigger`, then an `Accordion.Panel`. */
  children?: ReactNode;
}

export interface AccordionTriggerProps extends ComponentPropsWithRef<'summary'> {
  /** Replaces the chevron at the end. Decorative (`aria-hidden`). */
  indicator?: ReactNode;
  /** Must render a `<summary>`. */
  render?: RenderProp<NoState>;
  children: ReactNode;
}

export interface AccordionPanelProps extends ComponentPropsWithRef<'div'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
}

export function AccordionRoot({
  name,
  render,
  className,
  children,
  ...rest
}: AccordionRootProps): ReactElement {
  const items =
    name === undefined
      ? children
      : Children.map(children, (child) =>
          isValidElement<AccordionItemProps>(child) &&
          child.type === AccordionItem &&
          child.props.name === undefined
            ? cloneElement(child, { name })
            : child,
        );
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'accordion',
      ...rest,
      className: cx('nz-accordion', className),
      children: items,
    },
  );
}

export function AccordionItem({
  defaultOpen = false,
  render,
  className,
  ...rest
}: AccordionItemProps): ReactElement {
  return renderElement(
    'details',
    render,
    {},
    {
      'data-slot': 'accordion-item',
      ...(defaultOpen && { open: true }),
      ...rest,
      className: cx('nz-accordion-item', className),
    },
  );
}

export function AccordionTrigger({
  indicator,
  render,
  className,
  children,
  ...rest
}: AccordionTriggerProps): ReactElement {
  return renderElement(
    'summary',
    render,
    {},
    {
      'data-slot': 'accordion-trigger',
      ...rest,
      className: cx('nz-accordion-trigger', className),
      children: (
        <>
          <span className="nz-accordion-title" data-slot="accordion-title">
            {children}
          </span>
          <span
            className="nz-accordion-indicator"
            data-slot="accordion-indicator"
            aria-hidden="true"
          >
            {indicator ?? <ChevronGlyph />}
          </span>
        </>
      ),
    },
  );
}

export function AccordionPanel({ render, className, ...rest }: AccordionPanelProps): ReactElement {
  return renderElement(
    'div',
    render,
    {},
    {
      'data-slot': 'accordion-panel',
      ...rest,
      className: cx('nz-accordion-panel', className),
    },
  );
}
