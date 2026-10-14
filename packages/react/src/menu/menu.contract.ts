// Public, engine-free types and the MenuEngine interface (ARCHITECTURE.md §9.2, §9.3, §12.3 Menu row).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type {
  ComponentPropsWithRef,
  CSSProperties,
  HTMLAttributeAnchorTarget,
  HTMLAttributeReferrerPolicy,
  ReactElement,
  ReactNode,
} from 'react';
import type { ChangeDetails, OpenReason } from '../contracts/details';
import type { RenderProp } from '../contracts/render';
import type { Align, Side } from '../contracts/state';
import type { EnginePart } from '../_internal/engine-part';

export type { OpenReason };

/** Logical side; the resolved physical side is `data-side` on the popup. */
export type MenuSide = 'top' | 'bottom' | 'start' | 'end';

/** Figma Menu Item `State=Critical`. `critical` items sit last, after a separator. */
export type MenuItemTone = 'neutral' | 'critical';

/** Why a checkbox item changed: the item was activated (pointer, touch or keyboard). */
export type MenuCheckedReason = 'item-press';

/**
 * Strings the engine renders (§9.3 rule 7). Engine-owned with React Aria (not overridable): `dismiss`,
 * the visually hidden "Dismiss" buttons at both ends of the popup.
 */
export interface MenuLabels {
  dismiss: string;
}

export interface MenuRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onOpenChange?: (open: boolean, details: ChangeDetails<OpenReason>) => void;
  children: ReactNode;
}

export interface MenuTriggerState {
  open: boolean;
  pressed: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface MenuPopupState {
  entering: boolean;
  exiting: boolean;
  side: Side;
}

export interface MenuItemState {
  highlighted: boolean;
  disabled: boolean;
  focusVisible: boolean;
  /** Checkbox and radio items only; always `false` on a plain item. */
  checked: boolean;
}

export interface MenuTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /**
   * Must render a `<button>`, for example an `IconButton` for a row's "…" menu:
   * `render={<IconButton label="More actions" icon={<Ellipsis />} />}`.
   */
  render?: RenderProp<MenuTriggerState>;
  children?: ReactNode;
}

export interface MenuPopupProps {
  /** @default 'bottom' */
  side?: MenuSide;
  /** @default 'start' */
  align?: Align;
  /** Distance from the trigger in px. @default 8 */
  sideOffset?: number;
  /** Portal container. Defaults to the parent overlay, else `document.body` (§12.1 L2). */
  container?: Element | null;
  /** Names the menu when the trigger's text does not (the trigger names it by default). */
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/** What every item kind shares. */
interface MenuItemBaseProps extends Omit<ComponentPropsWithRef<'div'>, 'children' | 'id'> {
  /** Typeahead text; defaults to `children` when it is a string. */
  textValue?: string;
  disabled?: boolean;
  /** Called when the item is activated by pointer, touch or keyboard (Enter or Space). */
  onAction?: () => void;
  /** Whether activating the item closes the menu. @default true (false for a checkbox item) */
  closeOnSelect?: boolean;
  /** A leading glyph (16 px), for example `<Copy />` from `@nizivo/icons`. Decorative. */
  icon?: ReactNode;
  /**
   * A keyboard shortcut drawn at the end with `Kbd` (`"mod+d"`), and announced through
   * `aria-keyshortcuts`. A visual hint: the app implements the shortcut itself.
   */
  shortcut?: string;
  /** @default 'neutral' */
  tone?: MenuItemTone;
  children: ReactNode;
}

type LinkAttribute =
  | 'href'
  | 'target'
  | 'rel'
  | 'download'
  | 'hrefLang'
  | 'ping'
  | 'referrerPolicy';

export interface MenuItemProps extends MenuItemBaseProps {
  /** Makes the item a link item: it renders an `<a>` and Enter follows it (§9.3 rule 3). */
  href?: string;
  target?: HTMLAttributeAnchorTarget;
  rel?: string;
  download?: boolean | string;
  hrefLang?: string;
  ping?: string;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
  /**
   * Renders a `<div>`, or an `<a>` with `href`. A router link works through `render`:
   * `render={<Link href="/orders" />}` (the element's `href` makes it a link item, §9.3 rule 3).
   */
  render?: RenderProp<MenuItemState>;
}

export interface MenuCheckboxItemProps extends MenuItemBaseProps {
  checked?: boolean;
  /**
   * The popup unmounts on close, so the Root keeps an uncontrolled item's state, keyed by the item's
   * text (`textValue`, or string `children`): two checkbox items with the same text in one menu share
   * it, and an item with neither starts from `defaultChecked` on every open. Use `checked` for state
   * the app owns.
   */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean, details: ChangeDetails<MenuCheckedReason>) => void;
  /** Replaces the check glyph shown while checked. */
  indicator?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<MenuItemState>;
}

export interface MenuRadioGroupProps extends Omit<
  ComponentPropsWithRef<'section'>,
  'id' | 'defaultValue'
> {
  value?: string | null;
  /**
   * The popup unmounts on close, so the Root keeps an uncontrolled group's choice, keyed by its
   * items' `value`s (radio items placed directly, or through fragments and wrapper elements).
   */
  defaultValue?: string | null;
  /** `details.reason` is `'unknown'` with React Aria, which reports no cause. */
  onValueChange?: (value: string, details: ChangeDetails<MenuCheckedReason>) => void;
  /** Must render a `<section>`. */
  render?: RenderProp<Record<string, never>>;
}

export interface MenuRadioItemProps extends MenuItemBaseProps {
  /** The value the group reports when this item is chosen. */
  value: string;
  /** Replaces the check glyph shown while chosen. */
  indicator?: ReactNode;
  /** Must render a `<div>`. */
  render?: RenderProp<MenuItemState>;
}

type NoState = Record<string, never>;

export interface MenuGroupProps extends Omit<ComponentPropsWithRef<'section'>, 'id'> {
  /** Must render a `<section>`. */
  render?: RenderProp<NoState>;
}
export interface MenuGroupLabelProps extends Omit<ComponentPropsWithRef<'header'>, 'id'> {
  /** Must render a `<header>`. */
  render?: RenderProp<NoState>;
}
export interface MenuSeparatorProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  /** Must render a `<div>`. */
  render?: RenderProp<NoState>;
}

/** Behaviour every item kind hands the engine. */
interface EngineItem {
  textValue?: string | undefined;
  disabled?: boolean | undefined;
  onAction?: (() => void) | undefined;
  closeOnSelect?: boolean | undefined;
}

/**
 * What every Menu adapter implements. Adapters write no class names: every class and `data-slot`
 * arrives in these props. Element types follow React Aria 1.22.1: the popup is a `<div>` holding the
 * `role="menu"` list, items are `<div>` (`<a>` with `href`), groups `<section>` with a `<header>`.
 * Checkbox and radio items carry `role="menuitemcheckbox"` / `"menuitemradio"` and `aria-checked`.
 */
export interface MenuEngine {
  Root(p: MenuRootProps): ReactElement;
  Trigger(p: EnginePart<'button', MenuTriggerState>): ReactElement;
  Popup(
    p: EnginePart<'div', MenuPopupState> & {
      side: MenuSide;
      align: Align;
      sideOffset: number;
      container?: Element | null | undefined;
      /** Class, `data-slot` and `aria-label` for the internal `role="menu"` element. */
      list: Record<string, unknown>;
    },
  ): ReactElement;
  Item(
    p: EnginePart<'div', MenuItemState, 'id' | LinkAttribute> &
      EngineItem & { [K in LinkAttribute]?: MenuItemProps[K] | undefined },
  ): ReactElement;
  CheckboxItem(
    p: EnginePart<'div', MenuItemState, 'id'> &
      EngineItem & {
        checked?: boolean | undefined;
        defaultChecked?: boolean | undefined;
        onCheckedChange?:
          | ((checked: boolean, details: ChangeDetails<MenuCheckedReason>) => void)
          | undefined;
      },
  ): ReactElement;
  RadioGroup(
    p: EnginePart<'section', NoState, 'id' | 'defaultValue'> & {
      value?: string | null | undefined;
      defaultValue?: string | null | undefined;
      onValueChange?:
        | ((value: string, details: ChangeDetails<MenuCheckedReason>) => void)
        | undefined;
    },
  ): ReactElement;
  RadioItem(
    p: EnginePart<'div', MenuItemState, 'id'> & EngineItem & { value: string },
  ): ReactElement;
  Group(p: EnginePart<'section', NoState, 'id'>): ReactElement;
  GroupLabel(p: EnginePart<'header', NoState, 'id'>): ReactElement;
  Separator(p: EnginePart<'div', NoState>): ReactElement;
}
