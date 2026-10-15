'use client';
// Seam baseline: Tabs written on React Aria directly (see select.tsx). Not here (Nizivo-only): the
// vocabulary data-* mapping, `render` props, hiding a kept-mounted inactive panel.
import type { JSX, ReactNode } from 'react';
import { I18nProvider, Tab, TabList, TabPanel, Tabs, type TabsProps } from 'react-aria-components';

export function TabsRoot({
  locale = 'en-US',
  children,
  ...props
}: TabsProps & { locale?: string }): JSX.Element {
  return (
    <I18nProvider locale={locale}>
      <Tabs {...props} className="nz-tabs" data-slot="tabs">
        {children}
      </Tabs>
    </I18nProvider>
  );
}

export function TabsList({
  children,
  ...props
}: {
  children?: ReactNode;
  'aria-label'?: string;
}): JSX.Element {
  return (
    <TabList {...props} className="nz-tabs-list" data-slot="tabs-list">
      {children}
    </TabList>
  );
}

export function TabsTab({ value, children }: { value: string; children?: ReactNode }): JSX.Element {
  return (
    <Tab id={value} className="nz-tabs-tab" data-slot="tabs-tab">
      <span className="nz-tabs-label">{children}</span>
    </Tab>
  );
}

export function TabsPanel({
  value,
  children,
}: {
  value: string;
  children?: ReactNode;
}): JSX.Element {
  return (
    <TabPanel id={value} className="nz-tabs-panel" data-slot="tabs-panel">
      {children}
    </TabPanel>
  );
}
