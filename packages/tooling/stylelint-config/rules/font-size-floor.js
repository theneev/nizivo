// The type floor (§8.4, §15.1, decision 8c): no font size below 12 px (0.75rem), and 12 px only
// through the Body/S and Label/S tokens, never as a literal.
import valueParser from 'postcss-value-parser';
import { createRule } from './shared.js';

const FLOOR_PX = 12;
const WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);
const SIZE_KEYWORDS = new Set([
  'small',
  'medium',
  'large',
  'x-large',
  'xx-large',
  'xxx-large',
  'larger',
]);
const BELOW_FLOOR_KEYWORDS = new Set(['xx-small', 'x-small', 'smaller']);
const SYSTEM_FONTS = new Set([
  'caption',
  'icon',
  'menu',
  'message-box',
  'small-caption',
  'status-bar',
]);
const MATH = new Set(['calc', 'min', 'max', 'clamp']);

/**
 * Why a font size breaks the floor, or undefined. `node` is the size: a word (a dimension or a
 * keyword) or a function.
 *
 * @param {import('postcss-value-parser').Node} node
 */
function sizeProblem(node) {
  if (node.type === 'function') {
    if (node.value.toLowerCase() === 'var') return undefined;
    if (MATH.has(node.value.toLowerCase())) {
      return `${node.value}() hides the size from the 12 px floor check: use a font token or a rem value (§8.4)`;
    }
    return undefined;
  }
  if (node.type !== 'word') return undefined;
  const word = node.value.toLowerCase();
  if (WIDE_KEYWORDS.has(word) || SIZE_KEYWORDS.has(word)) return undefined;
  if (BELOW_FLOOR_KEYWORDS.has(word)) return `"${word}" can fall below the 12 px floor (§8.4)`;
  const dimension = valueParser.unit(word);
  if (dimension === false) return undefined;
  const number = Number(dimension.number);
  const unit = dimension.unit.toLowerCase();
  const px = unit === 'px' ? number : unit === 'rem' ? number * 16 : undefined;
  if (px !== undefined) {
    if (px < FLOOR_PX) return `font size ${word} is below the 12 px (0.75rem) floor (§8.4)`;
    if (px === FLOOR_PX) {
      return `12 px only through var(--nz-font-body-s) or var(--nz-font-label-s), never as ${word} (§8.4)`;
    }
    return undefined;
  }
  if (unit === 'em' || unit === '%') {
    const ratio = unit === '%' ? number / 100 : number;
    return ratio < 1 ? `relative size ${word} can fall below the 12 px floor (§8.4)` : undefined;
  }
  return `"${word}": write a font size in rem or through a font token, so the 12 px floor can be checked (§8.4)`;
}

/** The size in a `font` shorthand: the first dimension, percentage or size keyword. */
function shorthandSize(/** @type {string} */ value) {
  return valueParser(value).nodes.find((node) => {
    if (node.type === 'function') return MATH.has(node.value.toLowerCase());
    if (node.type !== 'word') return false;
    const word = node.value.toLowerCase();
    if (SIZE_KEYWORDS.has(word) || BELOW_FLOOR_KEYWORDS.has(word)) return true;
    const dimension = valueParser.unit(word);
    return dimension !== false && dimension.unit !== '';
  });
}

export default createRule('font-size-floor', (root, report) => {
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (prop === 'font-size') {
      const nodes = valueParser(decl.value).nodes.filter((node) => node.type !== 'space');
      const size = nodes.length === 1 ? nodes[0] : undefined;
      const problem =
        size === undefined
          ? 'write one font size: a font token or a rem value (§8.4)'
          : sizeProblem(size);
      if (problem !== undefined) report(decl, problem);
    } else if (prop === 'font') {
      const value = decl.value.trim().toLowerCase();
      if (SYSTEM_FONTS.has(value)) {
        report(
          decl,
          `system font "${value}" can fall below the 12 px floor: use a font token (§8.4)`,
        );
        return;
      }
      const size = shorthandSize(decl.value);
      const problem = size === undefined ? undefined : sizeProblem(size);
      if (problem !== undefined) report(decl, problem);
    }
  });
});
