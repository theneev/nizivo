import type { JSX } from 'react';
import { CaretHeadline } from './index';

/** A headline with its caret; under Reduced motion the caret stays on. */
export function CaretHeadlineExample(): JSX.Element {
  return <CaretHeadline level={2}>Build calm product UI</CaretHeadline>;
}
