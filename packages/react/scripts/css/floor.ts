// The browser floor (ARCHITECTURE.md §1 decision 4: Chrome/Edge 123, Firefox 129, Safari/iOS 17.5)
// as Lightning CSS targets, plus what the guard accepts where Lightning CSS cannot tell.
import type { Targets } from 'lightningcss';

const version = (major: number, minor = 0): number => (major << 16) | (minor << 8);

export const TARGETS: Targets = {
  chrome: version(123),
  edge: version(123),
  firefox: version(129),
  safari: version(17, 5),
  ios_saf: version(17, 5),
};

/**
 * Properties Lightning CSS 1.33 does not model (it keeps them as unknown declarations) that every
 * floor browser parses. Any other unknown property fails the build: add one here only after
 * checking Chrome 123, Firefox 129 and Safari 17.5.
 */
export const UNMODELLED_PROPERTIES: ReadonlySet<string> = new Set([
  'background-blend-mode',
  'border-collapse',
  'break-inside',
  'caption-side',
  'clear',
  'column-count',
  'columns',
  'contain',
  'contain-intrinsic-size',
  'content',
  'counter-increment',
  'counter-reset',
  'counter-set',
  'empty-cells',
  'float',
  'font-feature-settings',
  'font-kerning',
  'font-optical-sizing',
  'font-synthesis',
  'font-variant',
  'font-variant-ligatures',
  'font-variant-numeric',
  'font-variation-settings',
  // Safari has no forced-colours mode; the property only acts inside @media (forced-colors: active)
  'forced-color-adjust',
  'hyphenate-character',
  'isolation',
  'object-fit',
  'object-position',
  'outline-offset',
  'overscroll-behavior',
  'overscroll-behavior-block',
  'overscroll-behavior-inline',
  'paint-order',
  'pointer-events',
  'quotes',
  'scroll-behavior',
  'scroll-snap-align',
  'scroll-snap-stop',
  'scroll-snap-type',
  'shape-outside',
  'table-layout',
  'text-underline-offset',
  'text-underline-position',
  'text-wrap',
  'touch-action',
  'transition-behavior',
  'vector-effect',
  'white-space-collapse',
  'will-change',
  'writing-mode',
  'zoom',
  '-webkit-box-orient',
  '-webkit-font-smoothing',
  '-webkit-line-clamp',
  '-webkit-tap-highlight-color',
  '-moz-osx-font-smoothing',
]);

/**
 * Properties beyond the floor that a stylesheet may use only inside `@supports (<property>: …)` (not
 * under `not`), as an enhancement over a floor fallback outside the block: Textarea's auto-grow,
 * `field-sizing: content` (Chrome 123 has it; Firefox 129 and Safari 17.5 keep `rows`).
 */
export const SUPPORTS_GATED_PROPERTIES: ReadonlySet<string> = new Set(['field-sizing']);

/** Properties Lightning CSS models that at least one floor browser does not support. */
export const OFF_FLOOR_PROPERTIES: ReadonlySet<string> = new Set([
  'animation-range',
  'animation-range-end',
  'animation-range-start',
  'animation-timeline',
  'view-transition-class',
  'view-transition-name',
]);

/**
 * Functions the floor parses, for values Lightning CSS keeps as tokens (anything with var(), and
 * values it cannot type). It evaluates the static ones itself (round(), rgb(from …)).
 */
export const FUNCTIONS: ReadonlySet<string> = new Set([
  'var',
  'env',
  'calc',
  'min',
  'max',
  'clamp',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'light-dark',
  'color-mix',
  'rgb',
  'rgba',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'color',
  'linear',
  'cubic-bezier',
  'steps',
  'translate',
  'translatex',
  'translatey',
  'translatez',
  'translate3d',
  'scale',
  'scalex',
  'scaley',
  'scalez',
  'scale3d',
  'rotate',
  'rotatex',
  'rotatey',
  'rotatez',
  'rotate3d',
  'skew',
  'skewx',
  'skewy',
  'matrix',
  'matrix3d',
  'perspective',
  'linear-gradient',
  'radial-gradient',
  'conic-gradient',
  'repeating-linear-gradient',
  'repeating-radial-gradient',
  'repeating-conic-gradient',
  'url',
  'image-set',
  'blur',
  'brightness',
  'contrast',
  'drop-shadow',
  'grayscale',
  'hue-rotate',
  'invert',
  'opacity',
  'saturate',
  'sepia',
  'minmax',
  'repeat',
  'fit-content',
  'counter',
  'counters',
  'format',
  'local',
  'inset',
  'circle',
  'ellipse',
  'polygon',
  'path',
  'rect',
  'xywh',
]);

/** Rule types allowed inside a layer block. */
export const RULES: ReadonlySet<string> = new Set([
  'style',
  'nested-declarations',
  'media',
  'supports',
  'container',
  'keyframes',
  'starting-style',
  'property',
  'font-face',
  'font-palette-values',
  'counter-style',
]);

/** Pseudo-classes and pseudo-elements Lightning CSS parses that the floor does not. */
export const OFF_FLOOR_PSEUDOS: ReadonlySet<string> = new Set([
  'open',
  'state',
  'target-text',
  'picker',
  'details-content',
  'highlight',
  'spelling-error',
  'grammar-error',
  'view-transition',
  'view-transition-group',
  'view-transition-image-pair',
  'view-transition-old',
  'view-transition-new',
]);

/**
 * Vendor pseudo-elements and pseudo-classes that paint native controls. Each engine parses only its
 * own, so the guard requires a rule of its own for each.
 */
export const VENDOR_PSEUDO_ELEMENTS: ReadonlySet<string> = new Set([
  '-webkit-progress-bar',
  '-webkit-progress-value',
  '-moz-progress-bar',
  '-webkit-meter-bar',
  '-webkit-meter-optimum-value',
  '-webkit-meter-suboptimum-value',
  '-webkit-meter-even-less-good-value',
  '-moz-meter-bar',
  '-webkit-inner-spin-button',
  '-webkit-outer-spin-button',
  '-webkit-search-cancel-button',
  '-webkit-search-decoration',
  '-webkit-details-marker',
  '-webkit-calendar-picker-indicator',
]);

export const VENDOR_PSEUDO_CLASSES: ReadonlySet<string> = new Set([
  '-moz-meter-optimum',
  '-moz-meter-sub-optimum',
  '-moz-meter-sub-sub-optimum',
]);
