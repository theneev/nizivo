// Fixture: the render-prop helpers, reduced to what the fixture components call.
import { createElement } from 'react';

/** Reduced for the fixture: `nz api` reads only the name and the state argument. */
export type RenderProp<S> = (props: Record<string, unknown>, state: S) => unknown;

export function renderElement<S>(
  tag: string,
  render: RenderProp<S> | undefined,
  state: S,
  props: Record<string, unknown>,
): unknown {
  return render === undefined ? createElement(tag, props) : render(props, state);
}

export function toRenderFn<S>(render: RenderProp<S> | undefined, tag: string): RenderProp<S> {
  return (props, state) => renderElement(tag, render, state, props);
}
