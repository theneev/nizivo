import type { JSX } from 'react';
import { Slider } from './index';

/** A slider: the name and the value above the track, the value always written out. */
export function SliderExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 24, inlineSize: 320 }}>
      <Slider label="Discount" defaultValue={30} format={{ style: 'unit', unit: 'percent' }} />
      <Slider label="Volume" defaultValue={70} disabled />
    </div>
  );
}
