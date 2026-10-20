// AreaChart through the barrel: barrel tree-shaking, as react's `{ Button } from the barrel`. It never
// costs more than the ./area-chart subpath's figure. Everything it imports is in (ChartFrame, Legend,
// the island, d3), React external.
export { AreaChart } from '../../../charts/dist/index.js';
