// Public, engine-free types and the CommandMenuEngine interface (ARCHITECTURE.md §9.2, §17 G18).
// NO directive. The .d.ts import-graph walk must never reach an engine from here.
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import type { RenderProp } from '../../contracts/render';
import type { DialogTriggerState } from '../../dialog/dialog.contract';
import type { EnginePart, RenderFn } from '../../_internal/engine-part';

/** How the typed text matches an item's text: anywhere in it, or at its start; case and accents ignored. */
export type CommandMenuFilter = 'contains' | 'startsWith';

/** CommandMenu's own strings (§16.4): serialisable, English defaults. */
export interface CommandMenuLabels {
  /** The dialog's and the search field's name. @default 'Command menu' */
  label: string;
  /** The search field's placeholder. @default 'Search' */
  placeholder: string;
  /** Shown when nothing matches. @default 'No results' */
  empty: string;
  /** The footer's arrow keys hint. @default 'Navigate' */
  navigate: string;
  /** The footer's Enter hint. @default 'Open' */
  open: string;
}

export interface CommandMenuRootProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The shortcut that opens and closes it, as Kbd writes it; `null` for none. @default 'mod+k' */
  hotkey?: string | null;
  labels?: Partial<CommandMenuLabels>;
  children: ReactNode;
}

export interface CommandMenuTriggerProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
  /** Must render a `<button>`, for example a field-looking Button in a top bar. */
  render?: RenderProp<DialogTriggerState>;
  children?: ReactNode;
}

export interface CommandMenuPopupProps {
  /** @default 'contains' */
  filter?: CommandMenuFilter;
  className?: string;
  /** `CommandMenu.Input`, `CommandMenu.List` and `CommandMenu.Footer`. */
  children: ReactNode;
}

export interface CommandMenuInputProps {
  placeholder?: string;
  className?: string;
}

export interface CommandMenuListProps {
  /** Replaces `labels.empty` when nothing matches. */
  empty?: ReactNode;
  className?: string;
  children: ReactNode;
}

export interface CommandMenuGroupProps {
  /** The group's heading, in Select's group label look. */
  heading: ReactNode;
  className?: string;
  children: ReactNode;
}

export interface CommandMenuItemState {
  /** The active row: the arrow keys or the pointer are on it. */
  highlighted: boolean;
  focusVisible: boolean;
  disabled: boolean;
}

export interface CommandMenuItemProps {
  /** The text the search matches; defaults to `children` when it is a string. */
  textValue?: string;
  /** A 20 px mark before the text. Decorative. */
  icon?: ReactNode;
  /** What it is ("Product", "Order", "Action"), at the row's end. */
  kind?: ReactNode;
  /** Its own shortcut, drawn as a Kbd (`"mod+n"`) and announced through `aria-keyshortcuts`. */
  shortcut?: string;
  /** A link: choosing the row follows it. */
  href?: string;
  /** Runs when the row is chosen (client components only). */
  onAction?: () => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}

export interface CommandMenuFooterProps {
  className?: string;
}

type NoState = Record<string, never>;

/**
 * What every CommandMenu adapter implements: the searchable list inside the Dialog. Adapters write
 * no class names; the leaf's render functions add them.
 */
export interface CommandMenuEngine {
  Search(p: { filter: CommandMenuFilter; children: ReactNode }): ReactElement;
  Input(
    p: EnginePart<'input', NoState> & {
      label: string;
      field: RenderFn<NoState>;
    },
  ): ReactElement;
  List(p: EnginePart<'div', NoState> & { empty: ReactNode; children: ReactNode }): ReactElement;
  Group(p: EnginePart<'section', NoState> & { children: ReactNode }): ReactElement;
  GroupLabel(p: EnginePart<'header', NoState>): ReactElement;
  Item(
    p: EnginePart<'div', CommandMenuItemState> & {
      textValue?: string | undefined;
      href?: string | undefined;
      disabled?: boolean | undefined;
      onAction: () => void;
    },
  ): ReactElement;
}
