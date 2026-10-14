// @nizivo/stylelint-config: week 1 keeps this minimal. The contract rules from ARCHITECTURE.md §8.4
// (contract.json names, no hook declarations, layer line first, spring pairing, font-size floor) land in week 2.

/** @type {import('stylelint').Config} */
const config = {
  plugins: ['stylelint-use-logical'],
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
    // Public hooks and tokens are --nz-*, privates are --_nz-* (§8.2).
    'custom-property-pattern': [
      '^_?nz(-[a-z0-9]+)+$',
      { message: (name) => `Expected custom property "${name}" to be --nz-* or --_nz-* (§8.2)` },
    ],
  },
};

export default config;
