'use client';
// The ONLY Popover module that imports the engine (ARCHITECTURE.md §9.2, §12.3 Popover row).
// Behaviour only: no class names. DialogTrigger → Root, Button → Trigger, Popover → the positioned
// popup, Dialog → the content element carrying role="dialog".
import { createElement, use, useCallback, useRef, type RefObject } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  OverlayTriggerStateContext,
  Popover,
  Text,
  useLocale,
} from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  PopoverCloseState,
  PopoverEngine,
  PopoverPopupState,
  PopoverTriggerState,
} from '../../popover/popover.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { markTopLayer, OverlayScope, popupStyle, resolveSide, toPlacement } from './overlay.client';
import { InitialFocus, ReturnFocus, useTriggerRef } from './popup.client';
import { OutsidePress } from './outside-press.client';

export const Root: PopoverEngine['Root'] = ({ open, defaultOpen, onOpenChange, children }) => (
  <EngineLocale>
    <DialogTrigger
      {...defined({ isOpen: open, defaultOpen })}
      // React Aria reports no cause.
      onOpenChange={(isOpen) => onOpenChange?.(isOpen, details('unknown'))}
    >
      {children}
    </DialogTrigger>
  </EngineLocale>
);

export const Trigger: PopoverEngine['Trigger'] = ({ render, children, ...dom }) => {
  const open = use(OverlayTriggerStateContext)?.isOpen ?? false;
  return (
    <Button
      render={(p, rp) => {
        const s: PopoverTriggerState = {
          open,
          // React Aria reports an open popover's trigger as pressed; the vocabulary means a real press.
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
 * The nested-portal container (§12.1 L2): a box-less element right after the popup, in the
 * container the popup portaled into, so overlays opened inside the popover paint above it. It is not
 * inside the popup, which scrolls (a clip) and scales while it enters. The engine hides everything
 * outside a modal popover, so it carries the family's top-layer exemption, as the Dialog's does: a
 * tooltip portaled there stays hoverable (WCAG 1.4.13). Created here, not by React, because the
 * engine owns the popup's portal and nothing can render a sibling into it. A hidden anchor inside
 * the popup makes it with a stable callback ref: in the commit that inserts the popup, so a tooltip
 * shown by the initial focus (a passive effect) already finds it; a ref merged into the popup's own
 * props would be a new function, detached and attached again, on every render.
 */
function useNestedContainer(): {
  container: RefObject<HTMLElement | null>;
  anchor: (element: HTMLElement | null) => (() => void) | undefined;
} {
  const container = useRef<HTMLElement | null>(null);
  const anchor = useCallback((element: HTMLElement | null) => {
    const popup = element?.parentElement;
    if (popup == null) return undefined;
    const nested = popup.ownerDocument.createElement('div');
    nested.style.display = 'contents';
    const undo = markTopLayer(nested);
    popup.after(nested);
    container.current = nested;
    return () => {
      undo();
      nested.remove();
      if (container.current === nested) container.current = null;
    };
  }, []);
  return { container, anchor };
}

export const Popup: PopoverEngine['Popup'] = ({
  side,
  align,
  sideOffset,
  container,
  contentProps,
  initialFocus,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => {
  const { direction } = useLocale();
  const popup = useRef<HTMLElement | null>(null);
  const content = useRef<HTMLElement | null>(null);
  const { container: nested, anchor } = useNestedContainer();
  const trigger = useTriggerRef();
  return (
    <Popover
      placement={toPlacement(side, align)}
      offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const s: PopoverPopupState = {
          entering: rp.isEntering,
          exiting: rp.isExiting,
          side: resolveSide(rp.placement, side, direction),
        };
        const engine = { ...engineDom(p), style: popupStyle(p.style) };
        const attrs = stateAttrs({ open: !rp.isExiting, ...s, align });
        return render(mergeProps(engine, dom, attrs, { ref: popup }), s);
      }}
    >
      <span hidden ref={anchor} />
      <Dialog
        {...defined({
          'aria-label': label,
          'aria-labelledby': labelledBy,
          'aria-describedby': describedBy,
        })}
        render={(p) =>
          createElement('section', mergeProps(engineDom(p), contentProps, { ref: content }))
        }
      >
        <InitialFocus content={content} resolve={initialFocus} />
        <ReturnFocus trigger={trigger} popup={popup} />
        <OutsidePress popup={popup} />
        <OverlayScope container={nested}>{children}</OverlayScope>
      </Dialog>
    </Popover>
  );
};

export const Title: PopoverEngine['Title'] = ({ level, render, children, ...dom }) => (
  <Heading slot="title" level={level} render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </Heading>
);

export const Description: PopoverEngine['Description'] = ({ render, children, ...dom }) => (
  <Text
    slot="description"
    elementType="p"
    render={(p: object) => render(mergeProps(engineDom(p), dom), {})}
  >
    {children}
  </Text>
);

export const Close: PopoverEngine['Close'] = ({ render, children, ...dom }) => (
  <Button
    slot="close"
    render={(p, rp) => {
      const s: PopoverCloseState = {
        pressed: rp.isPressed,
        focusVisible: rp.isFocusVisible,
        disabled: rp.isDisabled,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </Button>
);
