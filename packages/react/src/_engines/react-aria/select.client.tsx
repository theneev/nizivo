'use client';
// The ONLY Select module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class names.
import { createElement, use, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
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
import { PopupKey, useOpenState } from './open-state.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';
import { ReturnFocus, useTabOut, useTriggerRef } from './popup.client';
import { OutsidePress } from './outside-press.client';

/**
 * React Aria 1.22.1 resets the state on the form's `reset`, then the browser resets the hidden native
 * <select> to its empty first option, and React never writes the value back (its prop did not
 * change after the reset): the trigger showed the default while FormData had ''. After the browser's
 * reset, the hidden <select> takes the state's value again.
 */
function FormReset({ root }: { root: RefObject<HTMLElement | null> }): null {
  const value = use(SelectStateContext)?.value;
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  });
  // A passive effect: the root's ref is attached after its children's layout effects.
  useEffect(() => {
    const select = root.current?.querySelector('select');
    const form = select?.form;
    const onReset = (): void => {
      setTimeout(() => {
        if (select) select.value = String(latest.current ?? '');
      });
    };
    form?.addEventListener('reset', onReset);
    return () => form?.removeEventListener('reset', onReset);
  }, [root]);
  return null;
}

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
}) => {
  const root = useRef<HTMLElement | null>(null);
  const [isOpen, setOpen, popupKey] = useOpenState(open, defaultOpen, onOpenChange);
  return (
    <EngineLocale>
      <Select
        {...defined({
          value,
          defaultValue,
          name,
          isRequired: required,
          isDisabled: disabled,
          isInvalid: invalid,
          placeholder,
          'aria-label': label,
          'aria-labelledby': labelledBy,
        })}
        isOpen={isOpen}
        onOpenChange={setOpen}
        // React Aria reports no cause.
        onChange={(key) => onValueChange?.(key == null ? null : String(key), details('unknown'))}
        // A hidden native <select> carries name and required into forms.
        validationBehavior="native"
        render={(p, rp) => {
          const s: SelectRootState = { open: rp.isOpen, disabled: rp.isDisabled };
          const attrs = stateAttrs({ ...s, required: rp.isRequired, invalid });
          return render(mergeProps(engineDom(p), dom, attrs, { ref: root }), s);
        }}
      >
        {/* The value lives in the engine's root, so only the popup remounts (open-state.client). */}
        <PopupKey value={popupKey}>{children}</PopupKey>
        <FormReset root={root} />
      </Select>
    </EngineLocale>
  );
};

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
  const popup = useRef<HTMLElement | null>(null);
  const tabOut = useTabOut(popup);
  const trigger = useTriggerRef();
  const key = use(PopupKey);
  return (
    <Popover
      key={key}
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
        return render(mergeProps(engine, dom, attrs, { ref: popup }), s);
      }}
    >
      <ReturnFocus trigger={trigger} popup={popup} />
      <OutsidePress popup={popup} />
      <ListBox
        render={(p) => createElement('div', mergeProps(engineDom(p), list, { onKeyDown: tabOut }))}
      >
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

/** ARIA allows only option and group inside a listbox (axe aria-required-children), so the rule is
 * presentational: React Aria's role="separator" and its orientation are dropped. */
function presentational(props: object): Record<string, unknown> {
  const { role: _role, 'aria-orientation': _orientation, ...rest } = engineDom(props);
  return { ...rest, role: 'presentation' };
}

export const Separator: SelectEngine['Separator'] = ({ render, ...dom }) => (
  <EngineSeparator render={(p) => render(mergeProps(presentational(p), dom), {})} />
);
