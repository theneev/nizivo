// Every file starts with the canonical layer statement and writes into its own layer (§8.1, §8.4).
import { expectedLayers, layerNames, layerStatement } from '../contract.js';
import { createRule, fileOf } from './shared.js';

export default createRule('layer-discipline', (root, report, options) => {
  const statement = layerStatement();
  const canonical = layerNames(statement).join(', ');
  const layers = typeof options.layer === 'string' ? [options.layer] : expectedLayers(fileOf(root));
  const layer = layers.join(' or @layer ');
  const nodes = root.nodes.filter((node) => node.type !== 'comment');

  const first = nodes[0];
  const isStatement =
    first?.type === 'atrule' &&
    first.name === 'layer' &&
    first.nodes === undefined &&
    layerNames(`@layer ${first.params};`).join(', ') === canonical;
  if (!isStatement) {
    report(
      first ?? root,
      `the file must start with the canonical layer statement: ${statement} (§8.1)`,
    );
  }

  for (const node of nodes.slice(isStatement ? 1 : 0)) {
    if (node.type !== 'atrule' || node.name !== 'layer' || node.nodes === undefined) {
      report(
        node,
        `wrap every rule in @layer ${layer} { … }: unlayered CSS beats every nz.* layer (§8.1)`,
      );
    } else if (!layers.includes(node.params.trim())) {
      report(
        node,
        `this file writes into @layer ${layer} only, not "${node.params.trim()}" (§8.1)`,
      );
    }
    if (node.type === 'atrule' && node.nodes !== undefined) {
      node.walkAtRules('layer', (inner) => {
        report(inner, 'no nested @layer: the canonical statement fixes every layer (§8.1)');
      });
    }
  }
});
