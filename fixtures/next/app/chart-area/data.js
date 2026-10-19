// Daily sales for the chart pages, as a Server Component would load them: ISO plain dates and
// plain numbers. AreaChart formats every string on the server (ARCHITECTURE.md §16.4).
export const SALES = [
  2140, 3020, 2760, 4310, 3880, 5240, 6280, 5910, 6630, 7020, 6480, 7350, 7910, 8240,
].map((sales, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  sales,
  previous: Math.round(sales * 0.78 + 400),
}));

export const USD = { style: 'currency', currency: 'USD', maximumFractionDigits: 0 };
