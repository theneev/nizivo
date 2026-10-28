'use client';
// The ONLY CommandMenu module that imports the engine (ARCHITECTURE.md §9.2, §17 G18; gap report A
// §5.3). Behaviour only: no class names. Inside the Dialog, React Aria's Autocomplete joins a
// SearchField to a Menu: the leaf filters the rows from the field's text (D-dt), so the Menu holds
// only the rows that show; the arrow keys move the active row while focus stays in the field
// (virtual focus, aria-activedescendant), Enter chooses it, and Escape clears the field first and
// closes the dialog once it is empty.
import {
  Autocomplete,
  Header,
  Input as EngineInput,
  Menu,
  MenuItem,
  MenuSection,
  SearchField,
} from 'react-aria-components';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  CommandMenuEngine,
  CommandMenuItemState,
} from '../../unstable/command-menu/command-menu.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';

export const Search: CommandMenuEngine['Search'] = ({ query, onQueryChange, children }) => (
  <EngineLocale>
    {/* no filter: the leaf renders only the rows that match */}
    <Autocomplete inputValue={query} onInputChange={onQueryChange}>
      {children}
    </Autocomplete>
  </EngineLocale>
);

export const Input: CommandMenuEngine['Input'] = ({ label, field, render, ...dom }) => (
  // opened, the dialog focuses the field: the reader asked for the menu to type in it (APG
  // combobox in a dialog), so focus starts where the typing goes
  // oxlint-disable-next-line jsx-a11y/no-autofocus
  <SearchField aria-label={label} autoFocus render={(p) => field(engineDom(p), {})}>
    <EngineInput render={(p) => render(mergeProps(engineDom(p), dom), {})} />
  </SearchField>
);

export const List: CommandMenuEngine['List'] = ({ empty, busy, render, children, ...dom }) => (
  <Menu
    renderEmptyState={() => empty}
    render={(p) => render(mergeProps(engineDom(p), dom, busy ? { 'aria-busy': true } : {}), {})}
  >
    {children}
  </Menu>
);

export const Group: CommandMenuEngine['Group'] = ({ render, children, ...dom }) => (
  <MenuSection render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</MenuSection>
);

export const GroupLabel: CommandMenuEngine['GroupLabel'] = ({ render, children, ...dom }) => (
  <Header render={(p) => render(mergeProps(engineDom(p), dom), {})}>{children}</Header>
);

export const Item: CommandMenuEngine['Item'] = ({
  textValue,
  href,
  disabled,
  onAction,
  render,
  children,
  ...dom
}) => (
  <MenuItem
    {...defined({ textValue, href, isDisabled: disabled })}
    onAction={onAction}
    render={(p, rp) => {
      const s: CommandMenuItemState = {
        highlighted: rp.isFocused,
        focusVisible: rp.isFocusVisible,
        disabled: rp.isDisabled,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {children}
  </MenuItem>
);
