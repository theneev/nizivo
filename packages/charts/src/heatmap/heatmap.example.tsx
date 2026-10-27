import type { JSX } from 'react';
import { Heatmap } from './index';

interface Slot {
  day: string;
  hour: string;
  orders: number | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];

// Figma 03's heatmap: orders per two hours, a week, busiest at midday and in the evening.
const ORDERS: number[][] = [
  [2, 1, 1, 9, 18, 21, 24, 52, 38, 22, 12, 9],
  [3, 2, 8, 11, 19, 22, 36, 40, 37, 23, 20, 10],
  [2, 1, 6, 12, 20, 24, 35, 44, 41, 25, 18, 9],
  [3, 2, 7, 10, 21, 23, 37, 47, 39, 26, 19, 11],
  [4, 2, 6, 12, 22, 26, 39, 50, 46, 31, 24, 14],
  [11, 3, 10, 21, 24, 36, 38, 52, 51, 37, 22, 4],
  [9, 4, 3, 8, 16, 29, 34, 45, 40, 30, 21, 6],
];

const WEEK: Slot[] = DAYS.flatMap((day, d) =>
  HOURS.map((hour, h) => ({ day, hour, orders: ORDERS[d]?.[h] ?? null })),
);

export function HeatmapExample(): JSX.Element {
  return (
    <Heatmap
      title="Orders by hour"
      summary="Orders per two hours, Oct 5–11"
      data={WEEK}
      x="hour"
      y="day"
      value="orders"
      labels={{ row: 'Day' }}
    />
  );
}

/** A store closed on Sunday mornings (no value), with the values open under the grid. */
export function HeatmapDetailsExample(): JSX.Element {
  return (
    <Heatmap
      title="Orders by hour"
      data={WEEK.map((slot) =>
        slot.day === 'Sun' && Number(slot.hour) < 10 ? { ...slot, orders: null } : slot,
      )}
      x="hour"
      y="day"
      value="orders"
      tableView="details"
      labels={{ row: 'Day', missing: 'Closed' }}
    />
  );
}

/** Loading, empty and failed: the same box, Figma's seven-day height. */
export function HeatmapStatusExample(): JSX.Element {
  return (
    <div>
      <Heatmap
        title="Orders by hour"
        status="loading"
        data={[] as Slot[]}
        x="hour"
        y="day"
        value="orders"
      />
      <Heatmap title="Orders by hour" data={[] as Slot[]} x="hour" y="day" value="orders" />
      <Heatmap title="Orders by hour" status="error" data={WEEK} x="hour" y="day" value="orders" />
    </div>
  );
}
