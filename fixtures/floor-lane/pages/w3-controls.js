// Week 3 controls on the floor (ARCHITECTURE.md §21.1 exit criterion 6, §16.1): the shipped
// stylesheets on the components' server HTML. Each check reads computed style, so it shows whether
// the floor browser applied the rule, not only whether it parsed.
const $ = (selector) => document.querySelector(selector);
const style = (selector) => getComputedStyle($(selector));
const px = (value) => Number.parseFloat(value);
const near = (a, b, tolerance = 0.5) => Math.abs(a - b) <= tolerance;

// A token's computed colour in the controls' scope, through a probe element.
function token(name, property = 'background-color') {
  const probe = document.createElement('div');
  probe.style.setProperty(property, `var(--nz-${name})`);
  $('#controls').append(probe);
  const value = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return value;
}

function run() {
  const { check, meta } = window.nzFloor;
  const sheets = [...document.styleSheets].filter((s) => (s.href ?? '').includes('/react-css/'));
  const loaded = sheets.filter((s) => {
    try {
      return s.cssRules.length > 0;
    } catch {
      return false;
    }
  });
  check('setup', 'stylesheets', loaded.length === 10, loaded.length, 10, 'run.ts --react-css');
  meta.fieldSizing = CSS.supports('field-sizing', 'content');
  meta.hasSelector = CSS.supports('selector(:has(> input))');

  const brand = token('bg-brand');
  const surface = token('bg-surface');
  const disabledText = token('text-disabled', 'color');
  const disabledBg = token('bg-disabled');

  // Checkbox: appearance none, painted by :checked and :indeterminate.
  check(
    'checkbox',
    'appearance-none',
    style('#cb-checked').appearance === 'none',
    style('#cb-checked').appearance,
    'none',
  );
  check(
    'checkbox',
    'checked-fill',
    style('#cb-checked').backgroundColor === brand,
    style('#cb-checked').backgroundColor,
    brand,
  );
  $('#cb-mixed').indeterminate = true;
  check(
    'checkbox',
    'indeterminate-fill',
    style('#cb-mixed').backgroundColor === brand,
    style('#cb-mixed').backgroundColor,
    brand,
  );
  const mixed = $('#cb-mixed').parentElement;
  const dash = getComputedStyle(mixed.querySelector('.nz-glyph-minus')).display;
  const tick = getComputedStyle(mixed.querySelector('.nz-glyph-check')).display;
  check(
    'checkbox',
    'indeterminate-glyph',
    dash !== 'none' && tick === 'none',
    { dash, tick },
    'dash shown, check hidden',
  );
  // 1lh: the 20 px box centred on the first line of the label.
  const line = px(getComputedStyle($('#cb-checked').parentElement).lineHeight);
  const margin = px(style('#cb-checked').marginBlockStart);
  check(
    'checkbox',
    '1lh-centring',
    near(margin, (line - 20) / 2),
    margin,
    (line - 20) / 2,
    `line-height ${line}px`,
  );
  // :has() inside :is(): a fieldset-disabled box dims its label.
  const label = getComputedStyle($('#cb-disabled').parentElement).color;
  check(
    'checkbox',
    'is-has-disabled',
    label === disabledText,
    label,
    disabledText,
    ':is([data-disabled], :has(> input:disabled))',
  );

  // Switch: the thumb moves with translate, flipped by :dir(rtl).
  const ltr = px(getComputedStyle($('#sw-ltr').nextElementSibling).translate);
  const rtl = px(getComputedStyle($('#sw-rtl').nextElementSibling).translate);
  check(
    'switch',
    'thumb-ltr',
    near(ltr, 16),
    getComputedStyle($('#sw-ltr').nextElementSibling).translate,
    '16px',
  );
  check(
    'switch',
    'thumb-rtl-dir',
    near(rtl, -16),
    getComputedStyle($('#sw-rtl').nextElementSibling).translate,
    '-16px',
    ':dir(rtl)',
  );
  check(
    'switch',
    'on-track',
    style('#sw-ltr').backgroundColor === brand,
    style('#sw-ltr').backgroundColor,
    brand,
  );

  // Radio: the checked ring is the brand.
  const radio = $('.nz-radio-input:checked');
  check(
    'radio',
    'checked-ring',
    getComputedStyle(radio).borderTopColor === brand,
    getComputedStyle(radio).borderTopColor,
    brand,
  );

  // SegmentedControl: :has(> input:checked) paints the thumb; the nested-input focus rule outlines
  // an item marked data-focus-visible (the WebKit fallback) inside :is() with :has().
  const items = [...document.querySelectorAll('.nz-segmented-control-item')];
  const [first, second, third] = items.map((item) => getComputedStyle(item));
  check(
    'segmented',
    'has-checked-thumb',
    first.backgroundColor === surface,
    first.backgroundColor,
    surface,
  );
  check(
    'segmented',
    'unchecked-clear',
    second.backgroundColor !== surface,
    second.backgroundColor,
    'not the thumb',
  );
  check('segmented', 'has-disabled', third.color === disabledText, third.color, disabledText);
  items[1].setAttribute('data-focus-visible', '');
  check(
    'segmented',
    'focus-rule',
    getComputedStyle(items[1]).outlineStyle === 'solid',
    getComputedStyle(items[1]).outlineStyle,
    'solid',
    ':is(:has(> input:focus-visible), [data-focus-visible])',
  );
  items[1].removeAttribute('data-focus-visible');
  const clipped = items.filter((item) => {
    const text = item.querySelector('.nz-segmented-control-text');
    return text.scrollWidth > text.clientWidth + 1;
  });
  check(
    'segmented',
    'fit-content',
    clipped.length === 0,
    clipped.length,
    0,
    'min-inline-size: fit-content keeps every label whole',
  );

  // Textarea: rows sets the minimum; with field-sizing it grows with its content, else not.
  const lh = px(style('#ta-2').lineHeight);
  const h2 = $('#ta-2').getBoundingClientRect().height;
  const h6 = $('#ta-6').getBoundingClientRect().height;
  const full = $('#ta-full').getBoundingClientRect().height;
  // Mobile Safari 17.5 floors each row to a whole pixel: under a coarse pointer (M25) a row is
  // Body/L's 25.6 px line and 4 rows measure 100 px, so each row may lose its fraction.
  check(
    'textarea',
    'rows',
    near(h6 - h2, 4 * lh, 1 + 4 * (lh % 1)),
    h6 - h2,
    4 * lh,
    lh % 1 ? 'each row may round down to whole pixels' : null,
  );
  check(
    'textarea',
    'field-sizing',
    meta.fieldSizing ? near(full - h2, 6 * lh, 1) : near(full, h2, 0.5),
    full - h2,
    meta.fieldSizing ? 6 * lh : 0,
    meta.fieldSizing
      ? 'grows with its content'
      : 'no field-sizing: the @supports block is skipped and rows holds',
  );

  // Input: a fieldset-disabled control greys the box through :is(…, :has(> input:disabled)).
  const box = getComputedStyle($('#in-disabled').parentElement).backgroundColor;
  check('input', 'is-has-disabled', box === disabledBg, box, disabledBg);

  // NativeSelect: :has(> option[value='']:checked) greys the placeholder.
  const placeholder = token('text-tertiary', 'color');
  check(
    'native-select',
    'has-placeholder',
    style('#ns').color === placeholder,
    style('#ns').color,
    placeholder,
  );
}

try {
  run();
  window.nzFloor.finish('w3-controls');
} catch (error) {
  window.nzFloor.finish('w3-controls', error);
}
