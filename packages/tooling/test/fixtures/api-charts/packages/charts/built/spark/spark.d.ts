import { Passthrough } from '../frame/frame.js';
import { ComponentPropsWithRef, ReactElement } from 'react';
//#region src/spark/spark.d.ts
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
export declare function Spark<T = number>({ data }: SparkProps<T>): ReactElement;
//#endregion
