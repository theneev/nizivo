'use client';
// Seam baseline: Dialog written on React Aria directly (see select.tsx): DialogTrigger, a dismissable
// ModalOverlay (the positioner and backdrop), Modal (the popup) and Dialog (the content), with the
// same parts and classes. Not here (Nizivo-only): the vocabulary data-* mapping, `render` props, the
// nested-portal container and its top-layer exemption, initial focus by role, focus return for a
// server-open popup, nested-modal backdrop suppression.
import type { JSX, ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogTrigger as TriggerScope,
  Heading,
  I18nProvider,
  Modal,
  ModalOverlay,
  Text,
  type DialogTriggerProps,
} from 'react-aria-components';

export function DialogRoot({
  locale = 'en-US',
  children,
  ...props
}: DialogTriggerProps & { locale?: string }): JSX.Element {
  return (
    <I18nProvider locale={locale}>
      <TriggerScope {...props}>{children}</TriggerScope>
    </I18nProvider>
  );
}

export function DialogTrigger({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Button className="nz-dialog-trigger nz-hit-target" data-slot="dialog-trigger">
      {children}
    </Button>
  );
}

export function DialogPopup({
  role = 'dialog',
  size = 'md',
  children,
}: {
  role?: 'dialog' | 'alertdialog';
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}): JSX.Element {
  return (
    <ModalOverlay
      isDismissable={role !== 'alertdialog'}
      className="nz-dialog-positioner"
      data-slot="dialog-positioner"
    >
      <div className="nz-dialog-backdrop" data-slot="dialog-backdrop" aria-hidden="true" />
      <Modal className="nz-dialog-popup" data-slot="dialog-popup" data-size={size}>
        <Dialog role={role} className="nz-dialog-content" data-slot="dialog-content">
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function DialogTitle({
  level = 2,
  children,
}: {
  level?: 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
}): JSX.Element {
  return (
    <Heading slot="title" level={level} className="nz-dialog-title" data-slot="dialog-title">
      {children}
    </Heading>
  );
}

export function DialogDescription({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Text
      slot="description"
      elementType="p"
      className="nz-dialog-description"
      data-slot="dialog-description"
    >
      {children}
    </Text>
  );
}

export function DialogBody({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <div className="nz-dialog-body" data-slot="dialog-body">
      {children}
    </div>
  );
}

export function DialogFooter({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <div className="nz-dialog-footer" data-slot="dialog-footer">
      {children}
    </div>
  );
}

export function DialogClose({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Button slot="close" className="nz-dialog-close" data-slot="dialog-close">
      {children}
    </Button>
  );
}
