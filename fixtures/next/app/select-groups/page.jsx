// Select.Group, Select.GroupLabel and Select.Separator, with the default trigger.
import { Select } from '@nizivo/react/select';

export default function Page() {
  return (
    <main>
      <h1>Select groups</h1>
      <Select.Root defaultValue="30d" name="period" aria-label="Period">
        <Select.Trigger />
        <Select.Popup>
          <Select.Group>
            <Select.GroupLabel>Recent</Select.GroupLabel>
            <Select.Item value="7d">Last 7 days</Select.Item>
            <Select.Item value="30d">Last 30 days</Select.Item>
          </Select.Group>
          <Select.Separator />
          <Select.Group>
            <Select.GroupLabel>Longer</Select.GroupLabel>
            <Select.Item value="90d">Last 90 days</Select.Item>
            <Select.Item value="365d">Last 12 months</Select.Item>
          </Select.Group>
        </Select.Popup>
      </Select.Root>
    </main>
  );
}
