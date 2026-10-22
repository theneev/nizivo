'use client';
// The ONLY Dialog module that imports the engine (ARCHITECTURE.md §9.2, §10.4). Behaviour only: no class names.
// ModalOverlay → positioner (+ the backdrop element first), Modal → popup, Dialog → content (role).
import { createElement, use, useEffect, useRef, type RefObject } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Modal,
  ModalOverlay,
  OverlayTriggerStateContext,
  Text,
} from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  DialogCloseState,
  DialogEngine,
  DialogPopupState,
  DialogTriggerState,
} from '../../dialog/dialog.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { OverlayScope, TOP_LAYER } from './overlay.client';
import { ReturnFocus, useTriggerRef } from './popup.client';
import { OutsidePress } from './outside-press.client';

/** A box-less wrapper: popups portaled into it position against the positioner. */
const NESTED_STYLE = { display: 'contents' } as const;

export const Root: DialogEngine['Root'] = ({ open, defaultOpen, onOpenChange, children }) => (
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

export const Trigger: DialogEngine['Trigger'] = ({ render, children, ...dom }) => {
  const open = use(OverlayTriggerStateContext)?.isOpen ?? false;
  return (
    <Button
      render={(p, rp) => {
        const s: DialogTriggerState = {
          open,
          // React Aria reports an open dialog's trigger as pressed; the vocabulary means a real press.
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
 * Moves focus to the leaf's initial-focus element. A child of the content element, so its effect runs
 * before React Aria's own focus-the-dialog effect (a parent's), which then sees focus inside and
 * leaves it; and after FocusScope recorded the trigger to return focus to.
 */
function InitialFocus({
  content,
  resolve,
}: {
  content: RefObject<HTMLElement | null>;
  resolve: (content: HTMLElement) => HTMLElement | null;
}): null {
  useEffect(() => {
    const element = content.current;
    if (element === null || element.contains(element.ownerDocument.activeElement)) return;
    resolve(element)?.focus();
  }, [content, resolve]);
  return null;
}

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
  const trigger = useTriggerRef();
  return (
    <ModalOverlay
      // An alertdialog never closes on outside press (§12.3).
      isDismissable={role !== 'alertdialog'}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const attrs = stateAttrs({
          open: rp.state.isOpen,
          entering: rp.isEntering,
          exiting: rp.isExiting,
        });
        return createElement(
          'div',
          mergeProps(engineDom(p), positioner, attrs),
          backdrop
            ? createElement('div', mergeProps(backdropProps, attrs, { 'aria-hidden': true }))
            : null,
          p.children,
          // The nested-portal container (§12.1 L2): last in the positioner, so nested overlays paint
          // above the popup; never transformed and never clipping. The engine hides everything
          // outside the modal popup, and a tooltip portaled here would be inert (unhoverable,
          // WCAG 1.4.13), so the container carries the family's top-layer exemption (§12.2).
          createElement('div', { ref: nestedRef, style: NESTED_STYLE, ...TOP_LAYER }),
        );
      }}
    >
      <OverlayScope container={nestedRef}>
        <Modal
          render={(p, rp) => {
            const s: DialogPopupState = { entering: rp.isEntering, exiting: rp.isExiting };
            const attrs = stateAttrs({ open: rp.state.isOpen, ...s });
            return render(mergeProps(engineDom(p), dom, attrs), s);
          }}
        >
          <Dialog
            role={role}
            {...defined({
              'aria-label': label,
              'aria-labelledby': labelledBy,
              'aria-describedby': describedBy,
            })}
            render={(p) =>
              createElement('section', mergeProps(engineDom(p), contentProps, { ref: contentRef }))
            }
          >
            <InitialFocus content={contentRef} resolve={initialFocus} />
            <ReturnFocus trigger={trigger} popup={contentRef} target={returnFocus} />
            <OutsidePress popup={contentRef} dismissable={role !== 'alertdialog'} />
            {children}
          </Dialog>
        </Modal>
      </OverlayScope>
    </ModalOverlay>
  );
};

export const Title: DialogEngine['Title'] = ({ level, render, children, ...dom }) => (
  <Heading slot="title" level={level} render={(p) => render(mergeProps(engineDom(p), dom), {})}>
    {children}
  </Heading>
);

export const Description: DialogEngine['Description'] = ({ render, children, ...dom }) => (
  <Text
    slot="description"
    elementType="p"
    render={(p: object) => render(mergeProps(engineDom(p), dom), {})}
  >
    {children}
  </Text>
);

export const Close: DialogEngine['Close'] = ({ render, children, ...dom }) => (
  <Button
    slot="close"
    render={(p, rp) => {
      const s: DialogCloseState = {
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
