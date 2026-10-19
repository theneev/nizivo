import type { JSX } from 'react';
import { Sparkline } from './index';

const UP = [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27];
const DOWN = [27, 25, 26, 22, 23, 20, 21, 18, 19, 16, 17, 15];

/** Decorative: the KPI tile's Delta carries the meaning, so the mark is hidden from assistive tech. */
export function SparklineExample(): JSX.Element {
  return <Sparkline data={UP} />;
}

/** Down draws in chart/neutral, not red (Figma 03: the shape is context, the Delta is the signal). */
export function SparklineDownExample(): JSX.Element {
  return <Sparkline data={DOWN} />;
}

/** Labelled: one image with a name, for a sparkline that stands alone. */
export function SparklineLabelledExample(): JSX.Element {
  return <Sparkline data={UP} label="Sales trend, up 125% over 12 weeks" />;
}

/** A gap where a value is missing, no wash, no dot. */
export function SparklineGapExample(): JSX.Element {
  return <Sparkline data={[...UP.slice(0, 5), null, ...UP.slice(6)]} area={false} dot={false} />;
}
