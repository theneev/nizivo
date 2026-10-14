/**
 * The `component.json` schema (ARCHITECTURE.md §6), written as code so every error names the file,
 * the field and what was expected. packages/tooling/gen/COMPONENT-JSON.md is the field reference.
 */

/** §9.5 tiers: T0 server-safe (incl. split), T0 in thin client leaves, T1 engine, T2 own code. */
export type Tier = 'server' | 'client' | 'engine' | 'own';

/** How an `interactive` slot shows the nz.base focus outline (§8.5). */
export type FocusTarget = 'self' | 'nested-input' | 'within';

/** The forced-colours rule nz.base paints for a `stateIndicator` entry (§8.5, §15.1). */
export type Paint = 'border' | 'fill' | 'highlight' | 'mark' | 'outline';

export interface StateIndicator {
  /** A documented slot: its `data-slot` value, which is the class minus `nz-`. */
  slot: string;
  /** Selector suffix for the state (`[data-selected]`, `:checked`); absent for an at-rest rule. */
  state?: string;
  paint: Paint;
}

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
  /** `data-slot` values of the parts that get the nz.base focus outline and `touch-action`. */
  interactive?: string[];
  /** One mode for every interactive slot, or one per slot; "self" when absent. */
  focusTarget?: FocusTarget | Record<string, FocusTarget>;
  stateIndicator?: StateIndicator[];
  cssDeps?: string[];
  variants?: Record<string, string[]>;
  figma?: FigmaIds;
  budget?: { measuredKB?: number; limitKB?: number; source?: string };
}

const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const PASCAL = /^[A-Z][A-Za-z0-9]*$/;
const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const FIGMA_ID = /^\d+:\d+$/;
/** A compound-selector suffix: starts with `:` or `[`, and no list, block or declaration syntax. */
const STATE = /^[:[][^,{};]*$/;

const TIERS: readonly Tier[] = ['server', 'client', 'engine', 'own'];
const FOCUS_TARGETS: readonly FocusTarget[] = ['self', 'nested-input', 'within'];
const PAINTS: readonly Paint[] = ['border', 'fill', 'highlight', 'mark', 'outline'];
const INDICATOR_KEYS: readonly string[] = ['slot', 'state', 'paint'];
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

function isFocusTarget(value: unknown): value is FocusTarget {
  return FOCUS_TARGETS.some((target) => target === value);
}

function isFocusTargetMap(value: unknown): value is Record<string, FocusTarget> {
  return isRecord(value) && Object.values(value).every(isFocusTarget);
}

function isPaint(value: unknown): value is Paint {
  return PAINTS.some((paint) => paint === value);
}

/** `ProgressBar` → `progress-bar`. */
export function kebabCase(pascal: string): string {
  return pascal.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * The slot prefixes a component may use: its name, plus each `exports` member for a family subpath
 * (`progress` lists Meter, so `meter-fill` is one of its slots).
 */
export function slotPrefixes(name: string, exports: readonly string[] = []): string[] {
  return [...new Set([name, ...exports.map(kebabCase)])];
}

/** The focus mode of one interactive slot: its map entry, the shared mode, or "self". */
export function focusTargetOf(config: ComponentConfig, slot: string): FocusTarget {
  const { focusTarget } = config;
  if (focusTarget === undefined) return 'self';
  return typeof focusTarget === 'string' ? focusTarget : (focusTarget[slot] ?? 'self');
}

type A11yFields = Pick<ComponentConfig, 'interactive' | 'focusTarget' | 'stateIndicator'>;

/**
 * `interactive`, `focusTarget` and `stateIndicator`, the inputs of the generated nz.base selector
 * lists (§8.5). Each slot is a full `data-slot` value of this component.
 */
function validateA11y(
  raw: Record<string, unknown>,
  prefixes: string[],
  overlayPopup: string | undefined,
  errors: string[],
): A11yFields {
  const fields: A11yFields = {};
  const expected = prefixes.map((prefix) => `"${prefix}"`).join(' or ');
  const badSlot = (where: string, slot: unknown): boolean => {
    const ok =
      typeof slot === 'string' &&
      KEBAB.test(slot) &&
      prefixes.some((prefix) => slot === prefix || slot.startsWith(`${prefix}-`));
    if (!ok) {
      errors.push(
        `${where} ${JSON.stringify(slot)} is not a data-slot of this component (expected ${expected}, alone or followed by "-<part>")`,
      );
    }
    return !ok;
  };

  const { interactive, focusTarget, stateIndicator } = raw;
  if (interactive !== undefined) {
    if (!Array.isArray(interactive)) {
      errors.push('"interactive" must be an array of data-slot values');
    } else {
      let bad = false;
      for (const slot of interactive) if (badSlot('"interactive":', slot)) bad = true;
      if (!bad && isStringArray(interactive)) {
        if (duplicates(interactive).length > 0) {
          errors.push(`"interactive" repeats ${duplicates(interactive).join(', ')}`);
        } else {
          fields.interactive = interactive;
        }
      }
    }
  }

  if (focusTarget !== undefined) {
    const slots = isStringArray(interactive) ? interactive : [];
    if (slots.length === 0) {
      errors.push('"focusTarget" needs at least one "interactive" slot');
    } else if (isFocusTarget(focusTarget)) {
      fields.focusTarget = focusTarget;
    } else if (isFocusTargetMap(focusTarget)) {
      const keys = Object.keys(focusTarget);
      const missing = slots.filter((slot) => !keys.includes(slot));
      const extra = keys.filter((key) => !slots.includes(key));
      if (missing.length > 0 || extra.length > 0) {
        const detail = [
          missing.length > 0 ? `missing ${missing.join(', ')}` : '',
          extra.length > 0 ? `not interactive: ${extra.join(', ')}` : '',
        ];
        errors.push(
          `"focusTarget" must map exactly the "interactive" slots (${detail.filter(Boolean).join('; ')})`,
        );
      } else {
        fields.focusTarget = focusTarget;
      }
    } else {
      const modes = FOCUS_TARGETS.map((mode) => `"${mode}"`).join(', ');
      errors.push(
        `"focusTarget" must be one of ${modes}, or an object mapping each "interactive" slot to one`,
      );
    }
  }

  if (stateIndicator !== undefined) {
    if (!Array.isArray(stateIndicator)) {
      errors.push('"stateIndicator" must be an array of { "slot", "state"?, "paint" } objects');
    } else {
      const indicators: StateIndicator[] = [];
      for (const [index, entry] of stateIndicator.entries()) {
        const at = `"stateIndicator[${index}]"`;
        if (!isRecord(entry)) {
          errors.push(`${at} must be an object { "slot", "state"?, "paint" }`);
          continue;
        }
        let ok = true;
        for (const key of Object.keys(entry)) {
          if (!INDICATOR_KEYS.includes(key)) {
            errors.push(
              `unknown key "stateIndicator[${index}].${key}" (allowed: ${INDICATOR_KEYS.join(', ')})`,
            );
            ok = false;
          }
        }
        const { slot, state, paint } = entry;
        if (badSlot(`${at} slot`, slot)) ok = false;
        if (state !== undefined && (typeof state !== 'string' || !STATE.test(state))) {
          errors.push(
            `${at} state must be a selector suffix starting with ":" or "[" (for example "[data-selected]" or ":checked"), with no "," or braces`,
          );
          ok = false;
        }
        if (!isPaint(paint)) {
          errors.push(`${at} paint must be one of ${PAINTS.join(', ')}`);
          ok = false;
        }
        if (ok && typeof slot === 'string' && isPaint(paint)) {
          indicators.push(typeof state === 'string' ? { slot, state, paint } : { slot, paint });
        }
      }
      const seen = new Set<string>();
      for (const { slot, state = '', paint } of indicators) {
        const key = `${slot}${state} ${paint}`;
        if (seen.has(key)) errors.push(`"stateIndicator" repeats ${slot}${state} (${paint})`);
        seen.add(key);
      }
      if (indicators.length === stateIndicator.length) fields.stateIndicator = indicators;
    }
  }

  // An overlay popup's edge is a shadow, which forced colours drop, so it must be listed (§8.5).
  if (overlayPopup !== undefined) {
    const listed = Array.isArray(stateIndicator)
      ? stateIndicator.some(
          (entry) =>
            isRecord(entry) &&
            entry.slot === overlayPopup &&
            entry.paint === 'border' &&
            entry.state === undefined,
        )
      : false;
    if (!listed) {
      errors.push(
        `"overlay": true needs { "slot": "${overlayPopup}", "paint": "border" } in "stateIndicator" (the popup's forced-colours edge)`,
      );
    }
  }
  return fields;
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

  // Slots derive from the folder, which "name" must equal, so a bad name reports once.
  const prefixes = slotPrefixes(folder, isStringArray(exports, IDENTIFIER) ? exports : []);
  const overlayPopup = overlay === true ? `${folder}-popup` : undefined;
  const a11y = validateA11y(raw, prefixes, overlayPopup, errors);
  if (raw.cssDeps !== undefined && !isStringArray(raw.cssDeps))
    fail('cssDeps', 'an array of strings');
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
  Object.assign(config, a11y);
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
