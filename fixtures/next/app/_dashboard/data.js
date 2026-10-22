// The overview dashboard's data (Figma 08, "Overview · Desktop 1440" 7275:15337), as a Server
// Component would load it: plain numbers, formatted on the server (ARCHITECTURE.md §16.4).
export const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };
export const USD_CENTS = { style: 'currency', currency: 'USD', minimumFractionDigits: 2 };
export const PERCENT = { style: 'percent', maximumFractionDigits: 1 };

/** The KPI row: Total sales tinted (M41: tone="brand"), then Orders, Conversion and AOV on surface. */
export const KPIS = [
  {
    label: 'Total sales',
    value: 48290,
    format: USD,
    delta: 0.124,
    tone: 'brand',
    trend: [12, 14, 13, 17, 16, 19, 18, 22, 21, 24, 23, 27],
  },
  {
    label: 'Orders',
    value: 1284,
    delta: 0.081,
    trend: [40, 42, 41, 45, 44, 47, 49, 48, 52, 51, 55, 57],
  },
  {
    label: 'Conversion',
    value: 0.032,
    format: PERCENT,
    delta: -0.031,
    trend: [27, 25, 26, 22, 23, 20, 21, 18, 19, 16, 17, 15],
  },
  {
    label: 'Avg. order value',
    value: 37.61,
    format: USD_CENTS,
    delta: 0.027,
    trend: [30, 31, 30, 32, 33, 32, 34, 33, 35, 36, 35, 37],
  },
];

/** "Top channels" (Figma Ranked List 752:444). */
export const CHANNELS = [
  ['Online store', 64120],
  ['Instagram Shop', 21804],
  ['Point of sale', 18240],
  ['Wholesale', 9312],
  ['Google', 6050],
];

/** Daily sales for the TrendCard's AreaChart, with the previous period. */
export const SALES = [
  2140, 3020, 2760, 4310, 3880, 5240, 6280, 5910, 6630, 7020, 6480, 7350, 7910, 8240,
].map((sales, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  sales,
  previous: Math.round(sales * 0.78 + 400),
}));

/** What a slow data source costs, so the Suspense fallbacks stream first. */
export const DELAY_MS = 600;

/** "Recent orders" (Figma Order Row 7275:14091): UTC instants, formatted with an explicit time zone. */
export const ORDERS = [
  [
    '1042',
    '2026-10-14T09:12:00Z',
    'Maya Rao',
    ['Paid', 'success'],
    ['Unfulfilled', 'warning'],
    112,
  ],
  [
    '1041',
    '2026-10-14T08:47:00Z',
    'Jonah Okafor',
    ['Paid', 'success'],
    ['Fulfilled', 'success'],
    64.5,
  ],
  [
    '1040',
    '2026-10-13T17:05:00Z',
    'Priya Shah',
    ['Pending', 'warning'],
    ['On hold', 'neutral'],
    238,
  ],
  [
    '1039',
    '2026-10-13T11:30:00Z',
    'Leo Martin',
    ['Refunded', 'neutral'],
    ['Fulfilled', 'success'],
    28,
  ],
];

/** The overview's range picker (Figma: Today, 7D, 30D, 90D, 12M). */
export const RANGES = [
  ['today', 'Today'],
  ['7d', '7D'],
  ['30d', '30D'],
  ['90d', '90D'],
  ['12m', '12M'],
];

/** The "Goals" card: this month's sales against the goal (Figma: "Monthly goal 68%"). */
export const GOAL = { sales: 48290, target: 71000 };
