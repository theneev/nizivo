// The node lane runs on the React line it names (test/react-matrix.ts).
import { expect, test } from 'vitest';
import { reactLineFacts } from '../helpers/react-matrix';

test('react, react-dom and the engine are the lane’s React line', () => {
  const facts = reactLineFacts();
  expect(facts.react.startsWith(`${facts.line}.`), `react ${facts.react}`).toBe(true);
  expect(facts.dom).toBe(facts.react);
  expect(facts.html).toContain('Save');
});
