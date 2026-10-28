'use client';
// Fixture: an engine adapter. It names no element; it merges stateAttrs() into what the parts pass.
import type { ReactElement, ReactNode } from 'react';
import { mergeProps } from '../../contracts/merge-props';
import { stateAttrs } from '../../contracts/state';
import type { PaneTriggerState } from '../../pane/pane.contract';

type Render<S> = (props: Record<string, unknown>, state: S) => ReactElement;

export const Root = ({
  open,
  render,
  ...dom
}: {
  open?: boolean;
  render: Render<object>;
  [key: string]: unknown;
}): ReactElement => <RootInner open={open === true} render={render} dom={dom} />;

// Handed the parts' props under another name: nz api follows `dom={dom}` into it.
function RootInner({
  open,
  render,
  dom,
}: {
  open: boolean;
  render: Render<object>;
  dom: Record<string, unknown>;
}): ReactElement {
  const attrs = stateAttrs({ open, disabled: false });
  return render(mergeProps(dom, attrs), {});
}

export const Trigger = ({
  render,
  panel,
  children,
  ...dom
}: {
  render: Render<PaneTriggerState>;
  panel: Record<string, unknown>;
  children?: ReactNode;
  [key: string]: unknown;
}): ReactElement => {
  const s: PaneTriggerState = { open: false, pressed: false };
  const where = { side: 'bottom' as const };
  return (
    <>
      {render(mergeProps(dom, stateAttrs(s), { children }), s)}
      <div {...mergeProps(panel, stateAttrs({ ...where }))} />
    </>
  );
};
