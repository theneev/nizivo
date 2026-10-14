/**
 * The `component.json` schema (ARCHITECTURE.md §6), written as code so every error names the file,
 * the field and what was expected.
 */

export type Tier = 'server' | 'client' | 'engine' | 'own';

export interface FigmaIds {
  canonical?: string[];
  ghosts?: string[];
  variantsSeen?: string[];
  related?: string[];
}

export interface ComponentConfig {
  name: string;
  status: 'stable' | 'unstable';
  tier: Tier;
  engine?: string;
  overlay?: boolean;
  parts?: string[];
  exports?: string[];
  interactive?: string[];
  focusTarget?: 'self' | 'nested-input';
  stateIndicator?: string[];
  cssDeps?: string[];
  variants?: Record<string, string[]>;
  figma?: FigmaIds;
  budget?: { measuredKB?: number; limitKB?: number; source?: string };
}

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const FIGMA_ID = /^\d+:\d+$/;

const TIERS: readonly Tier[] = ['server', 'client', 'engine', 'own'];
const KEYS: readonly string[] = [
  '$schema',
  '$comment',
  'name',
  'status',
  'tier',
  'engine',
  'overlay',
  'adapter',
  'parts',
  'exports',
  'interactive',
  'focusTarget',
  'stateIndicator',
  'cssDeps',
  'variants',
  'figma',
  'budget',
];
const FIGMA_KEYS = ['canonical', 'ghosts', 'variantsSeen', 'related'] as const;
const BUDGET_KEYS: readonly string[] = ['measuredKB', 'limitKB', 'source'];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown, pattern?: RegExp): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'string' && (pattern === undefined || pattern.test(item)))
  );
}

function isTier(value: unknown): value is Tier {
  return TIERS.some((tier) => tier === value);
}

function isStatus(value: unknown): value is ComponentConfig['status'] {
  return value === 'stable' || value === 'unstable';
}

function isFocusTarget(value: unknown): value is NonNullable<ComponentConfig['focusTarget']> {
  return value === 'self' || value === 'nested-input';
}

function isVariants(value: unknown): value is Record<string, string[]> {
  return isRecord(value) && Object.values(value).every((values) => isStringArray(values));
}

function isFigmaKey(key: string): key is keyof FigmaIds {
  return FIGMA_KEYS.some((known) => known === key);
}

function duplicates(items: string[]): string[] {
  return items.filter((item, index) => items.indexOf(item) !== index);
}

/**
 * Validates parsed `component.json` content. `folder` is the component's folder name and `unstable`
 * says whether it sits under `src/unstable/`. Returns the typed config, or the list of problems.
 */
export function validateComponentConfig(
  raw: unknown,
  folder: string,
  unstable: boolean,
): { config: ComponentConfig } | { errors: string[] } {
  if (!isRecord(raw)) return { errors: ['must be a JSON object'] };
  const errors: string[] = [];
  const fail = (key: string, expected: string) => errors.push(`"${key}" must be ${expected}`);

  for (const key of Object.keys(raw)) {
    if (!KEYS.includes(key))
      errors.push(`unknown key "${key}" (allowed: ${KEYS.slice(2).join(', ')})`);
  }

  const { name, status = 'stable', tier, engine, overlay, adapter, parts, exports } = raw;
  if (typeof name !== 'string' || !KEBAB.test(name)) fail('name', 'a kebab-case string');
  else if (name !== folder)
    errors.push(`"name" is "${name}" but the folder is "${folder}"; they must match`);

  if (!isStatus(status)) fail('status', '"stable" or "unstable"');
  else if ((status === 'unstable') !== unstable) {
    errors.push(
      unstable
        ? '"status" must be "unstable" for a component under src/unstable/'
        : '"status" is "unstable" but the component is not under src/unstable/',
    );
  }

  if (!isTier(tier)) fail('tier', `one of ${TIERS.join(', ')}`);

  if (tier === 'engine') {
    if (typeof engine !== 'string' || !KEBAB.test(engine))
      fail('engine', 'a kebab-case engine name when "tier" is "engine"');
    if (!isStringArray(parts) || parts.length === 0)
      fail('parts', 'a non-empty array when "tier" is "engine"');
  } else if (engine !== undefined) {
    errors.push('"engine" is only allowed when "tier" is "engine"');
  }
  if (overlay !== undefined && typeof overlay !== 'boolean') fail('overlay', 'a boolean');
  if (overlay === true && tier !== 'engine') errors.push('"overlay": true needs "tier": "engine"');
  if (adapter !== undefined) {
    // A second adapter inside a family (the v0.2 hooks Tooltip) has no file layout in the plan yet.
    errors.push('"adapter" is not supported by nz gen yet (planned for the v0.2 Tooltip)');
  }

  if (parts !== undefined) {
    if (!isStringArray(parts, PASCAL)) fail('parts', 'an array of PascalCase part names');
    else if (duplicates(parts).length > 0)
      errors.push(`"parts" repeats ${duplicates(parts).join(', ')}`);
  }
  if (exports !== undefined) {
    if (!isStringArray(exports, IDENTIFIER) || exports.length === 0) {
      fail('exports', 'a non-empty array of export names');
    } else if (duplicates(exports).length > 0) {
      errors.push(`"exports" repeats ${duplicates(exports).join(', ')}`);
    }
  }

  for (const key of ['interactive', 'stateIndicator', 'cssDeps'] as const) {
    if (raw[key] !== undefined && !isStringArray(raw[key])) fail(key, 'an array of strings');
  }
  if (raw.focusTarget !== undefined && !isFocusTarget(raw.focusTarget)) {
    fail('focusTarget', '"self" or "nested-input"');
  }
  if (raw.variants !== undefined && !isVariants(raw.variants)) {
    fail('variants', 'an object mapping each prop to an array of string values');
  }
  const figma: FigmaIds = {};
  if (raw.figma !== undefined) {
    if (!isRecord(raw.figma)) fail('figma', 'an object');
    else {
      for (const [key, ids] of Object.entries(raw.figma)) {
        if (!isFigmaKey(key)) {
          errors.push(`unknown key "figma.${key}" (allowed: ${FIGMA_KEYS.join(', ')})`);
        } else if (!isStringArray(ids, FIGMA_ID)) {
          fail(`figma.${key}`, 'an array of Figma node ids like "7275:11438"');
        } else {
          figma[key] = ids;
        }
      }
    }
  }
  const budget: NonNullable<ComponentConfig['budget']> = {};
  if (raw.budget !== undefined) {
    if (!isRecord(raw.budget)) fail('budget', 'an object');
    else {
      const { measuredKB, limitKB, source, ...unknown } = raw.budget;
      for (const key of Object.keys(unknown)) {
        errors.push(`unknown key "budget.${key}" (allowed: ${BUDGET_KEYS.join(', ')})`);
      }
      if (typeof measuredKB === 'number') budget.measuredKB = measuredKB;
      else if (measuredKB !== undefined) fail('budget.measuredKB', 'a number');
      if (typeof limitKB === 'number') budget.limitKB = limitKB;
      else if (limitKB !== undefined) fail('budget.limitKB', 'a number');
      if (typeof source === 'string') budget.source = source;
      else if (source !== undefined) fail('budget.source', 'a string');
    }
  }

  if (errors.length > 0 || typeof name !== 'string' || !isStatus(status) || !isTier(tier)) {
    return { errors };
  }
  const config: ComponentConfig = { name, status, tier };
  if (typeof engine === 'string') config.engine = engine;
  if (typeof overlay === 'boolean') config.overlay = overlay;
  if (isStringArray(parts)) config.parts = parts;
  if (isStringArray(exports)) config.exports = exports;
  if (isStringArray(raw.interactive)) config.interactive = raw.interactive;
  if (isFocusTarget(raw.focusTarget)) config.focusTarget = raw.focusTarget;
  if (isStringArray(raw.stateIndicator)) config.stateIndicator = raw.stateIndicator;
  if (isStringArray(raw.cssDeps)) config.cssDeps = raw.cssDeps;
  if (isVariants(raw.variants)) config.variants = raw.variants;
  if (raw.figma !== undefined) config.figma = figma;
  if (raw.budget !== undefined) config.budget = budget;
  return { config };
}

/** `radio-group` → `RadioGroup`. */
export function pascalCase(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}
