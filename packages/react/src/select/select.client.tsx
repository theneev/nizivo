'use client';
// PUBLIC Select parts (ARCHITECTURE.md §10.3). They own the CSS contract; the engine owns behaviour.
import { createContext, use, useMemo, type JSX, type ReactNode } from 'react';
import type { ControlSize } from '../augment';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { joinIds } from '../_internal/field';
import { CheckGlyph, ChevronsUpDownGlyph } from '../_internal/glyphs';
import { useFieldControl } from '../field/field-scope.client';
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

interface ScopeValue {
  size: ControlSize;
  invalid: boolean;
  /** From a Field around the Select: the trigger's id (the label's `for`) and descriptions. */
  id?: string | undefined;
  describedBy?: string | undefined;
}

const Scope = createContext<ScopeValue>({ size: 'md', invalid: false });

const renderRoot = toRenderFn<SelectRootState>(undefined, 'div');
const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function SelectRoot({
  size = 'md',
  name,
  required,
  disabled,
  invalid,
  'aria-labelledby': labelledBy,
  className,
  ...props
}: SelectRootProps): JSX.Element {
  // Field wiring (FIELD-CONTRACT.md): own props win, `undefined` inherits. A label click focuses the
  // trigger and never opens the listbox. The hidden native <select> carries name and required.
  const field = useFieldControl({ name, required, disabled, invalid, labelBehavior: 'focus' });
  const { id, describedBy } = field;
  // the trigger's name is the value plus the Field label (§10.3)
  const named = labelledBy ?? field.labelledBy;
  const scope = useMemo(
    () => ({ size, invalid: field.invalid, id, describedBy }),
    [size, field.invalid, id, describedBy],
  );
  return (
    <Scope value={scope}>
      <Engine.Root
        {...props}
        {...(field.name !== undefined && { name: field.name })}
        {...(named !== undefined && { 'aria-labelledby': named })}
        required={field.required}
        disabled={field.disabled}
        invalid={field.invalid}
        className={cx('nz-select', className)}
        data-slot="select"
        data-size={size}
        render={renderRoot}
      />
    </Scope>
  );
}

export function SelectTrigger({
  id,
  'aria-describedby': describedBy,
  className,
  leadingIcon,
  indicator,
  render,
  children,
  ...rest
}: SelectTriggerProps): JSX.Element {
  const { size, invalid, ...field } = use(Scope);
  return (
    <Engine.Trigger
      {...rest}
      id={id ?? field.id}
      aria-describedby={joinIds(field.describedBy, describedBy)}
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
  sideOffset = 4,
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
  indicator,
  render,
  children,
  ...rest
}: SelectItemProps): JSX.Element {
  const base = toRenderFn(render, 'div');
  // The check is added here, not to the engine's children: the trigger shows those as the value.
  const check = indicator !== null && (
    <span className="nz-select-item-indicator" aria-hidden="true">
      {indicator ?? <CheckGlyph />}
    </span>
  );
  return (
    <Engine.Item
      {...rest}
      textValue={textValue ?? (typeof children === 'string' ? children : undefined)}
      className={cx('nz-select-item', className)}
      data-slot="select-item"
      // the keyboard ring sits inside the row, as on Menu rows (§8.5)
      data-focus-inset=""
      render={(props, state) =>
        base(
          {
            ...props,
            children: (
              <>
                {/* the engine's rendered row content, passed through as a prop */}
                {/* oxlint-disable-next-line typescript/no-unsafe-type-assertion */}
                {props['children'] as ReactNode}
                {check}
              </>
            ),
          },
          state,
        )
      }
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
