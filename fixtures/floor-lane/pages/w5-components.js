// Week 5: every v0.1 component on the floor (ARCHITECTURE.md §21.1 exit criterion 6, W5). The markup is
// the server HTML of the built @nizivo/react (gen-w5.ts); the stylesheets are the shipped ones. Each
// check reads a box or computed style, so it shows what the browser laid out, not what it parsed.
// Expected sizes come from the tokens through probes, so a token change moves both sides.
const $ = (selector, root = document) => {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`no element ${selector}`);
  return found;
};
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const cs = (el, pseudo) => getComputedStyle(el, pseudo ?? null);
const box = (el) => el.getBoundingClientRect();
const px = (value) => Number.parseFloat(value);
const near = (a, b, tolerance = 0.5) => Math.abs(a - b) <= tolerance;
const round = (n) => Math.round(n * 100) / 100;

// A probe in the controls' scope: a length token as px, a colour token as computed, a scale as computed.
function probe(declarations, read) {
  const el = document.createElement('div');
  el.style.cssText = `position:absolute;visibility:hidden;${declarations}`;
  $('#controls').append(el);
  const value = read(el);
  el.remove();
  return value;
}
const len = (name) => probe(`inline-size:var(--nz-${name})`, (el) => box(el).width);
const colour = (name, property = 'background-color') =>
  probe(`${property}:var(--nz-${name})`, (el) => cs(el).getPropertyValue(property));
const glyphs = (p) => document.querySelector(`#kbd .nz-kbd-glyphs[data-platform='${p}']`);
const fontSize = (name) => probe(`font-size:var(--nz-${name})`, (el) => px(cs(el).fontSize));
// One line of a type style, from its tokens alone (font-size × the unitless line-height token), so a
// change to either token, or a rule that drops the style, moves the expected value.
const lineOf = (style) =>
  fontSize(`font-${style}-font-size`) *
  Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(`--nz-font-${style}-line-height`),
  );

function run() {
  const { check, meta } = window.nzFloor;
  const size = (group, id, el, width, height, note = null) => {
    const r = box(el);
    check(
      group,
      id,
      near(r.width, width) && near(r.height, height),
      `${round(r.width)} x ${round(r.height)}`,
      `${round(width)} x ${round(height)}`,
      note,
    );
  };
  const height = (group, id, el, expected, note = null, tolerance = 0.5) => {
    const h = box(el).height;
    check(group, id, near(h, expected, tolerance), round(h), round(expected), note);
  };
  // A box whose height is one line of `style` plus padding, from the tokens: Mobile Safari 17.5 lays
  // a 19.6 px line (14 px at 1.4) as a 19 px line box, so these allow the line box's rounding (1 px).
  const textHeight = (group, id, el, style, padding, note = null) =>
    height(
      group,
      id,
      el,
      lineOf(style) + padding,
      note ?? `${style} line from its tokens + padding; line box may round`,
      1,
    );
  const equal = (group, id, observed, expected, note = null) =>
    check(group, id, observed === expected, observed, expected, note);
  const distance = (group, id, observed, expected, note = null, tolerance = 0.5) =>
    check(group, id, near(observed, expected, tolerance), round(observed), round(expected), note);

  // ---------- setup ----------
  const links = $$('link[href^="react-css/"]');
  const loaded = [...document.styleSheets].filter((s) => {
    try {
      return (s.href ?? '').includes('/react-css/') && s.cssRules.length > 0;
    } catch {
      return false;
    }
  });
  check(
    'setup',
    'stylesheets',
    loaded.length === links.length && links.length > 30,
    loaded.length,
    links.length,
    'run.ts --react-css',
  );
  meta.supports = {
    nesting: CSS.supports('selector(&)'),
    has: CSS.supports('selector(:has(> input))'),
    fieldSizing: CSS.supports('field-sizing', 'content'),
    lh: CSS.supports('width', '1lh'),
    dvh: CSS.supports('height', '100dvh'),
    textWrapBalance: CSS.supports('text-wrap', 'balance'),
    spanMin: CSS.supports('grid-column', 'span min(2, 4)'),
    overflowTwoValues: CSS.supports('overflow', 'auto hidden'),
    scaleProperty: CSS.supports('scale', '-1 1'),
    rangeMediaQuery: matchMedia('(width >= 0px)').matches,
  };
  meta.pointerCoarse = matchMedia('(pointer: coarse)').matches;
  meta.viewport = [innerWidth, innerHeight];

  const controlSm = len('size-control-sm');
  const controlMd = len('size-control-md');
  const controlLg = len('size-control-lg');
  const iconSm = len('size-icon-sm');
  const iconMd = len('size-icon-md');
  const iconLg = len('size-icon-lg');
  const touch = len('size-touch-min');
  meta.tokens = { controlSm, controlMd, controlLg, iconSm, iconMd, iconLg, touch };

  // ---------- ThemeScript ----------
  const platform = document.documentElement.getAttribute('data-nz-platform');
  const apple = /mac|iphone|ipad|ipod/i.test(
    navigator.userAgentData?.platform || navigator.platform,
  );
  equal('theme-script', 'platform', platform, apple ? 'apple' : 'other', 'set before first paint');

  // ---------- Button ----------
  height('button', 'height-md', $('#btn-md'), controlMd);
  height('button', 'height-sm', $('#btn-sm'), controlSm);
  height('button', 'height-lg', $('#btn-lg'), controlLg);
  size('button', 'icon-slot-md', $('#btn-md .nz-button-icon'), iconSm, iconSm);
  size('button', 'icon-1em-md', $('#btn-md .nz-button-icon svg'), iconSm, iconSm, 'svg is 1em');
  size('button', 'icon-1em-lg', $('#btn-lg .nz-button-icon svg'), iconMd, iconMd, 'svg is 1em');
  distance('button', 'full-width', box($('#btn-full')).width, 300);
  // A Button rendered as a link: the same box as a <button>, with no page reset (§8.1)
  equal('button', 'link-tag', $('#btn-link').localName, 'a');
  height('button', 'link-height-md', $('#btn-link'), controlMd, 'border box, as the <button>');
  distance(
    'button',
    'link-full-width',
    box($('#btn-link-full')).width,
    300,
    'fullWidth stays inside its 300 px parent',
  );
  equal('button', 'link-underline', cs($('#btn-link')).textDecorationLine, 'none');
  equal('button', 'primary-fill', cs($('#btn-md')).backgroundColor, colour('bg-brand'));
  equal('button', 'disabled-fill', cs($('#btn-disabled')).backgroundColor, colour('bg-disabled'));
  const hit = cs($('#btn-hit'), '::after');
  check(
    'button',
    'hit-target-always',
    hit.content !== 'none' && px(hit.height) >= touch - 0.5 && px(hit.width) >= touch - 0.5,
    { content: hit.content, width: hit.width, height: hit.height },
    `>= ${touch}px each way`,
    "[data-nz-touch-targets='always'] .nz-hit-target::after, inset: min(0px, calc(...))",
  );
  const coarse = cs($('#btn-sm'), '::after');
  check(
    'button',
    'hit-target-coarse',
    meta.pointerCoarse ? px(coarse.height) >= touch - 0.5 : coarse.content === 'none',
    { content: coarse.content, height: coarse.height },
    meta.pointerCoarse ? `>= ${touch}px` : 'none (fine pointer)',
    '@media (pointer: coarse)',
  );

  // ---------- IconButton ----------
  for (const [id, side, glyph] of [
    ['md', controlMd, iconMd],
    ['sm', controlSm, iconSm],
    ['lg', controlLg, iconLg],
  ]) {
    size('icon-button', `square-${id}`, $(`#ib-${id}`), side, side);
    size('icon-button', `icon-1em-${id}`, $(`#ib-${id} svg`), glyph, glyph, 'svg is 1em');
  }

  // ---------- Alert ----------
  for (const dir of ['ltr', 'rtl']) {
    const alert = $(`#alert-${dir}`);
    const a = box(alert);
    const icon = box($('.nz-alert-icon', alert));
    const dismiss = box($('.nz-alert-dismiss', alert));
    const pad = px(cs(alert).paddingInlineStart);
    size('alert', `icon-${dir}`, $('.nz-alert-icon svg', alert), iconMd, iconMd, 'svg is 1em');
    size('alert', `dismiss-${dir}`, $('.nz-alert-dismiss', alert), iconSm + 8, iconSm + 8);
    if (dir === 'ltr') {
      distance('alert', 'icon-at-start-ltr', icon.left - a.left, pad);
      distance('alert', 'dismiss-at-end-ltr', a.right - dismiss.right, pad);
    } else {
      distance('alert', 'icon-at-start-rtl', a.right - icon.right, pad, 'flex row mirrors');
      distance('alert', 'dismiss-at-end-rtl', dismiss.left - a.left, pad, 'flex row mirrors');
    }
  }

  // ---------- Badge and Delta ----------
  size('badge', 'dot', $('#badge .nz-badge-dot'), len('space-1-5'), len('space-1-5'));
  textHeight('badge', 'height', $('#badge'), 'label-m', 2 * len('space-0-5'));
  const deltaIcon = document.querySelector('#delta .nz-delta-icon');
  if (deltaIcon) size('delta', 'icon', deltaIcon, iconSm, iconSm);
  textHeight('delta', 'height', $('#delta'), 'label-m-strong', 2 * len('space-1'));

  // ---------- Card ----------
  equal('card', 'padding', px(cs($('#card-ltr')).paddingTop), len('space-6'));
  for (const dir of ['ltr', 'rtl']) {
    const header = box($(`#card-${dir} .nz-card-header`));
    const action = box($(`#card-${dir} .nz-card-action`));
    distance(
      'card',
      `action-at-end-${dir}`,
      dir === 'ltr' ? header.right - action.right : action.left - header.left,
      0,
      'grid-area 1 / 2',
    );
  }

  // ---------- EmptyState ----------
  size('empty-state', 'media', $('#empty .nz-empty-state-media'), 140, 140, '8.75rem');
  const title = cs($('#empty .nz-empty-state-title'));
  const wrap = `${title.getPropertyValue('text-wrap')} ${title.getPropertyValue('text-wrap-style')}`;
  check(
    'empty-state',
    'title-balance',
    meta.supports.textWrapBalance ? wrap.includes('balance') : null,
    wrap.trim(),
    meta.supports.textWrapBalance ? 'balance' : null,
    meta.supports.textWrapBalance ? null : 'no text-wrap: balance: the title wraps greedily',
  );

  // ---------- Field, Fieldset, RadioGroup ----------
  const label = box($('#field .nz-field-label'));
  const control = box($('#field .nz-input'));
  distance('field', 'label-gap', control.top - label.bottom, len('space-1-5'));
  check(
    'field',
    'label-hugs',
    label.width < box($('#field')).width,
    round(label.width),
    'narrower than the field',
    'align-self: flex-start',
  );
  const legend = box($('#fieldset .nz-fieldset-legend'));
  const [first, second] = $$('#fieldset .nz-checkbox').map(box);
  const content = box($('#fieldset .nz-fieldset-content'));
  distance('fieldset', 'legend-gap', content.top - legend.bottom, len('space-2'));
  distance('fieldset', 'item-gap', second.top - first.bottom, len('space-3'));
  const [kg, lb] = $$('#radios .nz-radio').map(box);
  distance('radio-group', 'horizontal-row', lb.top, kg.top);
  distance('radio-group', 'horizontal-gap', lb.left - kg.right, len('space-6'));
  size('radio-group', 'radio', $('#radios .nz-radio-input'), 20, 20, '1.25rem');

  // ---------- InlineError ----------
  for (const id of ['ie-one', 'ie-wrap']) {
    const error = $(`#${id}`);
    const lh = px(cs(error).lineHeight);
    const iconBox = box($('.nz-inline-error-icon', error));
    const glyph = box($('.nz-inline-error-icon svg', error));
    height(
      'inline-error',
      `icon-1lh-${id}`,
      $('.nz-inline-error-icon', error),
      lh,
      'block-size: 1lh',
    );
    size('inline-error', `glyph-${id}`, $('.nz-inline-error-icon svg', error), iconSm, iconSm);
    distance('inline-error', `glyph-centred-${id}`, glyph.top - iconBox.top, (lh - iconSm) / 2);
    distance('inline-error', `on-first-line-${id}`, iconBox.top, box(error).top);
  }
  const wrapped = $('#ie-wrap');
  check(
    'inline-error',
    'wraps',
    box(wrapped).height >= 2 * px(cs(wrapped).lineHeight) - 1,
    round(box(wrapped).height),
    'two lines or more',
  );

  // ---------- Kbd, Heading, Text ----------
  if (glyphs('apple') && glyphs('other')) {
    const shown = cs(glyphs('apple')).display !== 'none' ? 'apple' : 'other';
    const hidden = cs(glyphs(shown === 'apple' ? 'other' : 'apple')).display;
    check(
      'kbd',
      'platform-glyphs',
      shown === platform && hidden === 'none',
      { shown, other: hidden },
      platform,
      ":where([data-nz-platform='apple'])",
    );
  }
  equal('kbd', 'border', cs($('#kbd')).borderTopWidth, `${len('border-width-default')}px`);
  equal('heading', 'h1-size', px(cs($('#h1')).fontSize), fontSize('font-heading-h1-font-size'));
  equal('heading', 'margin', cs($('#h1')).marginTop, '0px');
  equal('text', 'body-s-size', px(cs($('#text-s')).fontSize), fontSize('font-body-s-font-size'));
  check(
    'text',
    'tabular-nums',
    cs($('#text-kpi')).fontVariantNumeric.includes('tabular-nums'),
    cs($('#text-kpi')).fontVariantNumeric,
    'tabular-nums',
  );

  // ---------- Stack, Inline, Container, Separator ----------
  const [s1, s2] = [...$('#stack').children].map(box);
  distance('stack', 'gap', s2.top - s1.bottom, len('space-4'));
  const pills = [...$('#inline').children].map(box);
  check(
    'inline',
    'wraps',
    new Set(pills.map((r) => Math.round(r.top))).size > 1,
    pills.map((r) => round(r.top)),
    'more than one row in 160px',
  );
  distance('inline', 'column-gap', pills[1].left - pills[0].right, len('space-2'));
  const containerStyle = cs($('#container'));
  equal('container', 'max-inline-size', px(containerStyle.maxWidth), len('layout-content-max'));
  equal('container', 'padding', px(containerStyle.paddingLeft), len('grid-margin'));
  height('separator', 'horizontal', $('#sep-h'), len('border-width-default'));
  const row = box($('#sep-row'));
  const sepV = box($('#sep-v'));
  distance('separator', 'vertical-width', sepV.width, len('border-width-default'));
  distance('separator', 'vertical-stretch', sepV.height, row.height, 'align-self: stretch');

  // ---------- Image ----------
  size('image', 'ratio-4-5', $('#img-45'), 200, 250, 'max-inline-size 100%, aspect-ratio 4 / 5');
  const i169 = box($('#img-169'));
  distance('image', 'ratio-16-9', i169.height, (i169.width * 9) / 16, 'CSS ratio over attributes');
  equal('image', 'object-fit', cs($('#img-45')).objectFit, 'cover');

  // ---------- Skeleton ----------
  height('skeleton', 'line-1em', $('#sk-line'), 14, '1em of 14 px');
  distance(
    'skeleton',
    'line-width',
    box($('#sk-line')).width,
    box($('#sk-line').parentElement).width,
  );
  size('skeleton', 'circle-1em', $('#sk-circle'), 40, 40, 'in a flex column, 1em of 40 px');
  size('skeleton', 'circle-hook', $('#sk-circle-48'), 48, 48, '--nz-skeleton-height');
  check(
    'skeleton',
    'circle-radius',
    px(cs($('#sk-circle')).borderTopLeftRadius) >= 20,
    cs($('#sk-circle')).borderTopLeftRadius,
    '>= half the side',
  );

  // ---------- Checkbox ----------
  size('checkbox', 'box', $('#cb'), 20, 20, '1.25rem');
  equal('checkbox', 'checked-fill', cs($('#cb')).backgroundColor, colour('bg-brand'));
  size('checkbox', 'glyph', $('#cb + .nz-checkbox-indicator .nz-glyph-check'), 14, 14, '0.875rem');
  $('#cb-mixed').indeterminate = true;
  const mixed = $('#cb-mixed').parentElement;
  check(
    'checkbox',
    'indeterminate-glyph',
    cs($('.nz-glyph-minus', mixed)).display !== 'none' &&
      cs($('.nz-glyph-check', mixed)).display === 'none',
    {
      dash: cs($('.nz-glyph-minus', mixed)).display,
      check: cs($('.nz-glyph-check', mixed)).display,
    },
    'dash shown, check hidden',
  );

  // ---------- Switch: the knob's travel, measured as a box (translate included) ----------
  for (const dir of ['ltr', 'rtl']) {
    const [on, off] = $$(`.nzf-switch-${dir} .nz-switch-input`);
    size('switch', `track-${dir}`, on, 36, 20);
    size('switch', `thumb-${dir}`, on.nextElementSibling, 16, 16);
    const at = (input) => box(input.nextElementSibling).left - box(input).left;
    distance(
      'switch',
      `on-${dir}`,
      at(on),
      dir === 'ltr' ? 18 : 2,
      'translate * --_nz-switch-direction',
    );
    distance('switch', `off-${dir}`, at(off), dir === 'ltr' ? 2 : 18);
    distance('switch', `thumb-top-${dir}`, box(on.nextElementSibling).top - box(on).top, 2);
  }

  // ---------- SegmentedControl ----------
  for (const [id, track, inset] of [
    ['md', controlMd, len('space-1')],
    ['sm', controlSm, len('space-0-5')],
    ['lg', controlLg, len('space-1')],
  ]) {
    height('segmented', `track-${id}`, $(`#seg-${id} .nz-segmented-control`), track);
    height(
      'segmented',
      `item-${id}`,
      $(`#seg-${id} .nz-segmented-control-item`),
      track - 2 * inset,
    );
  }
  const segItems = $$('#seg-md .nz-segmented-control-item');
  equal('segmented', 'thumb-fill', cs(segItems[0]).backgroundColor, colour('bg-surface'));
  const before = box(segItems[1]).width;
  $('input', segItems[1]).checked = true;
  distance('segmented', 'sizer-holds-width', box(segItems[1]).width, before, 'hidden bold copy');
  $('input', segItems[0]).checked = true;
  const full = $('#seg-full .nz-segmented-control');
  const shares = $$('.nz-segmented-control-item', full).map((el) => box(el).width);
  distance('segmented', 'full-width', box(full).width, 480);
  check(
    'segmented',
    'equal-shares',
    Math.max(...shares) - Math.min(...shares) <= 1,
    shares.map(round),
    'equal within 1 px',
    'flex: 1 1 0; min-inline-size: fit-content',
  );

  // ---------- Input, Textarea, NativeSelect ----------
  height('input', 'height-md', $('#in-md').closest('.nz-input'), controlMd);
  height('input', 'height-sm', $('#in-sm').closest('.nz-input'), controlSm);
  height('input', 'height-lg', $('#in-lg').closest('.nz-input'), controlLg);
  size('input', 'icon-1em', $('#in-md').closest('.nz-input').querySelector('svg'), iconSm, iconSm);
  const rtlInput = $('#in-rtl').closest('.nz-input');
  check(
    'input',
    'affixes-rtl',
    box($('.nz-input-prefix', rtlInput)).left > box($('.nz-input-suffix', rtlInput)).left,
    {
      prefix: round(box($('.nz-input-prefix', rtlInput)).left),
      suffix: round(box($('.nz-input-suffix', rtlInput)).left),
    },
    'prefix on the right',
  );
  const lh = px(cs($('#ta-2')).lineHeight);
  const h2 = box($('#ta-2')).height;
  distance('textarea', 'rows', box($('#ta-6')).height - h2, 4 * lh, null, 1);
  distance(
    'textarea',
    'field-sizing',
    box($('#ta-full')).height - h2,
    meta.supports.fieldSizing ? 6 * lh : 0,
    meta.supports.fieldSizing
      ? 'grows with its content'
      : 'no field-sizing: the @supports block is skipped and rows holds',
    1,
  );
  for (const dir of ['ltr', 'rtl']) {
    const trigger = $(`#ns-${dir}`);
    const t = box(trigger);
    const chevron = $('.nz-native-select-chevron svg', trigger.parentElement);
    const c = box(chevron);
    const inset = len('space-3') + len('border-width-default');
    height('native-select', `height-${dir}`, trigger, controlMd);
    size('native-select', `chevron-${dir}`, chevron, iconSm, iconSm);
    distance(
      'native-select',
      `chevron-at-end-${dir}`,
      dir === 'ltr' ? t.right - c.right : c.left - t.left,
      inset,
    );
    equal(
      'native-select',
      `end-padding-${dir}`,
      px(dir === 'ltr' ? cs(trigger).paddingRight : cs(trigger).paddingLeft),
      len('space-3') + iconSm + len('space-2'),
    );
  }

  // ---------- Select: trigger (server) and the composed open popup ----------
  const selectTrigger = $('#s-select .nz-select-trigger');
  height('select', 'trigger-height', selectTrigger, controlMd);
  size('select', 'chevron', $('.nz-select-chevron svg', selectTrigger), iconSm, iconSm);
  const popup = $('#select-popup');
  distance(
    'select',
    'popup-trigger-width',
    box(popup).width,
    240,
    'min-inline-size: var(--nz-trigger-width)',
  );
  const options = $$('.nz-select-item', popup);
  // The Select popup sets no type style yet (the select.css visual pass, W6): its items inherit the
  // page's. Label/M, the trigger's style, is what this page gives them; a style of their own must
  // keep this line.
  textHeight(
    'select',
    'item-height',
    options[0],
    'label-m',
    2 * len('space-2'),
    'label-m line from its tokens + padding (inherited: the popup sets no type style yet)',
  );
  equal('select', 'item-highlight', cs(options[0]).backgroundColor, colour('bg-hover'));
  equal('select', 'item-selected-weight', cs(options[1]).fontWeight, '600');
  equal('select', 'item-disabled', cs(options[2]).color, colour('text-disabled', 'color'));
  height('select', 'separator', $('.nz-select-separator', popup), 1);
  equal('select', 'list-padding', px(cs($('.nz-select-list', popup)).paddingTop), len('space-1-5'));
  const scaleEnter = probe('scale:var(--nz-scale-enter)', (el) => cs(el).scale);
  meta.scaleEnter = scaleEnter;
  const entering = cs($('#select-entering'));
  check(
    'select',
    'entering',
    entering.opacity === '0' && entering.scale === scaleEnter,
    { opacity: entering.opacity, scale: entering.scale },
    { opacity: '0', scale: scaleEnter },
  );

  // ---------- Menu ----------
  height('menu', 'trigger-height', $('#menu-trigger'), controlMd);
  const plain = $('#menu-plain');
  // The whole popup, border included, with no page reset (§8.1): it matches its trigger exactly
  distance(
    'menu',
    'min-width',
    box(plain).width,
    192,
    'max(12rem, var(--nz-trigger-width, 0px)), border box',
  );
  distance(
    'menu',
    'trigger-width',
    box($('#menu-checkable')).width,
    300,
    '--nz-trigger-width: 300px, border box',
  );
  const rows = $$('.nz-menu-item', plain);
  // Figma's 36 px row (figma/13 §5): the whole row, padding included, on a page with no reset (§8.1:
  // components never depend on one)
  height('menu', 'row-min-height', rows[0], 36, '2.25rem, padding included');
  distance('menu', 'row-gap', box(rows[1]).top - box(rows[0]).bottom, len('space-0-5'));
  equal('menu', 'list-padding', px(cs($('.nz-menu-list', plain)).paddingTop), len('space-1-5'));
  size('menu', 'icon-1em', $('.nz-menu-item-icon svg', rows[0]), iconSm, iconSm);
  const shortcut = cs($('.nz-menu-item-shortcut', rows[0]));
  check(
    'menu',
    'shortcut-plain',
    shortcut.borderTopWidth === '0px' && shortcut.paddingLeft === '0px',
    { border: shortcut.borderTopWidth, padding: shortcut.paddingLeft },
    { border: '0px', padding: '0px' },
    'Mono/M text, no key box',
  );
  equal('menu', 'disabled', cs(rows[1]).color, colour('text-disabled', 'color'));
  equal('menu', 'critical', cs(rows[2]).color, colour('text-critical', 'color'));
  height('menu', 'separator', $('.nz-menu-separator', plain), len('border-width-default'));
  equal(
    'menu',
    'check-column',
    px(cs($('#menu-plain-row')).paddingRight),
    len('space-3') + iconSm + len('space-2'),
    '.nz-menu-list:has(.nz-menu-item-indicator) .nz-menu-item',
  );
  equal(
    'menu',
    'checked-indicator',
    cs($('#menu-checked .nz-menu-item-indicator')).visibility,
    'visible',
  );
  equal(
    'menu',
    'unchecked-indicator',
    cs($('#menu-unchecked .nz-menu-item-indicator')).visibility,
    'hidden',
  );
  equal('menu', 'checked-fill', cs($('#menu-checked')).backgroundColor, colour('bg-brand-subtle'));
  // The whole popup, border included, fits the space the engine measured (border box)
  const short = $('#menu-short');
  check(
    'menu',
    'available-height',
    near(box(short).height, 120) && short.scrollHeight > short.clientHeight,
    { height: round(box(short).height), scrolls: short.scrollHeight > short.clientHeight },
    { height: 120, scrolls: true },
    'max-block-size: var(--nz-available-height) on the border box; overflow: auto',
  );
  const menuEntering = cs($('#menu-entering'));
  check(
    'menu',
    'entering',
    menuEntering.opacity === '0' && menuEntering.scale === scaleEnter,
    { opacity: menuEntering.opacity, scale: menuEntering.scale },
    { opacity: '0', scale: scaleEnter },
  );
  equal('menu', 'exiting', cs($('#menu-exiting')).opacity, '0');

  // ---------- Tooltip ----------
  const tipLong = $('#tip-long');
  distance(
    'tooltip',
    'max-width',
    box(tipLong).width,
    320,
    'max-inline-size: 20rem, the whole tooltip (border box, no page reset needed)',
  );
  check(
    'tooltip',
    'long-wraps',
    box($('#tip-long')).height > 2 * px(cs($('#tip-long')).lineHeight),
    round(box($('#tip-long')).height),
    'more than one line',
  );
  const tip = cs($('#tip-short'));
  check(
    'tooltip',
    'padding',
    px(tip.paddingTop) === len('space-2') && px(tip.paddingLeft) === len('space-3'),
    [tip.paddingTop, tip.paddingLeft],
    [`${len('space-2')}px`, `${len('space-3')}px`],
  );
  const tipEntering = cs($('#tip-entering'));
  const lift = len('distance-lift');
  const [tx, ty] = tipEntering.translate.split(' ').map(px);
  check(
    'tooltip',
    'entering-top',
    tipEntering.opacity === '0' && near(tx, 0) && near(ty ?? 0, lift),
    { opacity: tipEntering.opacity, translate: tipEntering.translate },
    { opacity: '0', translate: `0px ${lift}px` },
  );

  // ---------- Dialog (fixed positioner inside a transformed frame) ----------
  for (const [id, width] of [
    ['dialog-md', 480],
    ['dialog-sm', 400],
  ]) {
    const frame = box($(`#${id}`));
    const positioner = box($(`#${id} .nz-dialog-positioner`));
    const dialogBox = box($(`#${id} .nz-dialog-popup`));
    const padding = len('space-8');
    check(
      'dialog',
      `positioner-${id}`,
      near(positioner.width, frame.width) && near(positioner.height, frame.height),
      `${round(positioner.width)} x ${round(positioner.height)}`,
      `${round(frame.width)} x ${round(frame.height)}`,
      'position: fixed; inset: 0',
    );
    distance(
      'dialog',
      `width-${id}`,
      dialogBox.width,
      Math.min(width, frame.width - 2 * padding),
      'min(var(--_nz-dialog-width), 100%)',
    );
    check(
      'dialog',
      `centred-${id}`,
      near(dialogBox.left + dialogBox.width / 2, frame.left + frame.width / 2, 1) &&
        near(dialogBox.top + dialogBox.height / 2, frame.top + frame.height / 2, 1),
      [round(dialogBox.left - frame.left), round(dialogBox.top - frame.top)],
      'centred in the frame',
      'display: grid; place-items: center',
    );
    const footer = box($(`#${id} .nz-dialog-footer`));
    distance(
      'dialog',
      `footer-end-${id}`,
      footer.right - box($(`#${id}-delete`)).right,
      len('space-6'),
    );
  }
  distance(
    'dialog',
    'max-height-dvh',
    px(cs($('#dialog-md .nz-dialog-popup')).maxHeight),
    innerHeight - 2 * len('space-8'),
    'calc(100dvh - 2 * --nz-space-8)',
    2,
  );

  // ---------- Tabs and TabNav ----------
  for (const dir of ['ltr', 'rtl']) {
    const list = $(`.nzf-tabs-${dir} .nz-tabs-list`);
    const tabs = $$('.nz-tabs-tab', list);
    const listStyle = cs(list);
    check(
      'tabs',
      `strip-overflow-${dir}`,
      listStyle.overflowX === 'auto' && listStyle.overflowY === 'hidden',
      [listStyle.overflowX, listStyle.overflowY],
      ['auto', 'hidden'],
      'overflow: auto hidden',
    );
    for (const tab of tabs) height('tabs', `height-${dir}-${tabs.indexOf(tab)}`, tab, controlMd);
    const ends = len('space-0-5');
    const inner = len('space-3') + len('space-0-5');
    const indicator = cs(tabs[0], '::before');
    const [start, end] = dir === 'ltr' ? ['left', 'right'] : ['right', 'left'];
    check(
      'tabs',
      `indicator-inset-${dir}`,
      near(px(indicator[start]), ends) && near(px(indicator[end]), inner),
      { [start]: indicator[start], [end]: indicator[end] },
      { [start]: `${ends}px`, [end]: `${inner}px` },
      'inset-inline on ::before, first tab',
    );
    check(
      'tabs',
      `indicator-edge-${dir}`,
      near(px(indicator.height), len('border-width-focus')) && indicator.bottom === '0px',
      { height: indicator.height, bottom: indicator.bottom },
      { height: `${len('border-width-focus')}px`, bottom: '0px' },
    );
    equal('tabs', `indicator-fill-${dir}`, indicator.backgroundColor, colour('bg-brand'));
    const middle = cs(tabs[1], '::before');
    check(
      'tabs',
      `unselected-indicator-${dir}`,
      near(px(middle.left), inner) &&
        near(px(middle.right), inner) &&
        middle.backgroundColor !== indicator.backgroundColor,
      { left: middle.left, right: middle.right, fill: middle.backgroundColor },
      { left: `${inner}px`, right: `${inner}px`, fill: 'not the brand' },
    );
    const order = box(tabs[0]).left < box(tabs[1]).left ? 'ltr' : 'rtl';
    equal('tabs', `order-${dir}`, order, dir);
    const text = box($('.nz-tabs-text', tabs[0])).width;
    const sizer = box($('.nz-tabs-sizer', tabs[0])).width;
    distance('tabs', `sizer-${dir}`, text, sizer, 'the selected label fills its bold copy', 1);
    size('tabs', `icon-${dir}`, $('.nz-tabs-icon svg', tabs[1]), iconSm, iconSm);
  }
  const navLinks = $$('#tabnav .nz-tab-nav-link');
  const navStyle = cs($('#tabnav'));
  check(
    'tab-nav',
    'strip-overflow',
    navStyle.overflowX === 'auto' && navStyle.overflowY === 'hidden',
    [navStyle.overflowX, navStyle.overflowY],
    ['auto', 'hidden'],
  );
  height('tab-nav', 'height', navLinks[0], controlMd);
  const navIndicator = cs(navLinks[0], '::before');
  check(
    'tab-nav',
    'current-indicator',
    navIndicator.backgroundColor === colour('bg-brand') &&
      near(px(navIndicator.height), len('border-width-focus')),
    { fill: navIndicator.backgroundColor, height: navIndicator.height },
    { fill: colour('bg-brand'), height: `${len('border-width-focus')}px` },
    "[aria-current='page']::before",
  );

  // ---------- ProgressBar, Meter, ProgressRing ----------
  height('progress-bar', 'track', $('#pb .nz-progress-bar-track'), len('space-2'));
  height('meter', 'track', $('#meter .nz-meter-track'), len('space-1-5'));
  for (const [id, side] of [
    ['md', 72],
    ['sm', 48],
    ['lg', 96],
  ]) {
    size('progress-ring', `size-${id}`, $(`#ring-${id}`), side, side);
    size('progress-ring', `svg-${id}`, $(`#ring-${id} svg`), side, side);
  }
  const ring = box($('#ring-md'));
  const ringLabel = box($('#ring-md .nz-progress-ring-label'));
  check(
    'progress-ring',
    'label-centred',
    near(ringLabel.left + ringLabel.width / 2, ring.left + ring.width / 2, 1) &&
      near(ringLabel.top + ringLabel.height / 2, ring.top + ring.height / 2, 1),
    [round(ringLabel.left - ring.left), round(ringLabel.top - ring.top)],
    'centred',
  );

  // ---------- @nizivo/icons ----------
  const sized = $$('#icon-sizes svg');
  for (const [index, side] of [13, 24, 40].entries()) {
    size('icons', `1em-${side}px`, sized[index], side, side, index === 2 ? 'brand glyph' : null);
  }
  for (const id of ['icon-ltr-arrow', 'icon-ltr-chevron'])
    equal('icons', `no-mirror-${id}`, cs($(`#${id}`)).scale, 'none');
  for (const id of ['icon-rtl-arrow', 'icon-rtl-chevron', 'icon-rtl-optout', 'icon-rtl-calendar']) {
    const el = $(`#${id}`);
    const mirrors = el.getAttribute('data-mirror') === 'rtl';
    equal(
      'icons',
      `rtl-${id}`,
      cs(el).scale,
      mirrors ? '-1 1' : 'none',
      mirrors ? ":dir(rtl) [data-mirror='rtl']" : 'not directional, or opted out',
    );
  }
  check(
    'icons',
    'mirror-attribute',
    $('#icon-rtl-arrow').getAttribute('data-mirror') === 'rtl' &&
      !$('#icon-rtl-optout').hasAttribute('data-mirror'),
    {
      arrow: $('#icon-rtl-arrow').getAttribute('data-mirror'),
      optOut: $('#icon-rtl-optout').getAttribute('data-mirror'),
    },
    { arrow: 'rtl', optOut: null },
  );
}

try {
  run();
  window.nzFloor.finish('w5-components');
} catch (error) {
  window.nzFloor.finish('w5-components', error);
}
