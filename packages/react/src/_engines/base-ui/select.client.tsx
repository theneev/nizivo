'use client';
// The Base UI canary's Select (ARCHITECTURE.md §10.4, M65, D-dk): the same SelectEngine as
// react-aria/select.client.tsx, on Base UI 1.9.0, run by the overlay conformance lane under
// NZ_ADAPTER=base-ui and never shipped. Behaviour only: no class names.
// Base UI's Select.Root renders no element, so the adapter renders the root itself; Portal →
// Positioner (a bare positioned box) → Popup (the part) → List (the listbox). Select.Value shows the
// raw value unless it is given labels, so the items register theirs.
import { Select } from '@base-ui/react/select';
import {
  createContext,
  createElement,
  use,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
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
import { popupStyle, resolveSide, toPlacement, usePortalContainer } from './overlay.client';

interface Scope {
  /** Item value → its text, for Select.Value. */
  labels: ReadonlyMap<string, string>;
  setLabels: Dispatch<SetStateAction<ReadonlyMap<string, string>>>;
  placeholder: string | undefined;
  /** The Root's accessible name, which Base UI puts on no element: the trigger carries it. */
  name: Record<string, string>;
}

const SelectScope = createContext<Scope>({
  labels: new Map(),
  setLabels: () => undefined,
  placeholder: undefined,
  name: {},
});

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
  const [labels, setLabels] = useState<ReadonlyMap<string, string>>(new Map());
  const [isOpen, setOpen] = useState(defaultOpen ?? false);
  const shown = open ?? isOpen;
  const s: SelectRootState = { open: shown, disabled: disabled === true };
  const scope = useMemo((): Scope => {
    const accessibleName: Record<string, string> = {};
    if (label !== undefined) accessibleName['aria-label'] = label;
    if (labelledBy !== undefined) accessibleName['aria-labelledby'] = labelledBy;
    return { labels, setLabels, placeholder, name: accessibleName };
  }, [labels, placeholder, label, labelledBy]);
  return render(
    mergeProps(dom, stateAttrs({ ...s, required, invalid }), {
      // the children go in the root element, as React Aria's render puts them
      children: (
        <SelectScope value={scope}>
          <Select.Root<string>
            {...defined({ value, defaultValue, name, required, disabled })}
            open={shown}
            onOpenChange={(next, d) => {
              setOpen(next);
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

export const Trigger: SelectEngine['Trigger'] = ({ render, children, ...dom }) => {
  const { name } = use(SelectScope);
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
        return render(mergeProps(engineDom(p), name, dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </Select.Trigger>
  );
};

export const Value: SelectEngine['Value'] = ({ render, children: _children, ...dom }) => {
  const { labels, placeholder } = use(SelectScope);
  return (
    <Select.Value
      {...defined({ placeholder })}
      render={(p, bs) => {
        const s = { placeholder: bs.placeholder };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {(value: unknown) => (typeof value === 'string' ? (labels.get(value) ?? value) : null)}
    </Select.Value>
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
  const placement = toPlacement(side, align);
  const direction =
    typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';
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
          <Select.List render={(p) => createElement('div', mergeProps(engineDom(p), list))}>
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
  const { setLabels } = use(SelectScope);
  const text = textValue ?? (typeof children === 'string' ? children : value);
  useLayoutEffect(() => {
    setLabels((prev) => (prev.get(value) === text ? prev : new Map(prev).set(value, text)));
  }, [setLabels, value, text]);
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
          focusVisible: false,
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
