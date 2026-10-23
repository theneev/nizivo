// A pattern's stylesheet is copied into an app and owned there, so it keeps the CSS contract of the
// packages (logical properties, tokens only, no !important) with its own namespace and layer:
// classes are nzp-<pattern>[-<part>], never a package's nz-*, and every rule is in nz.patterns,
// the layer reserved for registry items and app pattern CSS (ARCHITECTURE.md §8.1).
/** @type {import('stylelint').Config} */
export default {
  extends: ['@nizivo/stylelint-config'],
  rules: {
    'selector-class-pattern': [
      '^nzp(-[a-z0-9]+)+$',
      { message: (selector) => `Expected class "${selector}" to match nzp-<pattern>[-<part>]` },
    ],
    'keyframes-name-pattern': [
      '^nzp(-[a-z0-9]+)+$',
      { message: (name) => `Expected keyframes "${name}" to match nzp-<pattern>-<name>` },
    ],
    'nizivo/layer-discipline': [true, { layer: 'nz.patterns' }],
  },
};
