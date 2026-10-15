// TabNav with plain links: server-safe, so no @nizivo client module. The current link follows the URL;
// following a link is a full page load, and the SPA fallback serves the same app.
import { TabNav } from '@nizivo/react/tab-nav';

const STATUSES = [
  ['all', 'All orders'],
  ['unfulfilled', 'Unfulfilled'],
  ['archived', 'Archived'],
];

export default function Page() {
  const status = new URLSearchParams(location.search).get('status') ?? 'all';
  return (
    <main>
      <h1>TabNav</h1>
      <TabNav.Root aria-label="Order status">
        {STATUSES.map(([value, label]) => (
          <TabNav.Link key={value} href={`/tab-nav?status=${value}`} current={value === status}>
            {label}
          </TabNav.Link>
        ))}
      </TabNav.Root>
    </main>
  );
}
