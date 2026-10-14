// A server Button composed into Select.Trigger through `render`, under Select.Root size="lg". The
// part's presentational attributes win over the Button's, so the trigger is `select-trigger` with
// `data-size="lg"` (composition precedence, §8.2, D-a), and it keeps the value and the chevron.
import { Button } from '@nizivo/react/button';
import { Select } from '@nizivo/react/select';

export default function Page() {
  return (
    <main>
      <h1>A Button as the Select trigger</h1>
      <Select.Root defaultValue="30d" name="period" aria-label="Period" size="lg">
        <Select.Trigger render={<Button />} />
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
          <Select.Item value="30d">Last 30 days</Select.Item>
          <Select.Item value="90d">Last 90 days</Select.Item>
        </Select.Popup>
      </Select.Root>
    </main>
  );
}
