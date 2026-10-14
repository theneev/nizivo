import type { JSX } from 'react';
import { ProgressBar } from './index';

export function ProgressBarExample(): JSX.Element {
  return (
    <div>
      <ProgressBar label="Monthly goal" value={68} />
      <ProgressBar label="Setup guide" value={3} max={5} valueText="3 of 5 steps" tone="success" />
      <ProgressBar label="Uploading product photos" indeterminate />
      <ProgressBar aria-label="Import" value={40} showValue={false} tone="neutral" />
    </div>
  );
}
