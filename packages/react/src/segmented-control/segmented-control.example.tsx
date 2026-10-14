import type { JSX } from 'react';
import { Field } from '../field/index';
import { Stack } from '../stack/index';
import { SegmentedControl } from './index';

const RANGES = [
  ['today', 'Today'],
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['12m', '12M'],
] as const;

/** Stand-ins for `@nizivo/icons` glyphs (16 px Lucide strokes). */
function Rows(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
    >
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function Tiles(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

/** The Overview range picker: a radio group, so arrow keys move the selection. */
export function SegmentedControlExample(): JSX.Element {
  return (
    <SegmentedControl.Root aria-label="Range" name="range" defaultValue="30d">
      {RANGES.map(([value, label]) => (
        <SegmentedControl.Item key={value} value={value}>
          {label}
        </SegmentedControl.Item>
      ))}
    </SegmentedControl.Root>
  );
}

/** 32, 40 and 48 px tracks, and a track that fills its container with equal items. */
export function SegmentedControlSizesExample(): JSX.Element {
  return (
    <Stack gap="4">
      <SegmentedControl.Root aria-label="Range, small" size="sm" defaultValue="7d">
        {RANGES.slice(0, 3).map(([value, label]) => (
          <SegmentedControl.Item key={value} value={value}>
            {label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <SegmentedControl.Root aria-label="Range, large" size="lg" defaultValue="7d">
        {RANGES.slice(0, 3).map(([value, label]) => (
          <SegmentedControl.Item key={value} value={value}>
            {label}
          </SegmentedControl.Item>
        ))}
      </SegmentedControl.Root>
      <div style={{ inlineSize: 'min(100%, 420px)' }}>
        <SegmentedControl.Root aria-label="Range, full width" fullWidth defaultValue="30d">
          {RANGES.map(([value, label]) => (
            <SegmentedControl.Item key={value} value={value}>
              {label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </div>
    </Stack>
  );
}

/** Icon-only items are named with `aria-label`; one item, or the whole group, can be disabled. */
export function SegmentedControlStatesExample(): JSX.Element {
  return (
    <Stack gap="4">
      <SegmentedControl.Root aria-label="Layout" defaultValue="list">
        <SegmentedControl.Item value="list" icon={<Rows />} aria-label="List" />
        <SegmentedControl.Item value="grid" icon={<Tiles />} aria-label="Grid" />
      </SegmentedControl.Root>
      <SegmentedControl.Root aria-label="Range with a disabled item" defaultValue="7d">
        <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
        <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
        <SegmentedControl.Item value="12m" disabled>
          12M
        </SegmentedControl.Item>
      </SegmentedControl.Root>
      <SegmentedControl.Root aria-label="Range, disabled" defaultValue="30d" disabled>
        <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
        <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
      </SegmentedControl.Root>
    </Stack>
  );
}

/**
 * Inside a Field, the Field's label names the group and its description and error describe it.
 * `required` with no default value blocks submit until a choice is made.
 */
export function SegmentedControlFieldExample(): JSX.Element {
  return (
    <Stack gap="6">
      <Field
        label="Payout schedule"
        description="When we send your earnings."
        name="schedule"
        group
      >
        <SegmentedControl.Root defaultValue="weekly">
          <SegmentedControl.Item value="daily">Daily</SegmentedControl.Item>
          <SegmentedControl.Item value="weekly">Weekly</SegmentedControl.Item>
          <SegmentedControl.Item value="monthly">Monthly</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Field>
      <Field label="Delivery speed" name="speed" required error="Choose a delivery speed." group>
        <SegmentedControl.Root>
          <SegmentedControl.Item value="standard">Standard</SegmentedControl.Item>
          <SegmentedControl.Item value="express">Express</SegmentedControl.Item>
        </SegmentedControl.Root>
      </Field>
    </Stack>
  );
}
