'use client';
// Seam baseline: Menu written on React Aria directly (see select.tsx): MenuTrigger, Button, Popover
// and Menu, with the same parts and classes. Checkbox and radio items use RAC's own model, a
// MenuSection with a selection mode. Not here (Nizivo-only): the vocabulary data-* mapping, `render`
// props, Tab out, focus return for a server-open popup, standalone checkbox items whose state
// survives reopening, the check and radio glyphs, shortcut hints.
import type { JSX, ReactNode } from 'react';
import {
  Button,
  Header,
  I18nProvider,
  Menu,
  MenuItem as EngineItem,
  MenuSection,
  MenuTrigger as TriggerScope,
  Popover,
  Separator,
  type MenuItemProps,
  type MenuTriggerProps,
} from 'react-aria-components';

export function MenuRoot({
  locale = 'en-US',
  children,
  ...props
}: MenuTriggerProps & { locale?: string }): JSX.Element {
  return (
    <I18nProvider locale={locale}>
      <TriggerScope {...props}>{children}</TriggerScope>
    </I18nProvider>
  );
}

export function MenuTrigger({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Button className="nz-menu-trigger" data-slot="menu-trigger">
      {children}
    </Button>
  );
}

export function MenuPopup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Popover placement="bottom start" offset={8} className="nz-menu-popup" data-slot="menu-popup">
      <Menu className="nz-menu-list" data-slot="menu-list">
        {children}
      </Menu>
    </Popover>
  );
}

export function MenuItem({ children, ...props }: MenuItemProps): JSX.Element {
  return (
    <EngineItem {...props} className="nz-menu-item" data-slot="menu-item">
      {children}
    </EngineItem>
  );
}

export function MenuCheckboxGroup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <MenuSection selectionMode="multiple" className="nz-menu-group" data-slot="menu-group">
      {children}
    </MenuSection>
  );
}

export function MenuRadioGroup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <MenuSection
      selectionMode="single"
      disallowEmptySelection
      className="nz-menu-radio-group"
      data-slot="menu-radio-group"
    >
      {children}
    </MenuSection>
  );
}

export function MenuGroup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <MenuSection className="nz-menu-group" data-slot="menu-group">
      {children}
    </MenuSection>
  );
}

export function MenuGroupLabel({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Header className="nz-menu-group-label" data-slot="menu-group-label">
      {children}
    </Header>
  );
}

export function MenuSeparator(): JSX.Element {
  return <Separator className="nz-menu-separator" data-slot="menu-separator" />;
}
