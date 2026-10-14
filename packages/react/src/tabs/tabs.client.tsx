'use client';
// PUBLIC Tabs parts (ARCHITECTURE.md §9.2, §9.5; figma/13 §4.4): WAI-ARIA tabs that switch in-page
// views. They own the CSS contract; the engine owns behaviour. Tabs and SegmentedControl differ by
// meaning, not looks: a range is a SegmentedControl (a radio group), a view that is a URL is TabNav.
import type { JSX } from 'react';
import { toRenderFn } from '../contracts/render';
import { cx } from '../_internal/cx';
import * as Engine from './engine';
import type {
  TabsListProps,
  TabsListState,
  TabsPanelProps,
  TabsPanelState,
  TabsRootProps,
  TabsRootState,
  TabsTabProps,
  TabsTabState,
} from './tabs.contract';

export function TabsRoot({
  activationMode = 'automatic',
  className,
  render,
  ...rest
}: TabsRootProps): JSX.Element {
  return (
    <Engine.Root
      {...rest}
      activationMode={activationMode}
      className={cx('nz-tabs', className)}
      data-slot="tabs"
      render={toRenderFn<TabsRootState>(render, 'div')}
    />
  );
}

export function TabsList({ className, render, ...rest }: TabsListProps): JSX.Element {
  return (
    <Engine.List
      {...rest}
      className={cx('nz-tabs-list', className)}
      data-slot="tabs-list"
      render={toRenderFn<TabsListState>(render, 'div')}
    />
  );
}

export function TabsTab({
  icon,
  count,
  className,
  render,
  children,
  ...rest
}: TabsTabProps): JSX.Element {
  return (
    <Engine.Tab
      {...rest}
      className={cx('nz-tabs-tab', className)}
      data-slot="tabs-tab"
      // the list scrolls and clips, so the focus outline is drawn inside the tab (nz.base)
      data-focus-inset=""
      render={toRenderFn<TabsTabState>(render, 'div')}
    >
      {icon != null && (
        <span className="nz-tabs-icon" data-slot="tabs-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="nz-tabs-label" data-slot="tabs-label">
        <span className="nz-tabs-text">{children}</span>
        {/* the selected weight's width, reserved so a selection never shifts its neighbours */}
        <span className="nz-tabs-sizer" aria-hidden="true">
          {children}
        </span>
      </span>
      {count != null && (
        <span className="nz-tabs-count" data-slot="tabs-count">
          {count}
        </span>
      )}
    </Engine.Tab>
  );
}

export function TabsPanel({
  keepMounted = false,
  className,
  render,
  ...rest
}: TabsPanelProps): JSX.Element {
  return (
    <Engine.Panel
      {...rest}
      keepMounted={keepMounted}
      className={cx('nz-tabs-panel', className)}
      data-slot="tabs-panel"
      render={toRenderFn<TabsPanelState>(render, 'div')}
    />
  );
}
