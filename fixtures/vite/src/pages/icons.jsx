// Three icons from the @nizivo/icons root barrel: exactly these three modules and the shared base may
// ship, never the rest of the 1,880.
import { Bell, Calendar, Search } from '@nizivo/icons';

export default function Page() {
  return (
    <main>
      <h1>Icons</h1>
      <p data-testid="icons">
        <Calendar size={20} />
        <Bell size={20} />
        <Search size={20} label="Search" />
      </p>
    </main>
  );
}
