'use client';
// The second Tooltip adapter (ARCHITECTURE.md §9.4, D-cc): React Aria's hooks with Nizivo's own DOM,
// where tooltip.client.tsx renders React Aria's Tooltip components. The same TooltipEngine, the same
// react-aria family and OverlayEngine, the same conformance suite (NZ_ADAPTER=hooks runs it; test/
// adapters.ts). Not engine.ts's target, so not shipped, until it has passed for two weeks (§9.4).
// Behaviour only: no class names.
//
// What React Aria's Tooltip component did around these hooks is done here: the trigger and popup
// share the trigger state through a context, a portal places the popup (in the parent overlay's
// container, §12.1 L2), and the popup holds `data-entering` and `data-exiting` for tooltip.css.
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type JSX,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'react-aria/I18nProvider';
import { useFocusable } from 'react-aria/useFocusable';
import { useUNSAFE_PortalContext } from 'react-aria/PortalProvider';
import { useIsSSR } from 'react-aria/SSRProvider';
import { useOverlayPosition } from 'react-aria/useOverlayPosition';
import { useTooltip, useTooltipTrigger } from 'react-aria/useTooltipTrigger';
import {
  useTooltipTriggerState,
  type TooltipTriggerState,
} from 'react-stately/useTooltipTriggerState';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type { TooltipEngine, TooltipPopupState } from '../../tooltip/tooltip.contract';
import { engineDom } from './dom';
import { EngineLocale } from './locale.client';
import { useOpenState } from './open-state.client';
import { popupStyle, resolveSide, toPlacement } from './overlay.client';

interface TooltipScope {
  state: TooltipTriggerState;
  triggerRef: RefObject<HTMLElement | null>;
  triggerProps: ReturnType<typeof useTooltipTrigger>['triggerProps'];
  tooltipProps: ReturnType<typeof useTooltipTrigger>['tooltipProps'];
}

const Scope = createContext<TooltipScope | null>(null);

function TriggerScope({
  isOpen,
  setOpen,
  delay,
  disabled,
  children,
}: {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  delay: number;
  disabled: boolean | undefined;
  children: ReactNode;
}): JSX.Element {
  const props = { isOpen, onOpenChange: setOpen, delay, isDisabled: disabled ?? false };
  const state = useTooltipTriggerState(props);
  const triggerRef = useRef<HTMLElement | null>(null);
  const { triggerProps, tooltipProps } = useTooltipTrigger(props, state, triggerRef);
  const scope = useMemo(
    () => ({ state, triggerRef, triggerProps, tooltipProps }),
    [state, triggerProps, tooltipProps],
  );
  return <Scope value={scope}>{children}</Scope>;
}

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
      <TriggerScope key={key} isOpen={isOpen} setOpen={setOpen} delay={delay} disabled={disabled}>
        {children}
      </TriggerScope>
    </EngineLocale>
  );
};

/**
 * The consumer's own element (often a server `<Button>`) takes the trigger's hover and focus props,
 * and `useFocusable`'s, as the default adapter's trigger does (its `tabindex="0"` keeps any element
 * in the Tab order, which WebKit on macOS does not give a button by default).
 */
export const Trigger: TooltipEngine['Trigger'] = ({ render, ...dom }) => {
  const scope = use(Scope);
  const fallback = useRef<HTMLElement | null>(null);
  const ref = scope?.triggerRef ?? fallback;
  const { focusableProps } = useFocusable({}, ref);
  const s = { open: scope?.state.isOpen ?? false };
  // mergeProps only composes the refs into one callback ref; nothing reads them in render.
  // eslint-disable-next-line react-hooks/refs -- one comment for oxlint and the react-hooks lane
  const engine = mergeProps(engineDom(focusableProps), engineDom(scope?.triggerProps ?? {}), {
    ref,
  });
  return render(mergeProps(engine, dom, stateAttrs(s)), s);
};

/**
 * `data-entering` from the first render until the popup is placed and has been drawn once in it, so
 * tooltip.css's transition runs from it; never when React Aria opens it instantly (a warm tooltip).
 */
function useEntering(ready: boolean, instant: boolean): boolean {
  const [entering, setEntering] = useState(true);
  useEffect(() => {
    if (!ready || !entering) return undefined;
    const frame = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(frame);
  }, [ready, entering]);
  return entering && !instant;
}

/**
 * Keeps a closed popup mounted in `data-exiting` until its exit transition ends (React Aria's
 * Tooltip does the same), unless React Aria closes it instantly, then or during the exit: then it
 * unmounts at once, and no exit state is left behind for the next close (the React Aria 1.22.1 bug
 * tooltip.client.tsx keys around).
 */
function useExiting(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  instant: boolean,
): boolean {
  const [exiting, setExiting] = useState(false);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    setExiting(!isOpen && !instant);
  } else if (exiting && instant) {
    // Tab blurs the trigger first (an ordinary close), then the next trigger's tooltip opens and
    // React Aria marks this one's close instant: its exit stops there, as in React Aria's Tooltip.
    setExiting(false);
  }
  useLayoutEffect(() => {
    const element = ref.current;
    if (!exiting) return undefined;
    // getAnimations() styles the element first, so the transition data-exiting starts is listed
    const running =
      element === null ? [] : element.getAnimations().filter((a) => a.playState === 'running');
    let live = true;
    void Promise.all(running.map((a) => a.finished)).then(
      () => live && setExiting(false),
      () => live && setExiting(false),
    );
    return () => {
      live = false;
    };
  }, [ref, exiting]);
  return exiting;
}

/**
 * The popup's portal: `container`, else the parent overlay's (OverlayScope's PortalProvider, §12.1
 * L2), else `document.body`; nothing on the server or before hydration, as React Aria's Tooltip. Not
 * react-aria's `Overlay`, whose FocusScope (about 9 KB minified) a tooltip never uses.
 */
function Portal({
  container,
  children,
}: {
  container: Element | null | undefined;
  children: ReactNode;
}): JSX.Element {
  const isSSR = useIsSSR();
  const { getContainer } = useUNSAFE_PortalContext();
  const target = container ?? getContainer?.() ?? (isSSR ? null : document.body);
  return <>{target === null ? null : createPortal(children, target)}</>;
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
  const scope = use(Scope);
  const ref = useRef<HTMLDivElement | null>(null);
  const isOpen = scope?.state.isOpen ?? false;
  const instant = scope?.state.shouldSkipAnimation === true;
  const exiting = useExiting(ref, isOpen, instant);
  if (scope === null || (!isOpen && !exiting)) return <></>;
  return (
    <Portal container={container}>
      <PopupInner
        scope={scope}
        popupRef={ref}
        exiting={exiting}
        side={side}
        align={align}
        sideOffset={sideOffset}
        render={render}
        dom={dom}
      >
        {children}
      </PopupInner>
    </Portal>
  );
};

function PopupInner({
  scope,
  popupRef,
  exiting,
  side,
  align,
  sideOffset,
  render,
  dom,
  children,
}: {
  scope: TooltipScope;
  popupRef: RefObject<HTMLDivElement | null>;
  exiting: boolean;
  dom: Record<string, unknown>;
  children: ReactNode;
} & Pick<
  Parameters<TooltipEngine['Popup']>[0],
  'side' | 'align' | 'sideOffset' | 'render'
>): ReactElement {
  const { state, triggerRef, tooltipProps } = scope;
  const { direction } = useLocale();
  const { overlayProps, placement, triggerAnchorPoint } = useOverlayPosition({
    placement: toPlacement(side, align),
    targetRef: triggerRef,
    overlayRef: popupRef,
    offset: sideOffset,
    isOpen: state.isOpen,
    onClose: () => state.close(true),
  });
  const entering = useEntering(placement !== null, state.shouldSkipAnimation);
  const id = tooltipProps.id;
  const { tooltipProps: popupProps } = useTooltip(id === undefined ? {} : { id }, state);
  const s: TooltipPopupState = { entering, exiting, side: resolveSide(placement, side, direction) };
  const style = popupStyle({
    ...overlayProps.style,
    ...(triggerAnchorPoint === null
      ? {}
      : { '--trigger-anchor-point': `${triggerAnchorPoint.x}px ${triggerAnchorPoint.y}px` }),
  });
  const engine = { ...engineDom(popupProps), ref: popupRef, style, children };
  const attrs = stateAttrs({ open: state.isOpen, ...s, align });
  return render(mergeProps(engine, dom, attrs), s);
}
