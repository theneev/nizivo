// Helpers shared by the Nizivo stylelint rules.
import stylelint from 'stylelint';
import valueParser from 'postcss-value-parser';

/** @typedef {import('postcss').Root} Root */
/** @typedef {import('postcss-value-parser').Node} ValueNode */

export const NAMESPACE = 'nizivo';

/**
 * Creates a rule that takes `true` (and optional secondary options) and reports one message shape.
 *
 * @typedef {(node: import('postcss').Node, message: string, word?: string) => void} Report
 * @param {string} name
 * @param {(root: Root, report: Report, options: Record<string, unknown>) => void} check
 */
export function createRule(name, check) {
  const ruleName = `${NAMESPACE}/${name}`;
  const messages = stylelint.utils.ruleMessages(ruleName, {
    rejected: (/** @type {string} */ message) => message,
  });
  /** @type {import('stylelint').Rule} */
  const rule = (primary, secondary) => (root, result) => {
    const valid = stylelint.utils.validateOptions(result, ruleName, {
      actual: primary,
      possible: [true],
    });
    if (!valid) return;
    const options = typeof secondary === 'object' && secondary !== null ? secondary : {};
    check(
      root,
      (node, message, word) =>
        stylelint.utils.report({
          ruleName,
          result,
          node,
          message: messages.rejected(message),
          ...(word === undefined ? {} : { word }),
        }),
      options,
    );
  };
  rule.ruleName = ruleName;
  rule.messages = messages;
  rule.meta = {
    url: 'https://github.com/theneev/nizivo/blob/main/docs/ARCHITECTURE.md#84-component-css-hooks',
  };
  return stylelint.createPlugin(ruleName, rule);
}

/** The linted file's path with forward slashes, or '' for code without a file name. */
export function fileOf(/** @type {Root} */ root) {
  return (root.source?.input.file ?? '').replaceAll('\\', '/');
}

/** Theme logic and primitives are allowed only inside @nizivo/tokens (§7.2, §8.4). */
export function inTokensPackage(/** @type {string} */ file) {
  return file.includes('/packages/tokens/');
}

/**
 * Every `var()` in a value, nested fallbacks included.
 *
 * @param {string} value
 * @returns {{ name: string; hasFallback: boolean }[]}
 */
export function varReads(value) {
  /** @type {{ name: string; hasFallback: boolean }[]} */
  const reads = [];
  valueParser(value).walk((node) => {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'var') return;
    const first = node.nodes.find((child) => child.type === 'word');
    if (first === undefined) return;
    reads.push({
      name: first.value,
      hasFallback: node.nodes.some((child) => child.type === 'div' && child.value === ','),
    });
  });
  return reads;
}

/**
 * Splits a comma-separated list (a `transition` or `animation` value) into its items.
 *
 * @param {string} value
 * @returns {ValueNode[][]}
 */
export function listItems(value) {
  /** @type {ValueNode[][]} */
  const items = [[]];
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') items.push([]);
    else items.at(-1)?.push(node);
  }
  return items;
}

/**
 * The names of the `var()`s in a list item, nested fallbacks included.
 *
 * @param {ValueNode[]} item
 */
export function itemVars(item) {
  /** @type {string[]} */
  const names = [];
  valueParser.walk(item, (node) => {
    if (node.type !== 'function' || node.value.toLowerCase() !== 'var') return;
    const first = node.nodes.find((child) => child.type === 'word');
    if (first !== undefined) names.push(first.value);
  });
  return names;
}
