'use client';
// The Base UI canary's Select (ARCHITECTURE.md §10.4, M65, D-dk): the same SelectEngine as
// react-aria/select.client.tsx, on Base UI 1.9.0, run by the overlay conformance lane under
// NZ_ADAPTER=base-ui and never shipped. Behaviour only: no class names.
// Base UI's Select.Root renders no element, so the adapter renders the root itself; Portal →
// Positioner (a bare positioned box) → Popup (the part) → List (the listbox). Two completions keep
// the contract (M74): Select.Value shows the raw value unless Base UI is given the items' labels,
// so the Root reads them from its children up front; and Base UI force-mounts the popup, hidden,
// once the trigger has focus (for typeahead on a closed trigger), so the adapter renders the Portal
// only while the popup is open or exiting. That costs Base UI's closed-trigger typeahead.
import { Select } from '@base-ui/react/select';
import {
  Children,
  createContext,
  createElement,
  isValidElement,
  use,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  SelectEngine,
  SelectItemState,
  SelectPopupState,
  SelectRootState,
  SelectTriggerState,
  SelectValueReason,
} from '../../select/select.contract';
import { openDetails } from './dialog.client';
import { defined, engineDom } from './dom';
import { useKeyboardModality } from './modality.client';
import { popupStyle, resolveSide, toPlacement, usePortalContainer } from './overlay.client';

interface Scope {
  /** The trigger's id, which labels the listbox (Base UI leaves the listbox unnamed). */
  triggerId: string;
  /** The Root's own id for the trigger, used unless the leaf gives one (a Field's). */
  fallbackId: string;
  setTriggerId: (id: string) => void;
  /** Open, or closed with its exit still running: only then is the popup in the DOM. */
  mounted: boolean;
  placeholder: string | undefined;
  /** The Root's accessible name, which Base UI puts on no element: the trigger carries it. */
  name: Record<string, string>;
}

const SelectScope = createContext<Scope>({
  triggerId: '',
  fallbackId: '',
  setTriggerId: () => undefined,
  mounted: false,
  placeholder: undefined,
  name: {},
});

function isNode(value: unknown): value is ReactNode {
  return value === null || value === undefined || typeof value !== 'function';
}

/** Every item's value → its text, from a Root's children (an Item: a `value` and a string). */
function itemLabels(node: ReactNode, out: Record<string, string> = {}): Record<string, string> {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) return;
    const props: unknown = child.props;
    if (typeof props !== 'object' || props === null) return;
    const value: unknown = Reflect.get(props, 'value');
    const text: unknown = Reflect.get(props, 'textValue');
    const children: unknown = Reflect.get(props, 'children');
    if (typeof value === 'string' && typeof text === 'string') out[value] = text;
    else if (typeof value === 'string' && typeof children === 'string') out[value] = children;
    else if (isNode(children)) itemLabels(children, out);
  });
  return out;
}

const VALUE_REASONS: Readonly<Record<string, SelectValueReason>> = {
  'item-press': 'item-press',
  keyboard: 'keyboard',
  'list-navigation': 'keyboard',
};

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
  const [isOpen, setOpen] = useState(defaultOpen ?? false);
  const [exiting, setExiting] = useState(false);
  const fallbackId = useId();
  const [triggerId, setTriggerId] = useState(fallbackId);
  const items = useMemo(() => itemLabels(children), [children]);
  const shown = open ?? isOpen;
  const s: SelectRootState = { open: shown, disabled: disabled === true };
  const scope = useMemo((): Scope => {
    const accessibleName: Record<string, string> = {};
    if (label !== undefined) accessibleName['aria-label'] = label;
    if (labelledBy !== undefined) accessibleName['aria-labelledby'] = labelledBy;
    return {
      triggerId,
      fallbackId,
      setTriggerId,
      mounted: shown || exiting,
      placeholder,
      name: accessibleName,
    };
  }, [triggerId, fallbackId, shown, exiting, placeholder, label, labelledBy]);
  return render(
    mergeProps(dom, stateAttrs({ ...s, required, invalid }), {
      // the children go in the root element, as React Aria's render puts them
      children: (
        <SelectScope value={scope}>
          <Select.Root<string>
            {...defined({ value, defaultValue, name, required, disabled })}
            open={shown}
            items={items}
            // a closed popup leaves the DOM (§12.2), once its exit has run
            onOpenChangeComplete={(next) => {
              if (!next) setExiting(false);
            }}
            onOpenChange={(next, d) => {
              setOpen(next);
              if (!next) setExiting(true);
              onOpenChange?.(next, openDetails(d.reason, d.event));
            }}
            onValueChange={(next, d) =>
              onValueChange?.(next, details(VALUE_REASONS[d.reason] ?? 'unknown', d.event))
            }
          >
            {children}
          </Select.Root>
        </SelectScope>
      ),
    }),
    s,
  );
};

export const Trigger: SelectEngine['Trigger'] = ({ id, render, children, ...dom }) => {
  const { name, fallbackId, setTriggerId } = use(SelectScope);
  const triggerId = id ?? fallbackId;
  useLayoutEffect(() => setTriggerId(triggerId), [setTriggerId, triggerId]);
  return (
    <Select.Trigger
      render={(p, bs) => {
        // Base UI reports no press or keyboard focus on its trigger
        const s: SelectTriggerState = {
          open: bs.open,
          pressed: false,
          focusVisible: false,
          disabled: bs.disabled,
        };
        // the listbox is labelled by this id
        return render(mergeProps(engineDom(p), name, dom, { id: triggerId }, stateAttrs(s)), s);
      }}
    >
      {children}
    </Select.Trigger>
  );
};

export const Value: SelectEngine['Value'] = ({ render, children: _children, ...dom }) => {
  const { placeholder } = use(SelectScope);
  return (
    <Select.Value
      {...defined({ placeholder })}
      render={(p, bs) => {
        const s = { placeholder: bs.placeholder };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    ></Select.Value>
  );
};

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
  const portal = usePortalContainer(container);
  const { mounted, triggerId } = use(SelectScope);
  const placement = toPlacement(side, align);
  const direction =
    typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
  if (!mounted) return <></>;
  return (
    <Select.Portal {...defined({ container: portal })}>
      <Select.Positioner
        side={placement.side}
        align={placement.align}
        sideOffset={sideOffset}
        // a listbox under its trigger, as the react-aria family places it
        alignItemWithTrigger={false}
        render={(p) => createElement('div', engineDom(p))}
      >
        <Select.Popup
          render={(p, bs) => {
            const s: SelectPopupState = {
              entering: bs.transitionStatus === 'starting',
              exiting: bs.transitionStatus === 'ending',
              side: resolveSide(bs.side === 'none' ? null : bs.side, side, direction),
            };
            const engine = { ...engineDom(p), style: popupStyle(p.style) };
            const attrs = stateAttrs({ open: bs.open, ...s, align });
            return render(mergeProps(engine, dom, attrs), s);
          }}
        >
          <Select.List
            render={(p) =>
              createElement('div', mergeProps(engineDom(p), list, { 'aria-labelledby': triggerId }))
            }
          >
            {children}
          </Select.List>
        </Select.Popup>
      </Select.Positioner>
    </Select.Portal>
  );
};

export const Item: SelectEngine['Item'] = ({
  value,
  textValue,
  disabled,
  render,
  children,
  ...dom
}) => {
  const text = textValue ?? (typeof children === 'string' ? children : value);
  const keyboard = useKeyboardModality();
  return (
    <Select.Item
      value={value}
      label={text}
      {...defined({ disabled })}
      render={(p, bs) => {
        const s: SelectItemState = {
          highlighted: bs.highlighted,
          selected: bs.selected,
          disabled: bs.disabled,
          // Base UI has no focus-visible state: the highlight shows a ring after a key press
          focusVisible: bs.highlighted && keyboard,
        };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </Select.Item>
  );
};

export const Group: SelectEngine['Group'] = ({ render, children, ...dom }) => (
  <Select.Group render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Select.Group>
);

export const GroupLabel: SelectEngine['GroupLabel'] = ({ render, children, ...dom }) => (
  <Select.GroupLabel render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </Select.GroupLabel>
);

/** ARIA allows only option and group inside a listbox, so the rule is presentational. */
function presentational(props: object): Record<string, unknown> {
  const { role: _role, 'aria-orientation': _orientation, ...rest } = engineDom(props);
  return { ...rest, role: 'presentation' };
}

export const Separator: SelectEngine['Separator'] = ({ render, ...dom }) => (
  <Select.Separator render={(p) => render(mergeProps(presentational(p), dom), {})} />
);
