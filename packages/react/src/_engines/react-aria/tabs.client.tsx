'use client';
// The ONLY Tabs module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class names.
// React Aria gives the APG tabs keyboard (roving tabindex, arrows flipped under an RTL locale,
// Home/End, automatic or manual activation), the tab ↔ panel ids and the selected panel on the server.
import { createContext, use, type JSX, type ReactNode } from 'react';
import {
  Tab as EngineTab,
  I18nProvider,
  TabList,
  TabPanel,
  Tabs,
  useLocale,
} from 'react-aria-components';
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type {
  TabsEngine,
  TabsListState,
  TabsPanelState,
  TabsRootState,
  TabsTabState,
} from '../../tabs/tabs.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';

/**
 * The nearest Tabs root's `dir`, for its list. A root without `dir` inherits it, so a strip nested in
 * the panel of a `dir` root keys the way CSS lays it out (the attribute is inherited). Unset at every
 * level: the direction of the locale (EngineLocale).
 */
const Dir = createContext<'ltr' | 'rtl' | undefined>(undefined);

/**
 * The arrows' direction (M26). React Aria has one direction input, the locale `I18nProvider` is
 * given, and only the tab list reads it (`useTabList` and `useSelectableCollection`, for the
 * arrows). So the list alone gets a locale whose direction is `dir`: the scope's locale when it
 * already has that direction (every render without `dir` is unchanged), else `ar` or `en`. Nothing
 * in the list formats, collates or speaks a string (the tabs delegate has no type-ahead), and each
 * tab's content gets the scope's locale back (`Tab`), so that locale only carries the direction to
 * the list's own hooks. A script subtag (`en-Arab-US`) would keep the language, but
 * WebKit 27.2 derives `Intl.Locale` text direction from the language only and reads it as `ltr`.
 * The provider is always rendered, so changing `dir` never remounts the list and drops focus.
 */
function Directed({ children }: { children: ReactNode }): JSX.Element {
  const dir = use(Dir);
  const { locale, direction } = useLocale();
  const carrier = dir === undefined || dir === direction ? locale : dir === 'rtl' ? 'ar' : 'en';
  return <I18nProvider locale={carrier}>{children}</I18nProvider>;
}

export const Root: TabsEngine['Root'] = ({
  value,
  defaultValue,
  onValueChange,
  activationMode,
  disabled,
  render,
  children,
  ...dom
}) => {
  const inherited = use(Dir);
  return (
    <EngineLocale>
      <Dir value={dom.dir ?? inherited}>
        <Tabs
          {...defined({
            selectedKey: value,
            defaultSelectedKey: defaultValue,
            isDisabled: disabled,
          })}
          keyboardActivation={activationMode}
          // React Aria reports no cause.
          onSelectionChange={(key) => onValueChange?.(String(key), details('unknown'))}
          render={(p) => {
            const s: TabsRootState = { disabled: disabled === true };
            return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
          }}
        >
          {children}
        </Tabs>
      </Dir>
    </EngineLocale>
  );
};

export const List: TabsEngine['List'] = ({
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => (
  <Directed>
    <TabList
      // the engine labels the tablist itself, so the names go through it
      {...defined({
        'aria-label': label,
        'aria-labelledby': labelledBy,
        'aria-describedby': describedBy,
      })}
      render={(p, rp) => {
        const s: TabsListState = { disabled: rp.state.isDisabled };
        return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
      }}
    >
      {children}
    </TabList>
  </Directed>
);

export const Tab: TabsEngine['Tab'] = ({ value, disabled, render, children, ...dom }) => (
  <EngineTab
    id={value}
    {...defined({ isDisabled: disabled })}
    render={(p, rp) => {
      const s: TabsTabState = {
        selected: rp.isSelected,
        disabled: rp.isDisabled,
        focusVisible: rp.isFocusVisible,
      };
      return render(mergeProps(engineDom(p), dom, stateAttrs(s)), s);
    }}
  >
    {/* the scope's locale again, not the list's direction carrier (Directed); always rendered, so
        a change of `dir` never remounts a label */}
    <EngineLocale>{children}</EngineLocale>
  </EngineTab>
);

export const Panel: TabsEngine['Panel'] = ({ value, keepMounted, render, children, ...dom }) => (
  <TabPanel
    id={value}
    shouldForceMount={keepMounted}
    render={(p, rp) => {
      const s: TabsPanelState = { selected: !rp.isInert, focusVisible: rp.isFocusVisible };
      // A kept-mounted panel of an unselected tab is inert in React Aria but still painted: hide it.
      const hidden = rp.isInert ? { hidden: true } : undefined;
      return render(
        mergeProps(engineDom(p), dom, hidden, stateAttrs({ focusVisible: s.focusVisible })),
        s,
      );
    }}
  >
    {children}
  </TabPanel>
);
