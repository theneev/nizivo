// TabNav with Next's Link through `render`: server-rendered links, no @nizivo client module. The
// current link follows the URL, read on the server from searchParams.
import Link from 'next/link';
import { TabNav } from '@nizivo/react/tab-nav';

const STATUSES = [
  ['all', 'All orders'],
  ['unfulfilled', 'Unfulfilled'],
  ['archived', 'Archived'],
];

export default async function Page({ searchParams }) {
  const status = (await searchParams).status ?? 'all';
  return (
    <main>
      <h1>TabNav</h1>
      <TabNav.Root aria-label="Order status">
        {STATUSES.map(([value, label]) => (
          <TabNav.Link
            key={value}
            render={<Link href={`/tab-nav?status=${value}`} />}
            current={value === status}
          >
            {label}
          </TabNav.Link>
        ))}
      </TabNav.Root>
    </main>
  );
}
