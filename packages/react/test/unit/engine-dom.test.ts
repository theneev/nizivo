import { expect, test } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };
import { defined, engineDom } from '../../src/_engines/react-aria/dom';
import { popupStyle, resolveSide, toPlacement } from '../../src/_engines/react-aria/overlay.client';

function handler(): void {}

test('engineDom drops engine classes, slot names and every data-* outside the functional allowlist', () => {
  expect(
    engineDom({
      className: 'react-aria-Button',
      slot: 'close',
      'data-rac': '',
      'data-hovered': true,
      'data-focused': true,
      'data-pressed': true,
      'data-invalid': true,
      'data-key': '7d',
      'data-collection': 'c1',
      'data-react-aria-pressable': 'true',
      id: 'x',
      role: 'option',
      onKeyDown: handler,
    }),
  ).toEqual({
    'data-key': '7d',
    'data-collection': 'c1',
    'data-react-aria-pressable': 'true',
    id: 'x',
    role: 'option',
    onKeyDown: handler,
  });
});

test('the allowlist never shadows a vocabulary name', () => {
  const names = new Set(
    Object.values(vocabulary)
      .filter((group) => Array.isArray(group))
      .flat()
      .map((entry: { name: string }) => entry.name),
  );
  expect(allowlist.attributes.filter((name) => names.has(name))).toEqual([]);
});

test('defined() drops undefined keys only', () => {
  expect(defined({ a: 1, b: undefined, c: null, d: false })).toEqual({ a: 1, c: null, d: false });
});

test('placement mapping and resolved physical side', () => {
  expect(toPlacement('bottom', 'start')).toBe('bottom start');
  expect(toPlacement('top', 'center')).toBe('top');
  expect(toPlacement('end', 'start')).toBe('end top');
  expect(resolveSide('left', 'top', 'ltr')).toBe('left');
  expect(resolveSide(null, 'start', 'rtl')).toBe('right');
  expect(resolveSide('center', 'end', 'ltr')).toBe('right');
});

test('popupStyle drops the engine z-index and exposes the documented runtime variables', () => {
  expect(
    popupStyle({
      position: 'absolute',
      zIndex: 100000,
      maxHeight: 320,
      '--trigger-width': '200px',
      '--trigger-anchor-point': '10px 0px',
    }),
  ).toEqual({
    position: 'absolute',
    maxHeight: 320,
    '--trigger-width': '200px',
    '--trigger-anchor-point': '10px 0px',
    '--nz-trigger-width': '200px',
    '--nz-transform-origin': '10px 0px',
    '--nz-available-height': '320px',
  });
});
