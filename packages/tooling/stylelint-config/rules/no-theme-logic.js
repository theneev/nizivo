// Theme logic lives only in @nizivo/tokens (§7.4, §8.4): components read semantic tokens, which
// already resolve per scope.
import selectorParser from 'postcss-selector-parser';
import { createRule, fileOf, inTokensPackage } from './shared.js';

export default createRule('no-theme-logic', (root, report) => {
  if (inTokensPackage(fileOf(root))) return;
  root.walkDecls((decl) => {
    if (/\blight-dark\(/i.test(decl.value)) {
      report(
        decl,
        'light-dark() belongs in @nizivo/tokens: read a semantic token (§7.4)',
        'light-dark(',
      );
    }
  });
  root.walkAtRules((atRule) => {
    if (/prefers-color-scheme/i.test(atRule.params)) {
      report(
        atRule,
        'prefers-color-scheme belongs in @nizivo/tokens: tokens resolve per scope (§7.4)',
      );
    }
  });
  root.walkRules((rule) => {
    selectorParser((selectors) => {
      selectors.walkAttributes((attribute) => {
        if (attribute.attribute === 'data-nz-theme') {
          report(
            rule,
            '[data-nz-theme] belongs in @nizivo/tokens: tokens resolve per scope (§7.4)',
          );
        }
      });
    }).processSync(rule.selector);
  });
});
