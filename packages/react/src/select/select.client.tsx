'use client';
// PUBLIC Select parts (ARCHITECTURE.md §10.3). They own the CSS contract; the engine owns behaviour.
import { createContext, use, useMemo, type JSX } from 'react';
import type { ControlSize } from '../augment';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { ChevronsUpDownGlyph } from '../_internal/glyphs';
import * as Engine from './engine';
import type {
  SelectGroupLabelProps,
  SelectGroupProps,
  SelectItemProps,
  SelectPopupProps,
  SelectRootProps,
  SelectRootState,
  SelectSeparatorProps,
  SelectTriggerProps,
  SelectValueProps,
} from './select.contract';

const Scope = createContext<{ size: ControlSize; invalid: boolean }>({
  size: 'md',
  invalid: false,
});

const renderRoot = toRenderFn<SelectRootState>(undefined, 'div');
const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function SelectRoot({ size = 'md', className, ...props }: SelectRootProps): JSX.Element {
  const invalid = props.invalid === true;
  const scope = useMemo(() => ({ size, invalid }), [size, invalid]);
  return (
    <Scope value={scope}>
      <Engine.Root
        {...props}
        className={cx('nz-select', className)}
        data-slot="select"
        data-size={size}
        render={renderRoot}
      />
    </Scope>
  );
}

export function SelectTrigger({
  className,
  leadingIcon,
  indicator,
  render,
  children,
  ...rest
}: SelectTriggerProps): JSX.Element {
  const { size, invalid } = use(Scope);
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-select-trigger nz-hit-target', className)}
      data-slot="select-trigger"
      data-size={size}
      data-invalid={invalid ? '' : undefined}
      render={toRenderFn(render, 'button')}
    >
      {leadingIcon != null && (
        <span className="nz-select-icon" data-slot="select-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      {children ?? <SelectValue />}
      {/* "the chevron says choose" */}
      <span className="nz-select-chevron" data-slot="select-chevron" aria-hidden="true">
        {indicator ?? <ChevronsUpDownGlyph />}
      </span>
    </Engine.Trigger>
  );
}

export function SelectValue({ className, render, ...rest }: SelectValueProps): JSX.Element {
  return (
    <Engine.Value
      {...rest}
      className={cx('nz-select-value', className)}
      data-slot="select-value"
      render={toRenderFn(render, 'span')}
    />
  );
}

export function SelectPopup({
  side = 'bottom',
  align = 'start',
  sideOffset = 8,
  container,
  className,
  style,
  children,
}: SelectPopupProps): JSX.Element {
  return (
    <Engine.Popup
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      className={cx('nz-select-popup', className)}
      style={style}
      data-slot="select-popup"
      render={renderDiv}
      list={{ className: 'nz-select-list', 'data-slot': 'select-list' }}
    >
      {children}
    </Engine.Popup>
  );
}

export function SelectItem({
  className,
  textValue,
  render,
  children,
  ...rest
}: SelectItemProps): JSX.Element {
  return (
    <Engine.Item
      {...rest}
      textValue={textValue ?? (typeof children === 'string' ? children : undefined)}
      className={cx('nz-select-item', className)}
      data-slot="select-item"
      render={toRenderFn(render, 'div')}
    >
      {children}
    </Engine.Item>
  );
}

export function SelectGroup({ className, render, ...rest }: SelectGroupProps): JSX.Element {
  return (
    <Engine.Group
      {...rest}
      className={cx('nz-select-group', className)}
      data-slot="select-group"
      render={toRenderFn(render, 'section')}
    />
  );
}

export function SelectGroupLabel({
  className,
  render,
  ...rest
}: SelectGroupLabelProps): JSX.Element {
  return (
    <Engine.GroupLabel
      {...rest}
      className={cx('nz-select-group-label', className)}
      data-slot="select-group-label"
      render={toRenderFn(render, 'header')}
    />
  );
}

export function SelectSeparator({ className, render, ...rest }: SelectSeparatorProps): JSX.Element {
  return (
    <Engine.Separator
      {...rest}
      className={cx('nz-select-separator', className)}
      data-slot="select-separator"
      render={toRenderFn(render, 'div')}
    />
  );
}
