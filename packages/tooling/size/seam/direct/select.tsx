'use client';
// Seam baseline: Select written on React Aria directly, as a consumer styling RAC with Nizivo's CSS
// would write it. Same RAC parts as the adapter, the same part list as @nizivo/react/select, the same
// classes and data-slot hooks, the locale provider and native form validation. Not here (Nizivo-only,
// attributed in SIZES.md): the vocabulary data-* mapping, `render` props, Tab out, focus return for
// a server-open popup, the chevron and check glyphs, and the size/invalid scope.
import type { JSX, ReactNode } from 'react';
import {
  Button,
  Header,
  I18nProvider,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Select,
  SelectValue as EngineValue,
  Separator,
  type SelectProps,
} from 'react-aria-components';

export function SelectRoot({
  locale = 'en-US',
  size = 'md',
  className,
  children,
  ...props
}: SelectProps & { locale?: string; size?: 'sm' | 'md' | 'lg'; className?: string }): JSX.Element {
  return (
    <I18nProvider locale={locale}>
      <Select
        {...props}
        validationBehavior="native"
        className={className === undefined ? 'nz-select' : `nz-select ${className}`}
        data-slot="select"
        data-size={size}
      >
        {children}
      </Select>
    </I18nProvider>
  );
}

export function SelectValue(): JSX.Element {
  return <EngineValue className="nz-select-value" data-slot="select-value" />;
}

export function SelectTrigger({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Button className="nz-select-trigger nz-hit-target" data-slot="select-trigger">
      {children ?? <SelectValue />}
      <span className="nz-select-chevron" data-slot="select-chevron" aria-hidden="true" />
    </Button>
  );
}

export function SelectPopup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Popover
      placement="bottom start"
      offset={8}
      className="nz-select-popup"
      data-slot="select-popup"
    >
      <ListBox className="nz-select-list" data-slot="select-list">
        {children}
      </ListBox>
    </Popover>
  );
}

export function SelectItem({
  value,
  disabled,
  textValue,
  children,
}: {
  value: string;
  disabled?: boolean;
  textValue?: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <ListBoxItem
      id={value}
      {...(textValue === undefined ? {} : { textValue })}
      {...(disabled === undefined ? {} : { isDisabled: disabled })}
      className="nz-select-item"
      data-slot="select-item"
    >
      {children}
    </ListBoxItem>
  );
}

export function SelectGroup({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <ListBoxSection className="nz-select-group" data-slot="select-group">
      {children}
    </ListBoxSection>
  );
}

export function SelectGroupLabel({ children }: { children?: ReactNode }): JSX.Element {
  return (
    <Header className="nz-select-group-label" data-slot="select-group-label">
      {children}
    </Header>
  );
}

export function SelectSeparator(): JSX.Element {
  return <Separator className="nz-select-separator" data-slot="select-separator" />;
}
