// Fixture: a part in the barrel only, with generic, conditional props.
import type { ComponentPropsWithRef, ReactElement } from 'react';
import type { Passthrough } from '../frame/frame';

export interface SparkBaseProps<T> extends Passthrough<'legend'> {
  data: readonly T[];
}

export type SparkProps<T = number> = SparkBaseProps<T> &
  Omit<ComponentPropsWithRef<'span'>, 'children' | 'color'> &
  ([T] extends [number]
    ? {
        /** The value of a datum. @default the datum itself */
        y?: (datum: T) => number;
      }
    : {
        /** The value of a datum. */
        y: (datum: T) => number;
      });

export function Spark<T = number>({ data }: SparkProps<T>): ReactElement {
  return <span className="nz-spark" data-slot="spark" data-count={data.length} />;
}
