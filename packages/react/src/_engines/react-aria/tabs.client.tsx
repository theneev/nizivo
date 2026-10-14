'use client';
// The ONLY Tabs module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class names.
// React Aria gives the APG tabs keyboard (roving tabindex, arrows flipped under an RTL locale,
// Home/End, automatic or manual activation), the tab ↔ panel ids and the selected panel on the server.
import { Tab as EngineTab, TabList, TabPanel, Tabs } from 'react-aria-components';
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

export const Root: TabsEngine['Root'] = ({
  value,
  defaultValue,
  onValueChange,
  activationMode,
  disabled,
  render,
  children,
  ...dom
}) => (
  <EngineLocale>
    <Tabs
      {...defined({ selectedKey: value, defaultSelectedKey: defaultValue, isDisabled: disabled })}
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
  </EngineLocale>
);

export const List: TabsEngine['List'] = ({
  'aria-label': label,
  'aria-labelledby': labelledBy,
  'aria-describedby': describedBy,
  render,
  children,
  ...dom
}) => (
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
    {children}
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
