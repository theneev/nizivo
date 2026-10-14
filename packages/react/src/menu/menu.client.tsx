'use client';
// PUBLIC Menu parts (ARCHITECTURE.md §9.2, §12.3 Menu row; figma/13 §4.1–§4.2). They own the CSS
// contract; the engine owns behaviour. An item is icon → label → shortcut (→ check), as the Figma Menu
// Item draws it; the decorative parts are aria-hidden so the item is named by its label alone, and a
// shortcut is announced through aria-keyshortcuts instead (the IconButton precedent, D-v).
import { isValidElement, type JSX, type ReactNode } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { Glyph } from '../_internal/glyphs';
import { ariaKeyShortcuts } from '../_internal/keys';
import { Kbd } from '../kbd/kbd';
import * as Engine from './engine';
import type {
  MenuCheckboxItemProps,
  MenuGroupLabelProps,
  MenuGroupProps,
  MenuItemProps,
  MenuPopupProps,
  MenuRadioGroupProps,
  MenuRadioItemProps,
  MenuRootProps,
  MenuSeparatorProps,
  MenuTriggerProps,
} from './menu.contract';

const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function MenuRoot(props: MenuRootProps): JSX.Element {
  return <Engine.Root {...props} />;
}

export function MenuTrigger({ className, render, ...rest }: MenuTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-menu-trigger', className)}
      data-slot="menu-trigger"
      render={toRenderFn(render, 'button')}
    />
  );
}

export function MenuPopup({
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  container,
  'aria-label': label,
  className,
  style,
  children,
}: MenuPopupProps): JSX.Element {
  return (
    <Engine.Popup
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      className={cx('nz-menu-popup', className)}
      style={style}
      data-slot="menu-popup"
      render={renderDiv}
      list={{ className: 'nz-menu-list', 'data-slot': 'menu-list', 'aria-label': label }}
    >
      {children}
    </Engine.Popup>
  );
}

/**
 * The row's content in Figma order. The inner spans carry classes only: every item kind shares them,
 * and a `data-slot` belongs to one component. `indicator` is set only on checkbox and radio items.
 */
function itemContent(
  icon: ReactNode,
  children: ReactNode,
  shortcut: string | undefined,
  indicator?: ReactNode,
): ReactNode {
  return (
    <>
      {icon != null && (
        <span className="nz-menu-item-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="nz-menu-item-label">{children}</span>
      {shortcut !== undefined && (
        <Kbd keys={shortcut} className="nz-menu-item-shortcut" aria-hidden="true" />
      )}
      {indicator !== undefined && (
        <span className="nz-menu-item-indicator" aria-hidden="true">
          {indicator ?? <Glyph name="check" />}
        </span>
      )}
    </>
  );
}

/** Typeahead text and the announced shortcut, shared by every item kind. */
function itemBehaviour(
  children: ReactNode,
  textValue: string | undefined,
  shortcut: string | undefined,
  keyshortcuts: string | undefined,
): { textValue: string | undefined; 'aria-keyshortcuts': string | undefined } {
  return {
    textValue: textValue ?? (typeof children === 'string' ? children : undefined),
    'aria-keyshortcuts':
      keyshortcuts ?? (shortcut === undefined ? undefined : ariaKeyShortcuts(shortcut)),
  };
}

/** The `href` of a `render={<Link href="…" />}` element, which makes the item a link item (§9.3 rule 3). */
function elementHref(render: MenuItemProps['render']): string | undefined {
  if (!isValidElement<{ href?: unknown }>(render)) return undefined;
  const { href } = render.props;
  return typeof href === 'string' ? href : undefined;
}

// Rows sit 2 px apart inside a scrolling list, so each item draws its focus ring inside itself
// (`data-focus-inset`, §8.5).

export function MenuItem({
  className,
  tone = 'neutral',
  icon,
  shortcut,
  textValue,
  'aria-keyshortcuts': keyshortcuts,
  href,
  render,
  children,
  ...rest
}: MenuItemProps): JSX.Element {
  const link = href ?? elementHref(render);
  return (
    <Engine.Item
      {...rest}
      {...itemBehaviour(children, textValue, shortcut, keyshortcuts)}
      className={cx('nz-menu-item', className)}
      data-slot="menu-item"
      data-tone={tone}
      data-focus-inset=""
      href={link}
      render={toRenderFn(render, link === undefined ? 'div' : 'a')}
    >
      {itemContent(icon, children, shortcut)}
    </Engine.Item>
  );
}

export function MenuCheckboxItem({
  className,
  tone = 'neutral',
  icon,
  shortcut,
  indicator,
  textValue,
  'aria-keyshortcuts': keyshortcuts,
  render,
  children,
  ...rest
}: MenuCheckboxItemProps): JSX.Element {
  return (
    <Engine.CheckboxItem
      {...rest}
      {...itemBehaviour(children, textValue, shortcut, keyshortcuts)}
      className={cx('nz-menu-checkbox-item', className)}
      data-slot="menu-checkbox-item"
      data-tone={tone}
      data-focus-inset=""
      render={toRenderFn(render, 'div')}
    >
      {itemContent(icon, children, shortcut, indicator ?? null)}
    </Engine.CheckboxItem>
  );
}

export function MenuRadioGroup({ className, render, ...rest }: MenuRadioGroupProps): JSX.Element {
  return (
    <Engine.RadioGroup
      {...rest}
      className={cx('nz-menu-radio-group', className)}
      data-slot="menu-radio-group"
      render={toRenderFn(render, 'section')}
    />
  );
}

export function MenuRadioItem({
  className,
  tone = 'neutral',
  icon,
  shortcut,
  indicator,
  textValue,
  'aria-keyshortcuts': keyshortcuts,
  render,
  children,
  ...rest
}: MenuRadioItemProps): JSX.Element {
  return (
    <Engine.RadioItem
      {...rest}
      {...itemBehaviour(children, textValue, shortcut, keyshortcuts)}
      className={cx('nz-menu-radio-item', className)}
      data-slot="menu-radio-item"
      data-tone={tone}
      data-focus-inset=""
      render={toRenderFn(render, 'div')}
    >
      {itemContent(icon, children, shortcut, indicator ?? null)}
    </Engine.RadioItem>
  );
}

export function MenuGroup({ className, render, ...rest }: MenuGroupProps): JSX.Element {
  return (
    <Engine.Group
      {...rest}
      className={cx('nz-menu-group', className)}
      data-slot="menu-group"
      render={toRenderFn(render, 'section')}
    />
  );
}

export function MenuGroupLabel({ className, render, ...rest }: MenuGroupLabelProps): JSX.Element {
  return (
    <Engine.GroupLabel
      {...rest}
      className={cx('nz-menu-group-label', className)}
      data-slot="menu-group-label"
      render={toRenderFn(render, 'header')}
    />
  );
}

export function MenuSeparator({ className, render, ...rest }: MenuSeparatorProps): JSX.Element {
  return (
    <Engine.Separator
      {...rest}
      className={cx('nz-menu-separator', className)}
      data-slot="menu-separator"
      render={toRenderFn(render, 'div')}
    />
  );
}
