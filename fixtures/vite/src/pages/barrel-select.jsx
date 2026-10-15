// One client part (Select) through the root barrel: the page may ship only the modules Select reaches.
import { Select } from '@nizivo/react';

export default function Page() {
  return (
    <main>
      <h1>Select through the barrel</h1>
      <Select.Root defaultValue="30d" name="period" aria-label="Period">
        <Select.Trigger />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
          <Select.Item value="90d">Last 90 days</Select.Item>
        </Select.Popup>
      </Select.Root>
    </main>
  );
}
