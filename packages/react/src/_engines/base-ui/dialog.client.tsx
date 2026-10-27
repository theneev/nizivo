'use client';
// The Base UI canary's Dialog (ARCHITECTURE.md §10.4, M65, D-dk): the same DialogEngine as
// react-aria/dialog.client.tsx, on Base UI 1.9.0, run by the overlay conformance lane under
// NZ_ADAPTER=base-ui and never shipped. Behaviour only: no class names.
// Portal → positioner (the backdrop first, the nested-portal container last), Viewport → popup,
// Popup → content (role). Base UI reports why a dialog opened or closed, so `details.reason` is real.
import { Dialog } from '@base-ui/react/dialog';
import {
  createContext,
  createElement,
  use,
  useCallback,
  useLayoutEffect,
  useRef,
  type RefObject,
} from 'react';
import { details, type ChangeDetails, type OpenReason } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  DialogCloseState,
  DialogEngine,
  DialogPopupState,
  DialogTriggerState,
} from '../../dialog/dialog.contract';
import type { ReturnFocusTarget } from '../../_internal/overlay';
import { defined, engineDom } from './dom';
import { OverlayScope, usePortalContainer } from './overlay.client';

/** A box-less wrapper: popups portaled into it position against the positioner. */
const NESTED_STYLE = { display: 'contents' } as const;

const REASONS: Readonly<Record<string, OpenReason>> = {
  'trigger-press': 'trigger',
  'escape-key': 'escape',
  'close-watcher': 'escape',
  'outside-press': 'outside-press',
  'close-press': 'close-part',
  'item-press': 'item-press',
  'imperative-action': 'programmatic',
};

/** Base UI's change details as Nizivo's: its reason mapped, else `'unknown'`. */
export function openDetails(reason: string, event: Event | undefined): ChangeDetails<OpenReason> {
  return details(REASONS[reason] ?? 'unknown', event);
}

/** `returnFocus` as Base UI's `finalFocus`: the trigger (`true`), nowhere (`false`) or a target. */
export function finalFocus(
  target: ReturnFocusTarget,
): boolean | RefObject<HTMLElement | null> | (() => HTMLElement | boolean) {
  if (typeof target !== 'function') return target;
  return () => target() ?? true;
}

/** Whether the Root's popup is an alertdialog: the Popup knows its role, the Root decides closes. */
const AlertDialog = createContext<((alert: boolean) => void) | null>(null);

export const Root: DialogEngine['Root'] = ({ open, defaultOpen, onOpenChange, children }) => {
  const alert = useRef(false);
  const setAlert = useCallback((value: boolean): void => {
    alert.current = value;
  }, []);
  return (
    <AlertDialog value={setAlert}>
      <Dialog.Root
        {...defined({ open, defaultOpen })}
        onOpenChange={(next, d) => {
          // an alertdialog never closes on outside press (§12.3); Base UI's AlertDialog is a
          // separate Root, and the contract's role is the Popup's
          if (!next && d.reason === 'outside-press' && alert.current) {
            d.cancel();
            return;
          }
          onOpenChange?.(next, openDetails(d.reason, d.event));
        }}
      >
        {children}
      </Dialog.Root>
    </AlertDialog>
  );
};

export const Trigger: DialogEngine['Trigger'] = ({ render, children, ...dom }) => (
  <Dialog.Trigger
    render={(p, bs) => {
      // Base UI reports no press or keyboard focus on its trigger
      const s: DialogTriggerState = {
        open: bs.open,
        pressed: false,
        focusVisible: false,
        disabled: bs.disabled,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </Dialog.Trigger>
);

export const Popup: DialogEngine['Popup'] = ({
  role,
  backdrop,
  container,
  positioner,
  backdropProps,
  contentProps,
  initialFocus,
  returnFocus,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => {
  const nestedRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const portal = usePortalContainer(container);
  const setAlert = use(AlertDialog);
  useLayoutEffect(() => setAlert?.(role === 'alertdialog'), [setAlert, role]);
  return (
    <Dialog.Portal
      {...defined({ container: portal })}
      render={(p) =>
        createElement(
          'div',
          mergeProps(engineDom(p), positioner, stateAttrs({ open: true })),
          p.children,
          // the nested-portal container (§12.1 L2), last in the positioner
          createElement('div', { ref: nestedRef, style: NESTED_STYLE }),
        )
      }
    >
      {backdrop ? (
        <Dialog.Backdrop
          render={(p, bs) =>
            createElement(
              'div',
              mergeProps(
                engineDom(p),
                backdropProps,
                stateAttrs({
                  open: bs.open,
                  entering: bs.transitionStatus === 'starting',
                  exiting: bs.transitionStatus === 'ending',
                }),
                { 'aria-hidden': true },
              ),
            )
          }
        />
      ) : null}
      <Dialog.Viewport
        render={(p, bs) => {
          const s: DialogPopupState = {
            entering: bs.transitionStatus === 'starting',
            exiting: bs.transitionStatus === 'ending',
          };
          return render(mergeProps(engineDom(p), dom, stateAttrs({ open: bs.open, ...s })), s);
        }}
      >
        <OverlayScope container={nestedRef}>
          <Dialog.Popup
            role={role}
            {...defined({
              'aria-label': label,
              'aria-labelledby': labelledBy,
              'aria-describedby': describedBy,
            })}
            // the leaf's target, else the popup itself (§12.2), not Base UI's first tabbable
            initialFocus={() =>
              (contentRef.current === null ? null : initialFocus(contentRef.current)) ??
              contentRef.current ??
              true
            }
            finalFocus={finalFocus(returnFocus)}
            render={(p) =>
              createElement('section', mergeProps(engineDom(p), contentProps, { ref: contentRef }))
            }
          >
            {children}
          </Dialog.Popup>
        </OverlayScope>
      </Dialog.Viewport>
    </Dialog.Portal>
  );
};

export const Title: DialogEngine['Title'] = ({ level: _level, render, children, ...dom }) => (
  <Dialog.Title render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Dialog.Title>
);

export const Description: DialogEngine['Description'] = ({ render, children, ...dom }) => (
  <Dialog.Description render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </Dialog.Description>
);

export const Close: DialogEngine['Close'] = ({ render, children, ...dom }) => (
  <Dialog.Close
    render={(p, bs) => {
      const s: DialogCloseState = { pressed: false, focusVisible: false, disabled: bs.disabled };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </Dialog.Close>
);
