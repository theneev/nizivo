// Custom properties (§8.2, §8.4): shipped CSS declares only --_nz-* privates, and reads only tokens
// that exist, runtime variables, its own hooks (with a fallback) and privates it declares.
import {
  componentOf,
  loadComponents,
  loadContractTokens,
  SURFACE_VARIABLES,
  variableProblem,
} from '../contract.js';
import { createRule, fileOf, inTokensPackage, varReads } from './shared.js';

/** @type {ReadonlySet<string> | undefined | null} null until first loaded */
let contractTokens = null;

export const noPublicDeclarations = createRule('no-public-declarations', (root, report) => {
  const file = fileOf(root);
  if (inTokensPackage(file)) return;
  const component = componentOf(file, loadComponents())?.name;
  root.walkDecls(/^--nz-/, (decl) => {
    // a surface variable is declared by its one component's stylesheet (M42 item 6)
    const owner = SURFACE_VARIABLES.get(decl.prop);
    if (owner !== undefined && owner === component) return;
    report(
      decl,
      `"${decl.prop}" is public: hooks are read, never assigned, and tokens live in @nizivo/tokens; declare a --_nz-* private instead (§8.4)`,
      decl.prop,
    );
  });
});

export const customPropertyReads = createRule('custom-property-reads', (root, report, options) => {
  const file = fileOf(root);
  if (inTokensPackage(file)) return;
  if (contractTokens === null) contractTokens = loadContractTokens();
  const tokens = Array.isArray(options.tokens) ? new Set(options.tokens) : contractTokens;
  const component = componentOf(file, loadComponents());

  /** @type {Set<string>} */
  const declared = new Set();
  root.walkDecls(/^--_nz-/, (decl) => {
    declared.add(decl.prop);
  });

  root.walkDecls((decl) => {
    for (const read of varReads(decl.value)) {
      if (read.name.startsWith('--_nz-')) {
        if (!declared.has(read.name)) {
          report(decl, `private "${read.name}" is never declared in this file (§8.2)`, read.name);
        }
        continue;
      }
      const problem = variableProblem(read, { component, tokens });
      if (problem !== undefined) report(decl, problem, read.name);
    }
  });
});
