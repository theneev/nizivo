// Three icons from the @nizivo/icons root barrel in an island: exactly these three modules and the
// shared base may ship, never the rest of the 1,880.
import { Bell, Calendar, Search } from '@nizivo/icons';

export function ClientIcons() {
  return (
    <p data-testid="icons">
      <Calendar size={20} />
      <Bell size={20} />
      <Search size={20} label="Search" />
    </p>
  );
}
