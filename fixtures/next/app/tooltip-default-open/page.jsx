// A Tooltip open on the server (`defaultOpen`). The trigger is server-rendered open, while React Aria
// renders the popup only after hydration, so an `aria-describedby` in the server HTML would point at
// nothing until then.
import { Tooltip } from '@nizivo/react/tooltip';

export default function Page() {
  return (
    <main>
      <h1>Tooltip open on the server</h1>
      <Tooltip.Root defaultOpen>
        <Tooltip.Trigger>Export</Tooltip.Trigger>
        <Tooltip.Popup>Download the report as CSV</Tooltip.Popup>
      </Tooltip.Root>
    </main>
  );
}
