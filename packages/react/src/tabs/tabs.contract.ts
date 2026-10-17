// Public, engine-free types and the TabsEngine interface (ARCHITECTURE.md §9.2). NO directive.
// The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { ChangeDetails } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { EnginePart } from '../_internal/engine-part';

/**
 * Why the selected tab changed. React Aria reports no cause, so with it `details.reason` is always
 * `'unknown'` (§9.3 rule 2); the names are the causes an engine that reports one would use.
 */
export type TabsValueReason = 'tab-press' | 'keyboard';

/**
 * When a tab is selected (WAI-ARIA APG tabs).
 * - `automatic`: an arrow key moves focus and selects the tab it lands on (the APG default, for
 *   panels that show without a noticeable delay);
 * - `manual`: arrow keys only move focus; Enter or Space selects (for panels that are slow to show).
 */
export type TabsActivationMode = 'automatic' | 'manual';

export interface TabsRootState {
  disabled: boolean;
}

export interface TabsListState {
  disabled: boolean;
}

export interface TabsTabState {
  selected: boolean;
  disabled: boolean;
  focusVisible: boolean;
}

export interface TabsPanelState {
  /** The panel's tab is selected. False only on a `keepMounted` panel whose tab is not. */
  selected: boolean;
  focusVisible: boolean;
}

export interface TabsRootProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'defaultValue' | 'onChange' | 'id' | 'dir'
> {
  /** Controlled: the selected tab's `value`. */
  value?: string;
  /** The tab selected at first (uncontrolled). Defaults to the first tab that is not disabled. */
  defaultValue?: string;
  /** Called when the user selects a tab. `details.reason` is `'unknown'` with React Aria. */
  onValueChange?: (value: string, details: ChangeDetails<TabsValueReason>) => void;
  /** @default 'automatic' */
  activationMode?: TabsActivationMode;
  /** Disables every tab. The selected panel still shows. */
  disabled?: boolean;
  /**
   * The strip's reading direction (M26), rendered as the root's `dir` attribute: the layout and the
   * arrow keys follow it (in `rtl`, ArrowLeft moves to the next tab). Unset, nothing is rendered and
   * the arrows follow the direction of the `NizivoConfig` scope's `locale`. Nothing reads the DOM, so
   * a `dir` attribute set higher up does not turn the arrows: a strip whose direction differs from
   * its locale's sets it here. `'auto'` is not accepted for the same reason.
   */
  dir?: 'ltr' | 'rtl';
  /** Must render a `<div>`. */
  render?: RenderProp<TabsRootState>;
  /** One `Tabs.List` and its `Tabs.Panel`s. */
  children: ReactNode;
}

export interface TabsListProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'id'> {
  /** Must render a `<div>`. */
  render?: RenderProp<TabsListState>;
  /** `Tabs.Tab` elements. */
  children: ReactNode;
}

export interface TabsTabProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children' | 'id' | 'onClick'
> {
  /** Pairs the tab with the `Tabs.Panel` of the same `value`. */
  value: string;
  disabled?: boolean;
  /** A decorative glyph before the label (16 px). */
  icon?: ReactNode;
  /** A count after the label, such as the number of orders in a status. */
  count?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<TabsTabState>;
  children: ReactNode;
}

export interface TabsPanelProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'id'> {
  /** The `value` of the tab that shows this panel. */
  value: string;
  /**
   * Keeps the panel mounted, `hidden`, while its tab is not selected, so its state (a scroll
   * position, a form draft) survives switching. Without it only the selected panel is rendered, on
   * the server too. @default false
   */
  keepMounted?: boolean;
  /** Must render a `<div>`. */
  render?: RenderProp<TabsPanelState>;
  children?: ReactNode;
}

/**
 * What every Tabs adapter implements. Adapters write no class names: every class and `data-slot`
 * arrives in these props. Element types follow what React Aria 1.22.1 renders: every part is a `<div>`.
 */
export interface TabsEngine {
  Root(
    p: Omit<EnginePart<'div', TabsRootState>, 'defaultValue' | 'onChange' | 'id' | 'dir'> & {
      /** Rendered as the root's `dir`; the arrow keys follow it. Unset, the locale's direction. */
      dir?: 'ltr' | 'rtl' | undefined;
      value?: string | undefined;
      defaultValue?: string | undefined;
      onValueChange?: TabsRootProps['onValueChange'];
      activationMode: TabsActivationMode;
      disabled?: boolean | undefined;
    },
  ): ReactElement;
  List(p: EnginePart<'div', TabsListState, 'id'>): ReactElement;
  Tab(
    p: EnginePart<'div', TabsTabState, 'id' | 'onClick'> & {
      value: string;
      disabled?: boolean | undefined;
    },
  ): ReactElement;
  Panel(
    p: EnginePart<'div', TabsPanelState, 'id'> & {
      value: string;
      keepMounted: boolean;
    },
  ): ReactElement;
}
