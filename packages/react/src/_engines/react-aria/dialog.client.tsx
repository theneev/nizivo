'use client';
// The ONLY Dialog module that imports the engine (ARCHITECTURE.md §9.2, §10.4). Behaviour only: no class names.
// ModalOverlay → positioner (+ the backdrop element first), Modal → popup, Dialog → content (role).
import { createElement, use, useRef } from 'react';
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
import { OverlayScope } from './overlay.client';

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

export const Popup: DialogEngine['Popup'] = ({
  role,
  backdrop,
  container,
  positioner,
  backdropProps,
  contentProps,
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => {
  const positionerRef = useRef<HTMLDivElement | null>(null);
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
          mergeProps(engineDom(p), positioner, attrs, { ref: positionerRef }),
          backdrop
            ? createElement('div', mergeProps(backdropProps, attrs, { 'aria-hidden': true }))
            : null,
          p.children,
        );
      }}
    >
      <OverlayScope container={positionerRef}>
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
            render={(p) => createElement('section', mergeProps(engineDom(p), contentProps))}
          >
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
