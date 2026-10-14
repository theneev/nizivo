// NO directive. Shared shape of the props a public leaf hands an engine adapter (ARCHITECTURE.md §9.2).
import type { ComponentPropsWithRef, JSX, ReactElement, ReactNode } from 'react';

/** A normalised render function: the adapter calls it with merged DOM props and the part's state. */
export type RenderFn<S> = (props: Record<string, unknown>, state: S) => ReactElement;

/**
 * Engine-side part props: Nizivo DOM props (class, `data-slot`, ids, ARIA, consumer handlers and ref)
 * plus a render function. `T` is the element type the engine renders for the part.
 */
export type EnginePart<
  T extends keyof JSX.IntrinsicElements,
  S,
  Omitted extends string = never,
> = Omit<ComponentPropsWithRef<T>, 'children' | Omitted> & {
  children?: ReactNode;
  render: RenderFn<S>;
};
