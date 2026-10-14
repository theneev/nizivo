import { expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import {
  ALIGNS,
  MIRRORS,
  ORIENTATIONS,
  SIDES,
  STATE_ATTR_NAMES,
  stateAttrs,
} from '../../src/contracts/state';
import { details } from '../../src/contracts/details';

test('stateAttrs() covers exactly the state group of contracts/vocabulary.json', () => {
  const names = vocabulary.state.map((entry) => entry.name).toSorted();
  expect(STATE_ATTR_NAMES.toSorted()).toEqual(names);
});

test('presence attributes are empty strings; false and absent states emit nothing', () => {
  expect(
    stateAttrs({ open: true, entering: false, disabled: undefined, side: 'left', align: 'start' }),
  ).toEqual({ 'data-open': '', 'data-side': 'left', 'data-align': 'start' });
  expect(stateAttrs({ focusVisible: true, readOnly: true, nestedOpen: true })).toEqual({
    'data-focus-visible': '',
    'data-readonly': '',
    'data-nested-open': '',
  });
});

function values(name: string): unknown {
  return vocabulary.state.find((entry) => entry.name === name)?.values;
}

test('valued attributes use exactly the values the vocabulary lists', () => {
  expect(values('data-side')).toEqual([...SIDES]);
  expect(values('data-align')).toEqual([...ALIGNS]);
  expect(values('data-orientation')).toEqual([...ORIENTATIONS]);
  expect(values('data-mirror')).toEqual([...MIRRORS]);
});

test("details() reports 'unknown' honestly and carries the event only when given", () => {
  expect(details('unknown')).toEqual({ reason: 'unknown' });
  expect(Object.keys(details<'escape'>('escape'))).toEqual(['reason']);
});
