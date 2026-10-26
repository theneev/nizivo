// Selectors use only the data-* vocabulary (§8.3): contracts/vocabulary.json, with the values of
// data-variant, data-size and data-tone from the component's own manifest. Native overlay state is
// never public (§8.3 rule 2).
import selectorParser from 'postcss-selector-parser';
import {
  attributeProblem,
  componentOf,
  DISCLOSURE_PARTS,
  loadComponents,
  loadVocabulary,
  NATIVE_OVERLAY_STATE,
} from '../contract.js';
import { createRule, fileOf } from './shared.js';

/** Whether a compound selector puts this node on a native `<details>` part (DISCLOSURE_PARTS). */
function onDisclosurePart(/** @type {import('postcss-selector-parser').Node} */ node) {
  for (const step of ['prev', 'next']) {
    for (let sibling = node[step](); sibling !== undefined; sibling = sibling[step]()) {
      if (sibling.type === 'combinator') break;
      if (sibling.type === 'class' && DISCLOSURE_PARTS.has(sibling.value)) return true;
    }
  }
  return false;
}

export default createRule('vocabulary', (root, report) => {
  const vocabulary = loadVocabulary();
  const components = loadComponents();
  const component = componentOf(fileOf(root), components);

  root.walkRules((rule) => {
    // keyframe selectors (from, to, 50%) are not element selectors
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    selectorParser((selectors) => {
      selectors.walkAttributes((attribute) => {
        const name = attribute.attribute;
        if (name === 'open') {
          if (!onDisclosurePart(attribute)) {
            report(
              rule,
              '[open] is native overlay state: select [data-open] (§8.3 rule 2)',
              '[open',
            );
          }
          return;
        }
        const problem = attributeProblem(
          { name, operator: attribute.operator, value: attribute.value },
          { vocabulary, components, component },
        );
        if (problem !== undefined) report(rule, problem, name);
      });
      selectors.walkPseudos((pseudo) => {
        const name = pseudo.value.toLowerCase();
        if (NATIVE_OVERLAY_STATE.has(name)) {
          report(
            rule,
            `${name} is native overlay state: select the data-* vocabulary (data-open, data-entering, data-exiting; §8.3 rule 2)`,
            name,
          );
        }
      });
    }).processSync(rule.selector);
  });
});
