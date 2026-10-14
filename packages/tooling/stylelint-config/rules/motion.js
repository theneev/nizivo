// Motion rules (§13.2): a spring easing travels with its own derived duration, only on transform,
// scale, translate or rotate; infinite loops run only on --nz-duration-pulse or --nz-duration-spin.
import { createRule, itemVars, listItems } from './shared.js';

const SPRING_EASING = /^--nz-easing-spring(-soft)?$/;
const SPRING_PROPERTIES = new Set(['transform', 'scale', 'translate', 'rotate']);
const LOOP_DURATIONS = new Set(['--nz-duration-pulse', '--nz-duration-spin']);

/** The transitioned property of a `transition` item: its first plain word. */
function transitionProperty(/** @type {import('postcss-value-parser').Node[]} */ item) {
  return item.find((node) => node.type === 'word')?.value.toLowerCase();
}

export const springPairing = createRule('spring-pairing', (root, report) => {
  root.walkDecls((decl) => {
    if (!/--nz-easing-spring/.test(decl.value)) return;
    const prop = decl.prop.toLowerCase();
    if (prop !== 'transition') {
      report(
        decl,
        'write a spring easing in a `transition` item next to its own --nz-duration-spring* (§13.2 rule 1)',
        '--nz-easing-spring',
      );
      return;
    }
    for (const item of listItems(decl.value)) {
      const vars = itemVars(item);
      for (const easing of vars.filter((name) => SPRING_EASING.test(name))) {
        const duration = easing.replace('--nz-easing-', '--nz-duration-');
        if (!vars.includes(duration)) {
          report(
            decl,
            `${easing} must travel with var(${duration}) in the same item (§13.2 rule 1)`,
            easing,
          );
        }
        const property = transitionProperty(item);
        if (property === undefined || !SPRING_PROPERTIES.has(property)) {
          report(
            decl,
            `${easing} animates only transform, scale, translate or rotate, not "${property ?? 'all'}" (§13.2 rule 1)`,
            easing,
          );
        }
      }
    }
  });
});

/** @param {string} value */
const isInfinite = (value) => /(^|[\s,])infinite($|[\s,])/i.test(value);

export const infiniteAnimation = createRule('infinite-animation', (root, report) => {
  const message =
    'an infinite animation runs only on var(--nz-duration-pulse) or var(--nz-duration-spin), so Reduced mode can stop it (§13.2)';
  root.walkDecls((decl) => {
    const prop = decl.prop.toLowerCase();
    if (prop === 'animation') {
      for (const item of listItems(decl.value)) {
        const infinite = item.some(
          (node) => node.type === 'word' && node.value.toLowerCase() === 'infinite',
        );
        if (infinite && !itemVars(item).some((name) => LOOP_DURATIONS.has(name))) {
          report(decl, message, 'infinite');
        }
      }
    } else if (prop === 'animation-iteration-count' && isInfinite(decl.value)) {
      const counts = listItems(decl.value);
      const durationDecl = decl.parent?.nodes?.findLast(
        (node) => node.type === 'decl' && node.prop.toLowerCase() === 'animation-duration',
      );
      const durations = durationDecl?.type === 'decl' ? listItems(durationDecl.value) : [];
      counts.forEach((count, index) => {
        if (!count.some((node) => node.type === 'word' && node.value.toLowerCase() === 'infinite'))
          return;
        const duration = durations[index % Math.max(durations.length, 1)];
        if (
          duration === undefined ||
          !itemVars(duration).some((name) => LOOP_DURATIONS.has(name))
        ) {
          report(decl, message, 'infinite');
        }
      });
    }
  });
});
