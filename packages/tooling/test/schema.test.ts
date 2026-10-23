import { describe, expect, test } from 'vitest';
import {
  focusTargetOf,
  kebabCase,
  slotPrefixes,
  validateComponentConfig,
  type ComponentConfig,
} from '../gen/schema.ts';

// The nz.base inputs (ARCHITECTURE.md §8.5; reference: gen/COMPONENT-JSON.md).
const select = {
  name: 'select',
  tier: 'engine',
  engine: 'react-aria',
  overlay: true,
  parts: ['Root', 'Trigger', 'Popup', 'Item'],
  interactive: ['select-trigger', 'select-item'],
  focusTarget: 'self',
  stateIndicator: [
    { slot: 'select-popup', paint: 'border' },
    { slot: 'select-item', state: '[data-selected]', paint: 'highlight' },
  ],
};

function config(raw: Record<string, unknown>, folder = String(raw.name)): ComponentConfig {
  const result = validateComponentConfig(raw, folder, false);
  if ('errors' in result) throw new Error(result.errors.join('\n'));
  return result.config;
}

function errors(raw: Record<string, unknown>, folder = String(raw.name)): string[] {
  const result = validateComponentConfig(raw, folder, false);
  return 'errors' in result ? result.errors : [];
}

describe('slots', () => {
  test('are full data-slot values: the name, or the name and a part', () => {
    expect(config(select)).toMatchObject({
      interactive: ['select-trigger', 'select-item'],
      stateIndicator: select.stateIndicator,
    });
    expect(errors({ ...select, interactive: ['trigger'] })).toEqual([
      '"interactive": "trigger" is not a data-slot of this component (expected "select", alone or followed by "-<part>")',
    ]);
  });

  test('of a family subpath may start with any member of "exports"', () => {
    expect(kebabCase('ProgressBar')).toBe('progress-bar');
    expect(slotPrefixes('progress', ['ProgressBar', 'Meter'])).toEqual([
      'progress',
      'progress-bar',
      'meter',
    ]);
    const progress = {
      name: 'progress',
      tier: 'server',
      exports: ['ProgressBar', 'Meter'],
      stateIndicator: [
        { slot: 'progress-bar-fill', paint: 'fill' },
        { slot: 'meter-fill', paint: 'fill' },
      ],
    };
    expect(config(progress).stateIndicator).toHaveLength(2);
    expect(
      errors({ ...progress, stateIndicator: [{ slot: 'switch-thumb', paint: 'mark' }] }),
    ).toEqual([
      '"stateIndicator[0]" slot "switch-thumb" is not a data-slot of this component (expected "progress" or "progress-bar" or "meter", alone or followed by "-<part>")',
    ]);
  });

  test('may not repeat', () => {
    expect(errors({ ...select, interactive: ['select-trigger', 'select-trigger'] })).toEqual([
      '"interactive" repeats select-trigger',
    ]);
  });
});

describe('focusTarget', () => {
  test('is one mode for every interactive slot, "self" when absent', () => {
    const { focusTarget: _, ...rest } = select;
    expect(focusTargetOf(config(rest), 'select-item')).toBe('self');
    expect(focusTargetOf(config({ ...select, focusTarget: 'within' }), 'select-item')).toBe(
      'within',
    );
  });

  test('may map each interactive slot to its own mode', () => {
    const input = {
      name: 'input',
      tier: 'client',
      interactive: ['input', 'input-group'],
      focusTarget: { input: 'self', 'input-group': 'within' },
    };
    expect(focusTargetOf(config(input), 'input-group')).toBe('within');
    expect(errors({ ...input, focusTarget: { input: 'self', 'input-icon': 'within' } })).toEqual([
      '"focusTarget" must map exactly the "interactive" slots (missing input-group; not interactive: input-icon)',
    ]);
  });

  test('needs interactive slots and a known mode', () => {
    expect(errors({ name: 'badge', tier: 'server', focusTarget: 'self' })).toEqual([
      '"focusTarget" needs at least one "interactive" slot',
    ]);
    expect(errors({ ...select, focusTarget: 'virtual' })).toEqual([
      '"focusTarget" must be one of "self", "engine", "nested-input", "within", or an object mapping each "interactive" slot to one',
    ]);
  });
});

describe('stateIndicator', () => {
  test('entries are { slot, state?, paint } objects', () => {
    expect(errors({ ...select, stateIndicator: ['select-item[data-selected]'] })).toEqual([
      '"stateIndicator[0]" must be an object { "slot", "state"?, "paint" }',
      '"overlay": true needs { "slot": "select-popup", "paint": "border" } in "stateIndicator" (the popup\'s forced-colours edge)',
    ]);
    expect(
      errors({
        ...select,
        stateIndicator: [
          select.stateIndicator[0],
          { slot: 'select-item', state: '[data-selected], .x', paint: 'background', tone: 1 },
        ],
      }),
    ).toEqual([
      'unknown key "stateIndicator[1].tone" (allowed: slot, state, paint)',
      '"stateIndicator[1]" state must be a selector suffix starting with ":" or "[" (for example "[data-selected]" or ":checked"), with no "," or braces',
      '"stateIndicator[1]" paint must be one of border, fill, highlight, mark, outline',
    ]);
  });

  test('accepts native states, nested inputs and at-rest rules, once each', () => {
    const control = {
      name: 'segmented-control',
      tier: 'client',
      interactive: ['segmented-control-item'],
      focusTarget: 'nested-input',
      stateIndicator: [
        { slot: 'segmented-control-item', state: ':has(> input:checked)', paint: 'outline' },
        { slot: 'segmented-control-input', paint: 'border' },
        { slot: 'segmented-control-input', state: ':checked', paint: 'fill' },
      ],
    };
    expect(config(control).stateIndicator).toHaveLength(3);
    const repeated = [...control.stateIndicator, control.stateIndicator[2]];
    expect(errors({ ...control, stateIndicator: repeated })).toEqual([
      '"stateIndicator" repeats segmented-control-input:checked (fill)',
    ]);
  });

  test('of an overlay lists the popup edge', () => {
    expect(errors({ ...select, stateIndicator: [select.stateIndicator[1]] })).toEqual([
      '"overlay": true needs { "slot": "select-popup", "paint": "border" } in "stateIndicator" (the popup\'s forced-colours edge)',
    ]);
  });
});

describe('adapter', () => {
  test('names a second adapter of an engine-tier component, in kebab case', () => {
    expect(config({ ...select, adapter: 'hooks' }).adapter).toBe('hooks');
    expect(errors({ ...select, adapter: 'Hooks' })).toEqual([
      expect.stringContaining('"adapter" must be a kebab-case name'),
    ]);
    expect(errors({ name: 'card', tier: 'server', adapter: 'hooks' })).toEqual([
      '"adapter" needs "tier": "engine"',
    ]);
  });
});
