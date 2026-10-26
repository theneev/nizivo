'use client';
// PUBLIC Combobox parts (ARCHITECTURE.md §16.1; no Figma component: search suggestions on 06 and 08,
// in Input's box with Select's popup and rows). A text input that suggests items from a list as the
// reader types; never hand-built, and `<datalist>` cannot be styled. They own the CSS contract; the
// engine owns behaviour. Field wiring as Input: the Field's label points at the input, and its id,
// description and error reach it.
import { createContext, use, useMemo, type JSX, type ReactNode } from 'react';
import type { ControlSize } from '../augment';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import { joinIds } from '../_internal/field';
import { CheckGlyph, ChevronsUpDownGlyph } from '../_internal/glyphs';
import { useFieldControl, type FieldControlElementProps } from '../field/field-scope.client';
import * as Engine from './engine';
import type {
  ComboboxGroupLabelProps,
  ComboboxGroupProps,
  ComboboxInputProps,
  ComboboxItemProps,
  ComboboxPopupProps,
  ComboboxRootProps,
  ComboboxRootState,
  ComboboxSeparatorProps,
  ComboboxTriggerProps,
} from './combobox.contract';

interface ScopeValue {
  size: ControlSize;
  /** The Field's validation handlers, for the input. */
  handlers?: Pick<FieldControlElementProps, 'onInvalid' | 'onInput' | 'onBlur'> | undefined;
  /** The Field's description and error ids, for the input. */
  describedBy?: string | undefined;
}

const Scope = createContext<ScopeValue>({ size: 'md' });

const renderRoot = toRenderFn<ComboboxRootState>(undefined, 'div');
const renderDiv = toRenderFn<unknown>(undefined, 'div');

export function ComboboxRoot({
  size = 'md',
  id,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  'aria-labelledby': labelledBy,
  className,
  ...props
}: ComboboxRootProps): JSX.Element {
  const field = useFieldControl({ id, name, required, disabled, readOnly, invalid });
  // the Field label names the input (its `for`) and, through aria-labelledby, the list and Trigger
  const named = labelledBy ?? field.labelledBy;
  const { onInvalid, onInput, onBlur } = field.controlProps;
  const scope = useMemo(
    () => ({
      size,
      handlers: field.inField ? { onInvalid, onInput, onBlur } : undefined,
      describedBy: field.describedBy,
    }),
    [size, field.inField, onInvalid, onInput, onBlur, field.describedBy],
  );
  return (
    <Scope value={scope}>
      <Engine.Root
        {...props}
        {...(field.id !== undefined && { id: field.id })}
        {...(field.name !== undefined && { name: field.name })}
        {...(named !== undefined && { 'aria-labelledby': named })}
        required={field.required}
        disabled={field.disabled}
        readOnly={field.readOnly}
        invalid={field.invalid}
        className={cx('nz-combobox', className)}
        data-slot="combobox"
        data-size={size}
        control={{
          className: 'nz-combobox-control nz-input',
          'data-slot': 'combobox-control',
          'data-size': size,
        }}
        render={renderRoot}
      />
    </Scope>
  );
}

export function ComboboxInput({
  'aria-describedby': own,
  className,
  render,
  ...rest
}: ComboboxInputProps): JSX.Element {
  const { handlers, describedBy } = use(Scope);
  return (
    <Engine.Input
      {...handlers}
      {...rest}
      aria-describedby={joinIds(describedBy, own)}
      className={cx('nz-combobox-input nz-input-control', className)}
      data-slot="combobox-input"
      render={toRenderFn(render, 'input')}
    />
  );
}

export function ComboboxTrigger({
  className,
  render,
  children,
  ...rest
}: ComboboxTriggerProps): JSX.Element {
  return (
    <Engine.Trigger
      {...rest}
      className={cx('nz-combobox-trigger', className)}
      data-slot="combobox-trigger"
      render={toRenderFn(render, 'button')}
    >
      {/* "the chevron says choose", as on Select */}
      <span className="nz-combobox-chevron" aria-hidden="true">
        {children ?? <ChevronsUpDownGlyph />}
      </span>
    </Engine.Trigger>
  );
}

export function ComboboxPopup({
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  container,
  className,
  style,
  children,
}: ComboboxPopupProps): JSX.Element {
  return (
    <Engine.Popup
      side={side}
      align={align}
      sideOffset={sideOffset}
      container={container}
      className={cx('nz-combobox-popup', className)}
      style={style}
      data-slot="combobox-popup"
      render={renderDiv}
      list={{ className: 'nz-combobox-list', 'data-slot': 'combobox-list' }}
    >
      {children}
    </Engine.Popup>
  );
}

export function ComboboxItem({
  className,
  textValue,
  indicator,
  render,
  children,
  ...rest
}: ComboboxItemProps): JSX.Element {
  const base = toRenderFn(render, 'div');
  // The check is added here, not to the engine's children, as on Select.
  const check = indicator !== null && (
    <span className="nz-combobox-item-indicator" aria-hidden="true">
      {indicator ?? <CheckGlyph />}
    </span>
  );
  return (
    <Engine.Item
      {...rest}
      textValue={textValue ?? (typeof children === 'string' ? children : undefined)}
      className={cx('nz-combobox-item', className)}
      data-slot="combobox-item"
      // the keyboard ring sits inside the row, as on Select and Menu rows (§8.5)
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

export function ComboboxGroup({ className, render, ...rest }: ComboboxGroupProps): JSX.Element {
  return (
    <Engine.Group
      {...rest}
      className={cx('nz-combobox-group', className)}
      data-slot="combobox-group"
      render={toRenderFn(render, 'section')}
    />
  );
}

export function ComboboxGroupLabel({
  className,
  render,
  ...rest
}: ComboboxGroupLabelProps): JSX.Element {
  return (
    <Engine.GroupLabel
      {...rest}
      className={cx('nz-combobox-group-label', className)}
      data-slot="combobox-group-label"
      render={toRenderFn(render, 'header')}
    />
  );
}

export function ComboboxSeparator({
  className,
  render,
  ...rest
}: ComboboxSeparatorProps): JSX.Element {
  return (
    <Engine.Separator
      {...rest}
      className={cx('nz-combobox-separator', className)}
      data-slot="combobox-separator"
      render={toRenderFn(render, 'div')}
    />
  );
}
