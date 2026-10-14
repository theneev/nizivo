import { expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import { Button } from '../../src/button/button';
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

// What RSC hands the part for `render={<Button />}`: Button already called, a host <button>. An empty
// Button carries no children, so the part's own (Select.Value and the chevron) survive the merge.
test("an empty server Button keeps the part's children", () => {
  const host = Button({});
  expect(host.type).toBe('button');
  expect(host.props).not.toHaveProperty('children', expect.anything());
  const value = <span data-slot="select-value">Last 30 days</span>;
  const element = renderElement(
    'button',
    host,
    {},
    {
      'data-slot': 'select-trigger',
      children: value,
    },
  );
  expect(element.props).toMatchObject({ 'data-slot': 'select-trigger', children: value });
  // A Button with a label keeps it: the element's children win, as for any other prop.
  const labelled = renderElement('button', Button({ children: 'Pick' }), {}, { children: value });
  expect(labelled.props).not.toHaveProperty('children', value);
});
