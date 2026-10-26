'use client';
// The ONLY Combobox module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class
// names. React Aria owns the combobox pattern: the input keeps focus while Arrow Down / Up move the
// active option (aria-activedescendant), Enter chooses, Escape closes and then clears, the list
// filters as the reader types ("contains", in the locale's collation) and announces its count. Its
// popover is non-modal: no scroll lock, no inert page, and a blur closes it.
import {
  createContext,
  createElement,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  Button,
  ComboBox,
  ComboBoxStateContext,
  Group as EngineGroup,
  Header,
  Input as EngineInput,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Separator as EngineSeparator,
  useLocale,
} from 'react-aria-components';
import type {
  ComboboxEngine,
  ComboboxInputState,
  ComboboxItemState,
  ComboboxPopupState,
  ComboboxRootState,
  ComboboxTriggerState,
} from '../../combobox/combobox.contract';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { PopupKey } from './open-state.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';

/** The Root's `menuTrigger`, for the input's click. */
const MenuTrigger = createContext<string | undefined>(undefined);

/** `defaultOpen`: React Aria has no open prop, so the list opens once, after mount, showing every item. */
function DefaultOpen({ open }: { open: boolean | undefined }): null {
  const state = use(ComboBoxStateContext);
  const once = useRef(open === true);
  useEffect(() => {
    if (!once.current) return;
    once.current = false;
    state?.open(null, 'manual');
  }, [state]);
  return null;
}

/**
 * A hidden <Activity> keeps state and destroys effects (ARCHITECTURE.md §12.2 "Activity", O-15), as
 * open-state.client describes for the family's other Roots. React Aria keeps the combobox's open
 * state itself, so a list opened after mount closes here, in a layout-effect cleanup, and
 * `onOpenChange(false, { reason: 'hidden' })` tells the consumer; one open at mount never closes this
 * way, so Strict Mode's mount, cleanup, mount changes nothing.
 */
function CloseWhenHidden({
  onOpenChange,
  remount,
}: {
  onOpenChange: Parameters<ComboboxEngine['Root']>[0]['onOpenChange'];
  /** Remounts the popup: React Aria keeps a closing popover until an effect sees its exit end, and a
   * hidden Activity runs no effects (React 19.2 shows the portal under it; open-state.client). */
  remount: () => void;
}): null {
  const state = use(ComboBoxStateContext);
  const isOpen = state?.isOpen ?? false;
  const latest = useRef({ state, onOpenChange, remount });
  useLayoutEffect(() => {
    latest.current = { state, onOpenChange, remount };
  });
  const seenClosed = useRef(false);
  const armed = useRef(false);
  useLayoutEffect(() => {
    if (!isOpen) seenClosed.current = true;
    armed.current = isOpen && seenClosed.current;
  }, [isOpen]);
  useLayoutEffect(
    () => () => {
      if (!armed.current) return;
      armed.current = false;
      latest.current.state?.close();
      latest.current.remount();
      latest.current.onOpenChange?.(false, details('hidden'));
    },
    [],
  );
  return null;
}

export const Root: ComboboxEngine['Root'] = ({
  value,
  defaultValue,
  onValueChange,
  inputValue,
  defaultInputValue,
  onInputChange,
  defaultOpen,
  onOpenChange,
  allowsCustomValue,
  menuTrigger,
  name,
  required,
  disabled,
  readOnly,
  invalid,
  id,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  control,
  render,
  children,
  ...dom
}) => {
  const [popupKey, setPopupKey] = useState(0);
  return (
    <EngineLocale>
      <ComboBox
        {...defined({
          value,
          defaultValue,
          inputValue,
          defaultInputValue,
          onInputChange,
          allowsCustomValue,
          menuTrigger,
          name,
          isRequired: required,
          isDisabled: disabled,
          isReadOnly: readOnly,
          isInvalid: invalid,
          id,
          'aria-label': label,
          'aria-labelledby': labelledBy,
        })}
        // React Aria reports no cause.
        onChange={(key) => onValueChange?.(key == null ? null : String(key), details('unknown'))}
        onOpenChange={(open) => onOpenChange?.(open, details('unknown'))}
        // The input's own constraints (required) reach the Field's validation.
        validationBehavior="native"
        render={(p, rp) => {
          const s: ComboboxRootState = {
            open: rp.isOpen,
            disabled: rp.isDisabled,
            readOnly: rp.isReadOnly,
            required: rp.isRequired,
            // presented only: the Field owns the message (§8.3)
            invalid: invalid === true,
          };
          return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
        }}
      >
        {/* the box: the popover lines up with it, the Trigger included */}
        <PopupKey value={popupKey}>
          <MenuTrigger value={menuTrigger}>
            <EngineGroup
              render={(p, rp) =>
                createElement(
                  'div',
                  mergeProps(
                    engineDom(p),
                    control,
                    stateAttrs({ invalid: invalid === true, disabled: rp.isDisabled, readOnly }),
                  ),
                )
              }
            >
              {children}
            </EngineGroup>
          </MenuTrigger>
        </PopupKey>
        <DefaultOpen open={defaultOpen} />
        <CloseWhenHidden onOpenChange={onOpenChange} remount={() => setPopupKey((k) => k + 1)} />
      </ComboBox>
    </EngineLocale>
  );
};

export const Input: ComboboxEngine['Input'] = ({ render, ...dom }) => {
  const state = use(ComboBoxStateContext);
  const menuTrigger = use(MenuTrigger);
  const open = state?.isOpen ?? false;
  // With menuTrigger="focus" a press on the input opens the list too, so a list closed with Escape
  // opens again from the pointer without leaving the input first.
  const onClick =
    menuTrigger === 'focus'
      ? () => {
          if (state !== null && !state.isOpen) state.open(null, 'manual');
        }
      : undefined;
  return (
    <EngineInput
      render={(p, rp) => {
        const s: ComboboxInputState = {
          open,
          focusVisible: rp.isFocusVisible,
          disabled: rp.isDisabled,
        };
        // React Aria's describedby names its own description and error slots, which Nizivo never
        // renders (Field owns them): ids that point at nothing. The part passes the Field's ids.
        const { 'aria-describedby': _slots, ...engine } = engineDom(p);
        return render(mergeProps(engine, { onClick }, dom, stateAttrs({ open })), s);
      }}
    />
  );
};

export const Trigger: ComboboxEngine['Trigger'] = ({ render, children, ...dom }) => {
  const open = use(ComboBoxStateContext)?.isOpen ?? false;
  return (
    <Button
      render={(p, rp) => {
        const s: ComboboxTriggerState = {
          open,
          // React Aria reports an open combobox's button as pressed; the vocabulary means a real press.
          pressed: rp.isPressed && !open,
          disabled: rp.isDisabled,
        };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </Button>
  );
};

export const Popup: ComboboxEngine['Popup'] = ({
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
  const key = use(PopupKey);
  return (
    <Popover
      key={key}
      placement={toPlacement(side, align)}
      offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const s: ComboboxPopupState = {
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

export const Item: ComboboxEngine['Item'] = ({
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
      const s: ComboboxItemState = {
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

export const Group: ComboboxEngine['Group'] = ({ render, children, ...dom }) => (
  <ListBoxSection render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </ListBoxSection>
);

export const GroupLabel: ComboboxEngine['GroupLabel'] = ({ render, children, ...dom }) => (
  <Header render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Header>
);

/** ARIA allows only option and group inside a listbox (axe aria-required-children), so the rule is
 * presentational: React Aria's role="separator" and its orientation are dropped. */
function presentational(props: object): Record<string, unknown> {
  const { role: _role, 'aria-orientation': _orientation, ...rest } = engineDom(props);
  return { ...rest, role: 'presentation' };
}

export const Separator: ComboboxEngine['Separator'] = ({ render, ...dom }) => (
  <EngineSeparator render={(p) => render(mergeProps(presentational(p), dom), {})} />
);
