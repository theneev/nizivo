'use client';
// The ONLY Tooltip module that imports the engine (ARCHITECTURE.md §9.2). Behaviour only: no class names.
import { use } from 'react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipTriggerStateContext,
  useLocale,
} from 'react-aria-components';
import { useFocusable } from 'react-aria/useFocusable';
import { useObjectRef } from 'react-aria/useObjectRef';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type { TooltipEngine, TooltipPopupState } from '../../tooltip/tooltip.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { useOpenState } from './open-state.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';

export const Root: TooltipEngine['Root'] = ({
  open,
  defaultOpen,
  onOpenChange,
  delay,
  disabled,
  children,
}) => {
  const [isOpen, setOpen, key] = useOpenState(open, defaultOpen, onOpenChange);
  return (
    <EngineLocale>
      <TooltipTrigger
        key={key}
        delay={delay}
        isOpen={isOpen}
        onOpenChange={setOpen}
        {...defined({ isDisabled: disabled })}
      >
        {children}
      </TooltipTrigger>
    </EngineLocale>
  );
};

/**
 * The trigger is the consumer's own element (often a server `<Button>`), so it takes the engine's
 * hover/focus props through `useFocusable` instead of a React Aria `Button`.
 */
export const Trigger: TooltipEngine['Trigger'] = ({ render, ...dom }) => {
  const ref = useObjectRef<HTMLElement>();
  const { focusableProps } = useFocusable({}, ref);
  const s = { open: use(TooltipTriggerStateContext)?.isOpen ?? false };
  return render(mergeProps(engineDom(focusableProps), { ref }, dom, stateAttrs(s)), s);
};

/**
 * React Aria 1.22.1 closes a tooltip "instantly" (no exit animation) when another one opens during
 * the warm-up period, as Tab moves across tooltip triggers. Its exit state is then left "exiting"
 * with no element to animate, so the next ordinary close of that tooltip (a press on its trigger,
 * after the keyboard, with no pointer move that would reopen it first) mounts an unpositioned popup
 * in `data-exiting` that never leaves. Keying the engine's Tooltip on that instant close remounts it
 * with a fresh exit state; it renders nothing in either state, so nothing visible remounts.
 */
function instantlyClosed(
  state: { isOpen: boolean; shouldSkipAnimation?: boolean } | null,
): boolean {
  return state !== null && !state.isOpen && state.shouldSkipAnimation === true;
}

export const Popup: TooltipEngine['Popup'] = ({
  side,
  align,
  sideOffset,
  container,
  render,
  children,
  ...dom
}) => {
  const { direction } = useLocale();
  return (
    <Tooltip
      key={instantlyClosed(use(TooltipTriggerStateContext)) ? 'instant' : 'live'}
      placement={toPlacement(side, align)}
      offset={sideOffset}
      {...defined({ UNSTABLE_portalContainer: container ?? undefined })}
      render={(p, rp) => {
        const s: TooltipPopupState = {
          entering: rp.isEntering,
          exiting: rp.isExiting,
          side: resolveSide(rp.placement, side, direction),
        };
        const engine = { ...engineDom(p), style: popupStyle(p.style) };
        const attrs = stateAttrs({ open: rp.state.isOpen, ...s, align });
        return render(mergeProps(engine, dom, attrs), s);
      }}
    >
      {children}
    </Tooltip>
  );
};
