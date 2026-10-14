// Three icons from the @nizivo/icons root barrel, rendered by a Server Component: no icon module (and
// no @nizivo client module) may reach the browser.
import { Bell, Calendar, Search } from '@nizivo/icons';

export default function Page() {
  return (
    <main>
      <h1>Icons on the server</h1>
      <p data-testid="icons">
        <Calendar size={20} />
        <Bell size={20} />
        <Search size={20} label="Search" />
      </p>
    </main>
  );
}
