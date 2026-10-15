// TabNav with plain links, rendered on the server with no client directive: no @nizivo client
// module and no script at all. Static output cannot read the query string, so the page marks its
// first link current.
import { TabNav } from '@nizivo/react/tab-nav';

const STATUSES = [
  ['all', 'All orders'],
  ['unfulfilled', 'Unfulfilled'],
  ['archived', 'Archived'],
];

export function StatusNav() {
  return (
    <TabNav.Root aria-label="Order status">
      {STATUSES.map(([value, label]) => (
        <TabNav.Link key={value} href={`/tab-nav?status=${value}`} current={value === 'all'}>
          {label}
        </TabNav.Link>
      ))}
    </TabNav.Root>
  );
}
