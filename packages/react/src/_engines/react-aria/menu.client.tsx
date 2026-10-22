'use client';
// The ONLY Menu module that imports the engine (ARCHITECTURE.md §9.2, §12.3). Behaviour only: no class
// names. MenuTrigger → Root, Button → Trigger, Popover → popup with Menu → the role="menu" list.
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  use,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Button,
  Header,
  Menu,
  MenuItem,
  MenuSection,
  MenuTrigger,
  Popover,
  RootMenuTriggerStateContext,
  Separator as EngineSeparator,
  useLocale,
  type Key,
} from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  MenuEngine,
  MenuItemState,
  MenuPopupState,
  MenuTriggerState,
} from '../../menu/menu.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';
import { ReturnFocus, useTabOut, useTriggerRef } from './popup.client';
import { OutsidePress } from './outside-press.client';

/**
 * Uncontrolled checkbox and radio state, kept by the Root: the popup and everything in it unmount on
 * close, so state held there would reset on every open. A checkbox item is identified by its text, a
 * radio group by its items' values; without either, the state lasts while the popup is open.
 */
const Kept = createContext<Map<string, unknown> | null>(null);

function useKept<T>(
  key: string | undefined,
  initial: T,
  read: (value: unknown) => value is T,
): [T, (next: T) => void] {
  const store = use(Kept);
  const [value, setValue] = useState<T>(() => {
    const kept = key === undefined ? undefined : store?.get(key);
    return read(kept) ? kept : initial;
  });
  return [
    value,
    (next) => {
      if (key !== undefined) store?.set(key, next);
      setValue(next);
    },
  ];
}

const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isChoice = (value: unknown): value is string | null =>
  typeof value === 'string' || value === null;

/** The `value` props of the radio items under `children`, through fragments and wrappers. */
function itemValues(children: ReactNode, out: string[] = []): string[] {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: unknown; children?: ReactNode }>(child)) return;
    if (typeof child.props.value === 'string') out.push(child.props.value);
    else itemValues(child.props.children, out);
  });
  return out;
}

export const Root: MenuEngine['Root'] = ({ open, defaultOpen, onOpenChange, children }) => {
  const [store] = useState(() => new Map<string, unknown>());
  return (
    <EngineLocale>
      <Kept value={store}>
        <MenuTrigger
          {...defined({ isOpen: open, defaultOpen })}
          // React Aria reports no cause.
          onOpenChange={(isOpen) => onOpenChange?.(isOpen, details('unknown'))}
        >
          {children}
        </MenuTrigger>
      </Kept>
    </EngineLocale>
  );
};

export const Trigger: MenuEngine['Trigger'] = ({ render, children, ...dom }) => {
  const open = use(RootMenuTriggerStateContext)?.isOpen ?? false;
  return (
    <Button
      render={(p, rp) => {
        const s: MenuTriggerState = {
          open,
          // React Aria reports an open menu's trigger as pressed; the vocabulary means a real press.
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

/**
 * The engine names the menu by its trigger (`aria-labelledby`), which would outrank an `aria-label`
 * the leaf passes; with one, the label names the menu instead.
 */
function listDom(engine: object, list: Record<string, unknown>): Record<string, unknown> {
  const out = engineDom(engine);
  if (list['aria-label'] !== undefined) delete out['aria-labelledby'];
  return out;
}

export const Popup: MenuEngine['Popup'] = ({
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
  return (
    <Popover
      placement={toPlacement(side, align)}
      offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const s: MenuPopupState = {
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
      <Menu
        render={(p) =>
          createElement('div', mergeProps(listDom(p, list), list, { onKeyDown: tabOut }))
        }
      >
        {children}
      </Menu>
    </Popover>
  );
};

export const Item: MenuEngine['Item'] = ({
  textValue,
  disabled,
  onAction,
  closeOnSelect,
  href,
  target,
  rel,
  download,
  hrefLang,
  ping,
  referrerPolicy,
  render,
  children,
  ...dom
}) => (
  <MenuItem
    {...defined({
      textValue,
      isDisabled: disabled,
      onAction,
      shouldCloseOnSelect: closeOnSelect,
      // Link mode: React Aria renders an <a> and follows it on Enter (§9.3 rule 3).
      href,
      target,
      rel,
      download,
      hrefLang,
      ping,
      referrerPolicy,
    })}
    render={(p, rp) => {
      const s: MenuItemState = {
        highlighted: rp.isFocused,
        disabled: rp.isDisabled,
        focusVisible: rp.isFocusVisible,
        checked: false,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </MenuItem>
);

/**
 * React Aria derives checkbox semantics from a selection scope (a Menu or MenuSection with
 * `selectionMode`), which would turn every item in that scope into a checkbox. A checkbox item owns
 * its own state instead: the adapter keeps it, toggles it on the item's action and writes the
 * `menuitemcheckbox` role and `aria-checked` the engine would have written.
 */
export const CheckboxItem: MenuEngine['CheckboxItem'] = ({
  checked,
  defaultChecked,
  onCheckedChange,
  textValue,
  disabled,
  onAction,
  closeOnSelect,
  render,
  children,
  ...dom
}) => {
  const [own, setOwn] = useKept(
    textValue === undefined ? undefined : `checkbox:${textValue}`,
    defaultChecked ?? false,
    isBoolean,
  );
  const isChecked = checked ?? own;
  return (
    <MenuItem
      {...defined({ textValue, isDisabled: disabled })}
      // A checkbox menu stays open so several items can be toggled (APG menu button pattern).
      shouldCloseOnSelect={closeOnSelect ?? false}
      onAction={() => {
        const next = !isChecked;
        if (checked === undefined) setOwn(next);
        onCheckedChange?.(next, details('item-press'));
        onAction?.();
      }}
      render={(p, rp) => {
        const s: MenuItemState = {
          highlighted: rp.isFocused,
          disabled: rp.isDisabled,
          focusVisible: rp.isFocusVisible,
          checked: isChecked,
        };
        const aria = { role: 'menuitemcheckbox', 'aria-checked': isChecked };
        return render(mergeProps(engineDom(p), aria, dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </MenuItem>
  );
};

/** A single-selection scope: React Aria gives its items `menuitemradio` and `aria-checked`. */
export const RadioGroup: MenuEngine['RadioGroup'] = ({
  value,
  defaultValue,
  onValueChange,
  render,
  children,
  ...dom
}) => {
  const values = itemValues(children);
  const [own, setOwn] = useKept(
    values.length === 0 ? undefined : `radio:${values.join('\u0000')}`,
    defaultValue ?? null,
    isChoice,
  );
  const current = value === undefined ? own : value;
  const selected: Key[] = current === null ? [] : [current];
  return (
    <MenuSection
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={selected}
      onSelectionChange={(selection) => {
        if (selection === 'all') return;
        const [key] = selection;
        if (key === undefined) return;
        if (value === undefined) setOwn(String(key));
        // React Aria reports no cause.
        onValueChange?.(String(key), details('unknown'));
      }}
      render={(p) => render(mergeProps(engineDom(p), dom), {})}
    >
      {children}
    </MenuSection>
  );
};

export const RadioItem: MenuEngine['RadioItem'] = ({
  value,
  textValue,
  disabled,
  onAction,
  closeOnSelect,
  render,
  children,
  ...dom
}) => (
  <MenuItem
    id={value}
    {...defined({ textValue, isDisabled: disabled, onAction, shouldCloseOnSelect: closeOnSelect })}
    render={(p, rp) => {
      const s: MenuItemState = {
        highlighted: rp.isFocused,
        disabled: rp.isDisabled,
        focusVisible: rp.isFocusVisible,
        checked: rp.isSelected,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </MenuItem>
);

export const Group: MenuEngine['Group'] = ({ render, children, ...dom }) => (
  <MenuSection render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</MenuSection>
);

export const GroupLabel: MenuEngine['GroupLabel'] = ({ render, children, ...dom }) => (
  <Header render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Header>
);

export const Separator: MenuEngine['Separator'] = ({ render, ...dom }) => (
  <EngineSeparator render={(p) => render(mergeProps(engineDom(p), dom), {})} />
);
