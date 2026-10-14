// @nizivo/stylelint-config: the CSS contract rules from ARCHITECTURE.md §8.4 and §4.1 L2–L3,
// applied to every stylesheet Nizivo ships. contract.js holds the data they share with
// @nizivo/react's emitted-CSS check.
import useLogical from 'stylelint-use-logical';
import { customPropertyReads, noPublicDeclarations } from './rules/custom-properties.js';
import fontSizeFloor from './rules/font-size-floor.js';
import layerDiscipline from './rules/layer-discipline.js';
import { infiniteAnimation, springPairing } from './rules/motion.js';
import noThemeLogic from './rules/no-theme-logic.js';
import vocabulary from './rules/vocabulary.js';

/** @type {import('stylelint').Config} */
const config = {
  // plugin objects, not names, so a config passed to stylelint's API resolves from anywhere
  plugins: [
    useLogical,
    layerDiscipline,
    noPublicDeclarations,
    customPropertyReads,
    noThemeLogic,
    vocabulary,
    springPairing,
    infiniteAnimation,
    fontSizeFloor,
  ],
  rules: {
    // Logical properties only, from the first commit (§16.4).
    'csstools/use-logical': 'always',
    // Root and part classes: nz-<component>[-<part>], kebab-case, no BEM separators (§8.2).
    'selector-class-pattern': [
      '^nz(-[a-z0-9]+)+$',
      {
        message: (selector) =>
          `Expected class "${selector}" to match nz-<component>[-<part>] (§8.2)`,
      },
    ],
    // Keyframe names are global: an unprefixed `spin` would clash with a consumer's or Tailwind's.
    'keyframes-name-pattern': [
      '^nz(-[a-z0-9]+)+$',
      {
        message: (name) =>
          `Expected keyframes "${name}" to match nz-<component>-<name>: keyframe names are global (§8.2)`,
      },
    ],
    // Public hooks and tokens are --nz-*, privates are --_nz-* (§8.2).
    'custom-property-pattern': [
      '^_?nz(-[a-z0-9]+)+$',
      { message: (name) => `Expected custom property "${name}" to be --nz-* or --_nz-* (§8.2)` },
    ],
    // Unlayered consumer CSS already beats every nz.* layer (§8.1).
    'declaration-no-important': true,
    'keyframe-declaration-no-important': true,
    'nizivo/layer-discipline': true,
    'nizivo/no-public-declarations': true,
    'nizivo/custom-property-reads': true,
    'nizivo/no-theme-logic': true,
    'nizivo/vocabulary': true,
    'nizivo/spring-pairing': true,
    'nizivo/infinite-animation': true,
    'nizivo/font-size-floor': true,
  },
};

export default config;
