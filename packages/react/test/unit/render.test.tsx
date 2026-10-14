import { expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { PART_OWNED, renderElement } from '../../src/contracts/render';

// Under RSC a server Button reaches a client part's `render` already rendered: a host <button> that
// carries Button's own data-slot and data-size. The part's presentational attributes must win.
test('a part keeps its data-slot and size over a pre-rendered host element', () => {
  const element = renderElement(
    'button',
    <button
      data-slot="button"
      data-size="md"
      data-variant="critical"
      className="nz-button nz-hit-target"
    >
      Delete
    </button>,
    {},
    {
      'data-slot': 'select-trigger',
      'data-size': 'lg',
      className: 'nz-select-trigger nz-hit-target',
    },
  );
  expect(element.props).toMatchObject({
    'data-slot': 'select-trigger',
    'data-size': 'lg',
    // the part sets no variant, so the element's stays
    'data-variant': 'critical',
    className: 'nz-select-trigger nz-hit-target nz-button',
  });
});

test('the part-owned attributes are the presentational group of contracts/vocabulary.json', () => {
  expect([...PART_OWNED].toSorted()).toEqual(
    vocabulary.presentational.map((entry) => entry.name).toSorted(),
  );
});
