// v0.2 exit (ARCHITECTURE.md §21.2, M41): the overview's server-rendered KPI row, four KpiTiles with
// Sparkline slots, and "Top channels" (RankedList). Server parts only: the page ships no @nizivo
// client module, @nizivo/react's or @nizivo/charts' (0 KB of Nizivo client JS).
import '@nizivo/charts/styles.css';
import { Heading } from '@nizivo/react/heading';
import { KpiRow, TopChannels } from '../_dashboard/parts.jsx';

export default function Page() {
  return (
    <main className="dashboard">
      <Heading level={1}>Overview: the KPI row</Heading>
      <KpiRow />
      <div className="dashboard-aside">
        <TopChannels />
      </div>
    </main>
  );
}
