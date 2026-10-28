import type { JSX } from 'react';
import { Field } from '../../field/index';
import { DateRangePicker } from './index';

/**
 * The report period: the picker with "Oct 1 – Oct 7, 2026" applied. Open it, pick a preset or two
 * days, then Apply; Cancel, Escape or a press outside keep the old range. The form gets
 * `period=2026-10-01/2026-10-07`.
 */
export function DateRangePickerExample(): JSX.Element {
  return (
    <Field label="Report period">
      <DateRangePicker
        name="period"
        timeZone="UTC"
        defaultValue={{ start: '2026-10-01', end: '2026-10-07' }}
      />
    </Field>
  );
}

/** No range yet: the placeholder; no presets, only the month. */
export function DateRangePickerEmptyExample(): JSX.Element {
  return (
    <Field label="Delivery window">
      <DateRangePicker timeZone="Europe/Berlin" presets={[]} />
    </Field>
  );
}

/** Sizes, an error from the server, and disabled. */
export function DateRangePickerStatesExample(): JSX.Element {
  const range = { start: '2026-09-28', end: '2026-10-04' };
  return (
    <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>
      <DateRangePicker aria-label="Period" timeZone="UTC" size="sm" defaultValue={range} />
      <DateRangePicker aria-label="Period" timeZone="UTC" size="lg" defaultValue={range} />
      <Field label="Campaign dates" error="Pick dates after the campaign was created.">
        <DateRangePicker timeZone="UTC" defaultValue={range} />
      </Field>
      <Field label="Archived period" disabled>
        <DateRangePicker timeZone="UTC" defaultValue={range} />
      </Field>
    </div>
  );
}
