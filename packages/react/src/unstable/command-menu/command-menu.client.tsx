'use client';
// CommandMenu (ARCHITECTURE.md §17 G18; gap report A §5; Figma's Command Menu 755:889). UNSTABLE:
// async sources, a per-group cap, virtualisation and the result count announcement are still to
// come; the search loads on the first open (M72). The Dialog (its scrim, focus trap, Escape, return focus) holds React
// Aria's Autocomplete: a search field over a menu of rows, filtered as the reader types, the arrow
// keys moving the active row while focus stays in the field. `mod+k` (⌘K or Ctrl+K) opens and
// closes it through `@nizivo/react/hotkeys`, also from inside a text field; `CommandMenu.Trigger`
// opens it from the pointer and touch. Choosing a row runs its `onAction` or follows its `href`,
// then closes the dialog. The server renders only the Trigger: a closed dialog emits no popup HTML.
import {
  createContext,
  lazy,
  Suspense,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { useLabels } from '../../config/config.client';
import { cx } from '../../_internal/cx';
import { SearchGlyph } from '../../_internal/glyphs';
import { ariaKeyShortcuts } from '../../_internal/keys';
import { toRenderFn } from '../../contracts/render';
import { DialogPopup, DialogRoot, DialogTrigger } from '../../dialog/dialog.client';
import { useHotkey } from '../../hotkeys/hotkeys.client';
import { Kbd } from '../../kbd/index';
import type {
  CommandMenuFooterProps,
  CommandMenuGroupProps,
  CommandMenuInputProps,
  CommandMenuItemProps,
  CommandMenuLabels,
  CommandMenuListProps,
  CommandMenuPopupProps,
  CommandMenuRootProps,
  CommandMenuTriggerProps,
} from './command-menu.contract';
/**
 * React Aria's Autocomplete, SearchField and Menu load on the first open, in one chunk of their own
 * (M72): the page ships the trigger and the Dialog, not the search. Every part comes from the same
 * import, so the chunk loads once.
 */
const engine = (): Promise<typeof import('./engine')> => import('./engine');
const Engine = {
  Search: lazy(() => engine().then((e) => ({ default: e.Search }))),
  Input: lazy(() => engine().then((e) => ({ default: e.Input }))),
  List: lazy(() => engine().then((e) => ({ default: e.List }))),
  Group: lazy(() => engine().then((e) => ({ default: e.Group }))),
  GroupLabel: lazy(() => engine().then((e) => ({ default: e.GroupLabel }))),
  Item: lazy(() => engine().then((e) => ({ default: e.Item }))),
};

interface ScopeValue {
  labels: CommandMenuLabels;
  hotkey: string | null;
  close: () => void;
}

const Scope = createContext<ScopeValue>({
  labels: {
    label: 'Command menu',
    placeholder: 'Search',
    empty: 'No results',
    navigate: 'Navigate',
    open: 'Open',
  },
  hotkey: 'mod+k',
  close: () => undefined,
});

const renderDiv = toRenderFn<unknown>(undefined, 'div');
const renderInput = toRenderFn<unknown>(undefined, 'input');
const renderSection = toRenderFn<unknown>(undefined, 'section');
const renderHeader = toRenderFn<unknown>(undefined, 'header');

/** Registers the menu's shortcut while it is mounted: a component, so `hotkey={null}` skips it. */
function Shortcut({
  keys,
  description,
  toggle,
}: {
  keys: string;
  description: string;
  toggle: () => void;
}): null {
  const id = useId();
  useHotkey({
    id: `command-menu${id}`,
    keys,
    description,
    allowInInputs: true,
    run: (event) => {
      event.preventDefault();
      toggle();
    },
  });
  return null;
}

export function CommandMenuRoot({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  hotkey = 'mod+k',
  labels: labelsProp,
  children,
}: CommandMenuRootProps): JSX.Element {
  const labels = useLabels('commandMenu', labelsProp);
  const L: CommandMenuLabels = {
    label: labels?.label ?? 'Command menu',
    placeholder: labels?.placeholder ?? 'Search',
    empty: labels?.empty ?? 'No results',
    navigate: labels?.navigate ?? 'Navigate',
    open: labels?.open ?? 'Open',
  };
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const open = controlled ?? uncontrolled;
  const setOpen = useCallback(
    (next: boolean): void => {
      if (controlled === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange],
  );
  const { label, placeholder, empty, navigate, open: openLabel } = L;
  const scope = useMemo(
    () => ({
      labels: { label, placeholder, empty, navigate, open: openLabel },
      hotkey,
      close: () => setOpen(false),
    }),
    [label, placeholder, empty, navigate, openLabel, hotkey, setOpen],
  );
  return (
    <Scope value={scope}>
      {hotkey !== null && (
        <Shortcut keys={hotkey} description={L.label} toggle={() => setOpen(!open)} />
      )}
      <DialogRoot open={open} onOpenChange={setOpen}>
        {children}
      </DialogRoot>
    </Scope>
  );
}

export function CommandMenuTrigger({
  className,
  render,
  ...rest
}: CommandMenuTriggerProps): JSX.Element {
  const { hotkey } = use(Scope);
  const base = toRenderFn(render, 'button');
  return (
    <DialogTrigger
      {...rest}
      {...(hotkey !== null && { 'aria-keyshortcuts': ariaKeyShortcuts(hotkey) })}
      className={className}
      // the Dialog names its trigger dialog-trigger; this one is the menu's
      render={(props, state) =>
        base(
          {
            ...props,
            className: cx(
              'nz-command-menu-trigger',
              typeof props['className'] === 'string' ? props['className'] : undefined,
            ),
            'data-slot': 'command-menu-trigger',
          },
          state,
        )
      }
    />
  );
}

export function CommandMenuPopup({
  filter = 'contains',
  className,
  children,
}: CommandMenuPopupProps): JSX.Element {
  const { labels } = use(Scope);
  return (
    <DialogPopup aria-label={labels.label} className={cx('nz-command-menu-popup', className)}>
      {/* the search row's place while the chunk loads, so the dialog does not jump */}
      <Suspense fallback={<div className="nz-command-menu-pending" aria-hidden="true" />}>
        <Engine.Search filter={filter}>{children}</Engine.Search>
      </Suspense>
    </DialogPopup>
  );
}

/** The search row: the magnifier, the field and an "esc" hint, as Figma draws it. */
function renderField(props: Record<string, unknown>): JSX.Element {
  return renderDiv(
    {
      ...props,
      className: 'nz-command-menu-field',
      children: (
        <>
          <span className="nz-command-menu-search" aria-hidden="true">
            <SearchGlyph />
          </span>
          {/* the engine's field content, passed through as a prop */}
          {/* oxlint-disable-next-line typescript/no-unsafe-type-assertion */}
          {props['children'] as ReactNode}
          <Kbd aria-hidden="true">esc</Kbd>
        </>
      ),
    },
    {},
  );
}

export function CommandMenuInput({ placeholder, className }: CommandMenuInputProps): JSX.Element {
  const { labels } = use(Scope);
  return (
    <Engine.Input
      label={labels.label}
      placeholder={placeholder ?? labels.placeholder}
      className={cx('nz-command-menu-input', className)}
      data-slot="command-menu-input"
      field={renderField}
      render={renderInput}
    />
  );
}

export function CommandMenuList({ empty, className, children }: CommandMenuListProps): JSX.Element {
  const { labels } = use(Scope);
  return (
    <Engine.List
      empty={<p className="nz-command-menu-empty">{empty ?? labels.empty}</p>}
      className={cx('nz-command-menu-list', className)}
      data-slot="command-menu-list"
      render={renderDiv}
    >
      {children}
    </Engine.List>
  );
}

export function CommandMenuGroup({
  heading,
  className,
  children,
}: CommandMenuGroupProps): JSX.Element {
  return (
    <Engine.Group
      className={cx('nz-command-menu-group', className)}
      data-slot="command-menu-group"
      render={renderSection}
    >
      <Engine.GroupLabel
        className="nz-command-menu-group-label"
        data-slot="command-menu-group-label"
        render={renderHeader}
      >
        {heading}
      </Engine.GroupLabel>
      {children}
    </Engine.Group>
  );
}

export function CommandMenuItem({
  textValue,
  icon,
  kind,
  shortcut,
  href,
  onAction,
  disabled,
  className,
  children,
}: CommandMenuItemProps): JSX.Element {
  const { close } = use(Scope);
  return (
    <Engine.Item
      textValue={textValue ?? (typeof children === 'string' ? children : undefined)}
      href={href}
      disabled={disabled}
      onAction={() => {
        onAction?.();
        close();
      }}
      {...(shortcut !== undefined && { 'aria-keyshortcuts': ariaKeyShortcuts(shortcut) })}
      className={cx('nz-command-menu-item', className)}
      data-slot="command-menu-item"
      // the keyboard ring sits inside the row, as on the menu rows (§8.5)
      data-focus-inset=""
      render={renderDiv}
    >
      {icon != null && (
        <span className="nz-command-menu-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="nz-command-menu-label">{children}</span>
      {kind != null && <span className="nz-command-menu-kind">{kind}</span>}
      {shortcut !== undefined && <Kbd keys={shortcut} aria-hidden="true" />}
    </Engine.Item>
  );
}

/** The keys the menu takes, shown in its footer. Decorative: the roles say the same. */
export function CommandMenuFooter({ className }: CommandMenuFooterProps): JSX.Element {
  const { labels } = use(Scope);
  return (
    <div className={cx('nz-command-menu-footer', className)} aria-hidden="true">
      <span className="nz-command-menu-hint">
        <Kbd>↑↓</Kbd>
        {labels.navigate}
      </span>
      <span className="nz-command-menu-hint">
        <Kbd keys="enter" />
        {labels.open}
      </span>
    </div>
  );
}
