// Tabs: only the selected panel renders; arrow keys move the selection.
import { Tabs } from '@nizivo/react/tabs';

export default function Page() {
  return (
    <main>
      <h1>Tabs</h1>
      <Tabs.Root defaultValue="unfulfilled">
        <Tabs.List aria-label="Order status">
          <Tabs.Tab value="all">All orders</Tabs.Tab>
          <Tabs.Tab value="unfulfilled" count={12}>
            Unfulfilled
          </Tabs.Tab>
          <Tabs.Tab value="archived">Archived</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="all">Every order from the last 90 days.</Tabs.Panel>
        <Tabs.Panel value="unfulfilled">Paid orders that still need to ship.</Tabs.Panel>
        <Tabs.Panel value="archived">Orders you closed.</Tabs.Panel>
      </Tabs.Root>
    </main>
  );
}
