'use client';
// CommandMenu (ARCHITECTURE.md §17 G18; gap report A §5; Figma's Command Menu 755:889). UNSTABLE:
// virtualisation is still to come; the search loads on the first open (M72). The Dialog (its scrim,
// focus trap, Escape, return focus) holds React Aria's Autocomplete: a search field over a menu of
// rows, the arrow keys moving the active row while focus stays in the field. The leaf filters the
// rows itself (D-dt), so a group's `limit` and an async source (`filter="none"`, `loading`) leave
// in the engine's list only the rows that show, and a polite status says how many show once the
// typing stops. `mod+k` (⌘K or Ctrl+K) opens and
// closes it through `@nizivo/react/hotkeys`, also from inside a text field; `CommandMenu.Trigger`
// opens it from the pointer and touch. Choosing a row runs its `onAction` or follows its `href`,
// then closes the dialog. The server renders only the Trigger: a closed dialog emits no popup HTML.
import {
  Children,
  createContext,
  isValidElement,
  lazy,
  Suspense,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from 'react';
import { useLabels, useResolvedLocale } from '../../config/config.client';
import { cx } from '../../_internal/cx';
import { SearchGlyph, SpinnerGlyph } from '../../_internal/glyphs';
import { ariaKeyShortcuts } from '../../_internal/keys';
import { textMatcher } from '../../_internal/search';
import { formatLabel } from '../../i18n/format-label';
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
    loading: 'Searching…',
    results: 'Results: {count}',
  },
  hotkey: 'mod+k',
  close: () => undefined,
});

interface FilterValue {
  query: string;
  /** Whether a row with this text shows for the query (no text: only while the field is empty). */
  matches: (text: string | undefined) => boolean;
}

const FilterScope = createContext<FilterValue>({ query: '', matches: () => true });

/** The text a row is searched by. */
function itemText({
  textValue,
  children,
}: Pick<CommandMenuItemProps, 'children'> & { textValue?: string | undefined }):
  | string
  | undefined {
  return textValue ?? (typeof children === 'string' ? children : undefined);
}

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
    loading: labels?.loading ?? 'Searching…',
    results: labels?.results ?? 'Results: {count}',
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
  const { label, placeholder, empty, navigate, open: openLabel, loading, results } = L;
  const scope = useMemo(
    () => ({
      labels: { label, placeholder, empty, navigate, open: openLabel, loading, results },
      hotkey,
      close: () => setOpen(false),
    }),
    [label, placeholder, empty, navigate, openLabel, loading, results, hotkey, setOpen],
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
  query: controlledQuery,
  defaultQuery = '',
  onQueryChange,
  className,
  children,
}: CommandMenuPopupProps): JSX.Element {
  const { labels } = use(Scope);
  const locale = useResolvedLocale();
  const [ownQuery, setOwnQuery] = useState(defaultQuery);
  const query = controlledQuery ?? ownQuery;
  const setQuery = useCallback(
    (next: string): void => {
      if (controlledQuery === undefined) setOwnQuery(next);
      onQueryChange?.(next);
    },
    [controlledQuery, onQueryChange],
  );
  const matcher = useMemo(
    () => (filter === 'none' ? undefined : textMatcher(locale, filter)),
    [filter, locale],
  );
  const scope = useMemo<FilterValue>(
    () => ({
      query,
      matches: (text) =>
        matcher === undefined || query === '' || (text !== undefined && matcher(text, query)),
    }),
    [query, matcher],
  );
  return (
    <DialogPopup aria-label={labels.label} className={cx('nz-command-menu-popup', className)}>
      {/* the search row's place while the chunk loads, so the dialog does not jump */}
      <Suspense fallback={<div className="nz-command-menu-pending" aria-hidden="true" />}>
        <FilterScope value={scope}>
          <Engine.Search query={query} onQueryChange={setQuery}>
            {children}
          </Engine.Search>
        </FilterScope>
      </Suspense>
    </DialogPopup>
  );
}

/** How long the typing must stop before the count is spoken, so it is said once, not per key. */
const QUIET_MS = 500;

/**
 * The polite count of the rows that show, outside the menu (a live region may not sit in one). Said once
 * the typing stops or the results arrive, not when the menu opens with its first rows.
 */
function ResultCount({ loading }: { loading: boolean }): JSX.Element {
  const { labels } = use(Scope);
  const { query } = use(FilterScope);
  const locale = useResolvedLocale();
  const ref = useRef<HTMLSpanElement | null>(null);
  const opened = useRef(query);
  const waited = useRef(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (loading) {
      waited.current = true;
      return undefined;
    }
    if (query === opened.current && !waited.current) return undefined;
    const timer = setTimeout(() => {
      const popup = ref.current?.closest('[data-slot="dialog-popup"]');
      const count = popup?.querySelectorAll('[data-slot="command-menu-item"]').length ?? 0;
      setText(count === 0 ? labels.empty : formatLabel(labels.results, { count }, locale));
    }, QUIET_MS);
    return () => clearTimeout(timer);
  }, [query, loading, labels, locale]);
  // a span with aria-live, as Field's announcer: not an <output>, which a form's reset rewrites
  return (
    <span
      ref={ref}
      className="nz-command-menu-status nz-visually-hidden"
      aria-live="polite"
      aria-atomic="true"
    >
      {text}
    </span>
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

export function CommandMenuList({
  empty,
  loading = false,
  className,
  children,
}: CommandMenuListProps): JSX.Element {
  const { labels } = use(Scope);
  return (
    <>
      <Engine.List
        empty={
          loading ? (
            <p className="nz-command-menu-loading">
              <SpinnerGlyph />
              {labels.loading}
            </p>
          ) : (
            <p className="nz-command-menu-empty">{empty ?? labels.empty}</p>
          )
        }
        busy={loading}
        className={cx('nz-command-menu-list', className)}
        data-slot="command-menu-list"
        render={renderDiv}
      >
        {children}
      </Engine.List>
      <ResultCount loading={loading} />
    </>
  );
}

/**
 * A group's children to render: its own rows that match, the first `limit` of them, and anything
 * else as it is; `null` when none of its own rows match and it has nothing else.
 */
function groupRows(
  children: ReactNode,
  matches: FilterValue['matches'],
  limit: number | undefined,
): ReactNode[] | null {
  const out: ReactNode[] = [];
  let shown = 0;
  let other = false;
  for (const child of Children.toArray(children)) {
    if (!isValidElement<CommandMenuItemProps>(child) || child.type !== CommandMenuItem) {
      other = true;
      out.push(child);
    } else if (matches(itemText(child.props)) && (limit === undefined || shown < limit)) {
      shown += 1;
      out.push(child);
    }
  }
  return shown === 0 && !other ? null : out;
}

export function CommandMenuGroup({
  heading,
  limit,
  className,
  children,
}: CommandMenuGroupProps): JSX.Element | null {
  const { matches } = use(FilterScope);
  const rows = groupRows(children, matches, limit);
  // no row to show: no heading over nothing
  if (rows === null) return null;
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
      {rows}
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
}: CommandMenuItemProps): JSX.Element | null {
  const { close } = use(Scope);
  const { matches } = use(FilterScope);
  const text = itemText({ textValue, children });
  if (!matches(text)) return null;
  return (
    <Engine.Item
      textValue={text}
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
