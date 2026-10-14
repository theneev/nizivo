'use client';
// The ONLY Select module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class names.
import { createElement, use } from 'react';
import {
  Button,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Select,
  SelectStateContext,
  SelectValue,
  Separator as EngineSeparator,
  useLocale,
} from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  SelectEngine,
  SelectItemState,
  SelectPopupState,
  SelectRootState,
  SelectTriggerState,
} from '../../select/select.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';

export const Root: SelectEngine['Root'] = ({
  value,
  defaultValue,
  onValueChange,
  open,
  defaultOpen,
  onOpenChange,
  name,
  required,
  disabled,
  invalid,
  placeholder,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  render,
  children,
  ...dom
}) => (
  <EngineLocale>
    <Select
      {...defined({
        value,
        defaultValue,
        isOpen: open,
        defaultOpen,
        name,
        isRequired: required,
        isDisabled: disabled,
        isInvalid: invalid,
        placeholder,
        'aria-label': label,
        'aria-labelledby': labelledBy,
      })}
      // React Aria reports no cause for either change.
      onChange={(key) => onValueChange?.(key == null ? null : String(key), details('unknown'))}
      onOpenChange={(isOpen) => onOpenChange?.(isOpen, details('unknown'))}
      // A hidden native <select> carries name and required into forms.
      validationBehavior="native"
      render={(p, rp) => {
        const s: SelectRootState = { open: rp.isOpen, disabled: rp.isDisabled };
        const attrs = stateAttrs({ ...s, required: rp.isRequired, invalid });
        return render(mergeProps(engineDom(p), dom, attrs), s);
      }}
    >
      {children}
    </Select>
  </EngineLocale>
);

export const Trigger: SelectEngine['Trigger'] = ({
  id,
  'aria-label': label,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => {
  // ButtonRenderProps has no isOpen (verdict V10), so read it from the select state.
  const open = use(SelectStateContext)?.isOpen ?? false;
  return (
    <Button
      {...defined({ id, 'aria-label': label, 'aria-describedby': describedBy })}
      render={(p, rp) => {
        const s: SelectTriggerState = {
          open,
          // React Aria reports an open select's trigger as pressed; the vocabulary means a real press.
          pressed: rp.isPressed && !open,
          focusVisible: rp.isFocusVisible,
          disabled: rp.isDisabled,
        };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </Button>
  );
};

export const Value: SelectEngine['Value'] = ({ render, children, ...dom }) => (
  <SelectValue
    render={(p, rp) => {
      const s = { placeholder: rp.isPlaceholder };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </SelectValue>
);

export const Popup: SelectEngine['Popup'] = ({
  side,
  align,
  sideOffset,
  container,
  list,
  render,
  children,
  ...dom
}) => {
  const { direction } = useLocale();
  return (
    <Popover
      placement={toPlacement(side, align)}
      offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const s: SelectPopupState = {
          entering: rp.isEntering,
          exiting: rp.isExiting,
          side: resolveSide(rp.placement, side, direction),
        };
        const engine = { ...engineDom(p), style: popupStyle(p.style) };
        const attrs = stateAttrs({ open: !rp.isExiting, ...s, align });
        return render(mergeProps(engine, dom, attrs), s);
      }}
    >
      <ListBox render={(p) => createElement('div', mergeProps(engineDom(p), list))}>
        {children}
      </ListBox>
    </Popover>
  );
};

export const Item: SelectEngine['Item'] = ({
  value,
  textValue,
  disabled,
  render,
  children,
  ...dom
}) => (
  <ListBoxItem
    id={value}
    {...defined({ textValue, isDisabled: disabled })}
    render={(p, rp) => {
      const s: SelectItemState = {
        highlighted: rp.isFocused,
        selected: rp.isSelected,
        disabled: rp.isDisabled,
        focusVisible: rp.isFocusVisible,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </ListBoxItem>
);

export const Group: SelectEngine['Group'] = ({ render, children, ...dom }) => (
  <ListBoxSection render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </ListBoxSection>
);

export const GroupLabel: SelectEngine['GroupLabel'] = ({ render, children, ...dom }) => (
  <Header render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Header>
);

export const Separator: SelectEngine['Separator'] = ({ render, ...dom }) => (
  <EngineSeparator render={(p) => render(mergeProps(engineDom(p), dom), {})} />
);
