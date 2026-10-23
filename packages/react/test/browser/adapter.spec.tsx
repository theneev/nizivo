// The browser lane runs the Tooltip adapter it names (test/adapters.ts, D-cc).
import { expect, test } from 'vitest';
import { tooltipAdapter } from '../helpers/adapter';

test('the lane runs the Tooltip adapter NZ_ADAPTER names, else the default', () => {
  const { named, running } = tooltipAdapter();
  expect(running).toBe(named);
});
