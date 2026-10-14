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
import { details } from '../../contracts/details';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type { TooltipEngine, TooltipPopupState } from '../../tooltip/tooltip.contract';
import { defined, engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';

export const Root: TooltipEngine['Root'] = ({
  open,
  defaultOpen,
  onOpenChange,
  delay,
  disabled,
  children,
}) => (
  <EngineLocale>
    <TooltipTrigger
      delay={delay}
      {...defined({ isOpen: open, defaultOpen, isDisabled: disabled })}
      // React Aria reports no cause.
      onOpenChange={(isOpen) => onOpenChange?.(isOpen, details('unknown'))}
    >
      {children}
    </TooltipTrigger>
  </EngineLocale>
);

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
