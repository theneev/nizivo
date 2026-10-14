import type { JSX } from 'react';
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
