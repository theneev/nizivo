import type { JSX } from 'react';
import { Field } from '../field/index';
import { Select } from './index';

export function SelectExample(): JSX.Element {
  return (
    <Select.Root defaultValue="30d" name="period" aria-label="Period">
      <Select.Trigger />
      <Select.Popup>
        <Select.Group>
          <Select.GroupLabel>Recent</Select.GroupLabel>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
        </Select.Group>
        <Select.Separator />
        <Select.Item value="all" disabled>
          All time
        </Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}

/**
 * In a Field: the label and description name and describe the trigger, the Field's `name` reaches
 * the hidden native `<select>`, and a click on the label focuses the trigger (ring shown) without
 * opening the list. The selected row shows the check (`indicator` replaces it; `null` removes it).
 */
export function SelectFieldExample(): JSX.Element {
  return (
    <Field
      label="Reporting period"
      description="Applies to every chart on this page."
      name="period"
    >
      <Select.Root defaultValue="30d">
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
          <Select.Item value="90d">Last 90 days</Select.Item>
        </Select.Popup>
      </Select.Root>
    </Field>
  );
}

/** Opened on the server: the popup still renders nothing until hydration (§12.2 SSR). */
export function SelectOpenExample(): JSX.Element {
  return (
    <Select.Root defaultOpen placeholder="Choose a period" aria-label="Period" size="sm" invalid>
      <Select.Trigger />
      <Select.Popup>
        <Select.Item value="7d">Last 7 days</Select.Item>
      </Select.Popup>
    </Select.Root>
  );
}
