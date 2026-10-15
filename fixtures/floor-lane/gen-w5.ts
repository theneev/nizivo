// Generates the week 5 floor pages (ARCHITECTURE.md §21.1 exit criterion 6, W5 "floor-lane page that
// renders the component CSS"): the server HTML of every v0.1 component, rendered with
// renderToStaticMarkup from the BUILT packages (packages/react/dist, packages/icons/dist), written into
// pages/ next to the hand-written check scripts. The pages are committed, like w3-controls.html, so the
// lane runs offline and by hand in a browser no script can drive.
//
//   node fixtures/floor-lane/gen-w5.ts           build packages/react and packages/icons first
//   node fixtures/floor-lane/gen-w5.ts --check   exit 1 if a committed page differs from a fresh render
//
// React Aria renders no popup on the server (test/ssr/render-all.test.tsx asserts it), so the open
// Select, Menu, Tooltip and Dialog popups are composed here from the engine's DOM shape
// (src/_engines/react-aria/*.client.tsx), with the runtime variables the engine sets inline
// (--nz-trigger-width, --nz-available-height, --nz-transform-origin). Every class they use must exist
// in the built stylesheet, or the generator fails, so a renamed part cannot leave a stale page.
//
// react, react-dom and the two packages are resolved from packages/react (createRequire), not from
// this fixture's dependencies: adding them here would change the lockfile.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const repo = join(import.meta.dirname, '..', '..');
const reactDir = join(repo, 'packages', 'react');
const iconsDir = join(repo, 'packages', 'icons');
const cssDir = join(reactDir, 'dist', 'css');
const pagesDir = join(import.meta.dirname, 'pages');

function isRecord(value: unknown): value is Record<string, unknown> {
  return (typeof value === 'object' || typeof value === 'function') && value !== null;
}

interface ReactApi {
  createElement(
    type: unknown,
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ): unknown;
}
interface ServerApi {
  renderToStaticMarkup(element: unknown): string;
}

function isReactApi(value: unknown): value is ReactApi {
  return isRecord(value) && typeof value['createElement'] === 'function';
}
function isServerApi(value: unknown): value is ServerApi {
  return isRecord(value) && typeof value['renderToStaticMarkup'] === 'function';
}

const fromReact = createRequire(join(reactDir, 'package.json'));
const React: unknown = fromReact('react');
const Server: unknown = fromReact('react-dom/server');
if (!isReactApi(React)) throw new Error('react did not load from packages/react');
if (!isServerApi(Server)) throw new Error('react-dom/server did not load from packages/react');

type Props = Record<string, unknown> | null;
const h = (type: unknown, props: Props = null, ...children: unknown[]): unknown =>
  React.createElement(type, props, ...children);
const html = (element: unknown): string => Server.renderToStaticMarkup(element);

async function load(file: string): Promise<Record<string, unknown>> {
  const module: unknown = await import(pathToFileURL(file).href);
  if (!isRecord(module)) throw new Error(`${file} did not load`);
  return module;
}

/** An export of a built module, or a part of a namespace export (`Select`, `Root`). */
function pick(module: Record<string, unknown>, name: string, part?: string): unknown {
  const value = module[name];
  if (value === undefined) throw new Error(`no export ${name}`);
  if (part === undefined) return value;
  if (!isRecord(value) || value[part] === undefined) throw new Error(`no part ${name}.${part}`);
  return value[part];
}

const react = async (subpath: string) => load(join(reactDir, 'dist', subpath, 'index.js'));
const icon = async (name: string, exported: string) =>
  pick(await load(join(iconsDir, 'dist', 'icons', `${name}.js`)), exported);

const [
  alert,
  badge,
  button,
  card,
  checkbox,
  container,
  delta,
  emptyState,
  field,
  fieldset,
  grid,
  heading,
  iconButton,
  image,
  inline,
  inlineError,
  input,
  kbd,
  menu,
  meter,
  nativeSelect,
  progressBar,
  progressRing,
  radioGroup,
  segmented,
  select,
  separator,
  skeleton,
  stack,
  switchModule,
  tabNav,
  tabs,
  text,
  textarea,
  themeScript,
] = await Promise.all(
  [
    'alert',
    'badge',
    'button',
    'card',
    'checkbox',
    'container',
    'delta',
    'empty-state',
    'field',
    'fieldset',
    'grid',
    'heading',
    'icon-button',
    'image',
    'inline',
    'inline-error',
    'input',
    'kbd',
    'menu',
    'meter',
    'native-select',
    'progress-bar',
    'progress-ring',
    'radio-group',
    'segmented-control',
    'select',
    'separator',
    'skeleton',
    'stack',
    'switch',
    'tab-nav',
    'tabs',
    'text',
    'textarea',
    'theme-script',
  ].map(react),
);
if (!alert || !badge || !button || !card || !checkbox || !container || !delta || !emptyState)
  throw new Error('a module did not load');
if (!field || !fieldset || !grid || !heading || !iconButton || !image || !inline || !inlineError)
  throw new Error('a module did not load');
if (!input || !kbd || !menu || !meter || !nativeSelect || !progressBar || !progressRing)
  throw new Error('a module did not load');
if (!radioGroup || !segmented || !select || !separator || !skeleton || !stack || !switchModule)
  throw new Error('a module did not load');
if (!tabNav || !tabs || !text || !textarea || !themeScript)
  throw new Error('a module did not load');

const C = {
  Alert: pick(alert, 'Alert'),
  AlertDismiss: pick(alert, 'AlertDismiss'),
  Badge: pick(badge, 'Badge'),
  Button: pick(button, 'Button'),
  CardRoot: pick(card, 'Card', 'Root'),
  CardHeader: pick(card, 'Card', 'Header'),
  CardTitle: pick(card, 'Card', 'Title'),
  CardDescription: pick(card, 'Card', 'Description'),
  CardAction: pick(card, 'Card', 'Action'),
  CardBody: pick(card, 'Card', 'Body'),
  CardFooter: pick(card, 'Card', 'Footer'),
  Checkbox: pick(checkbox, 'Checkbox'),
  Container: pick(container, 'Container'),
  Delta: pick(delta, 'Delta'),
  EmptyState: pick(emptyState, 'EmptyState'),
  Field: pick(field, 'Field'),
  Fieldset: pick(fieldset, 'Fieldset'),
  Grid: pick(grid, 'Grid'),
  GridItem: pick(grid, 'GridItem'),
  Heading: pick(heading, 'Heading'),
  IconButton: pick(iconButton, 'IconButton'),
  Image: pick(image, 'Image'),
  Inline: pick(inline, 'Inline'),
  InlineError: pick(inlineError, 'InlineError'),
  Input: pick(input, 'Input'),
  Kbd: pick(kbd, 'Kbd'),
  MenuRoot: pick(menu, 'Menu', 'Root'),
  MenuTrigger: pick(menu, 'Menu', 'Trigger'),
  MenuPopup: pick(menu, 'Menu', 'Popup'),
  MenuItem: pick(menu, 'Menu', 'Item'),
  Meter: pick(meter, 'Meter'),
  NativeSelect: pick(nativeSelect, 'NativeSelect'),
  ProgressBar: pick(progressBar, 'ProgressBar'),
  ProgressRing: pick(progressRing, 'ProgressRing'),
  RadioGroup: pick(radioGroup, 'RadioGroup'),
  Radio: pick(radioGroup, 'Radio'),
  SegmentedRoot: pick(segmented, 'SegmentedControl', 'Root'),
  SegmentedItem: pick(segmented, 'SegmentedControl', 'Item'),
  SelectRoot: pick(select, 'Select', 'Root'),
  SelectTrigger: pick(select, 'Select', 'Trigger'),
  SelectPopup: pick(select, 'Select', 'Popup'),
  SelectItem: pick(select, 'Select', 'Item'),
  Separator: pick(separator, 'Separator'),
  Skeleton: pick(skeleton, 'Skeleton'),
  Stack: pick(stack, 'Stack'),
  Switch: pick(switchModule, 'Switch'),
  TabNavRoot: pick(tabNav, 'TabNav', 'Root'),
  TabNavLink: pick(tabNav, 'TabNav', 'Link'),
  TabsRoot: pick(tabs, 'Tabs', 'Root'),
  TabsList: pick(tabs, 'Tabs', 'List'),
  TabsTab: pick(tabs, 'Tabs', 'Tab'),
  TabsPanel: pick(tabs, 'Tabs', 'Panel'),
  Text: pick(text, 'Text'),
  Textarea: pick(textarea, 'Textarea'),
  ThemeScript: pick(themeScript, 'ThemeScript'),
};

const I = {
  ArrowRight: await icon('arrow-right', 'ArrowRight'),
  Bell: await icon('bell', 'Bell'),
  Calendar: await icon('calendar', 'Calendar'),
  ChevronRight: await icon('chevron-right', 'ChevronRight'),
  CircleX: await icon('circle-x', 'CircleX'),
  Info: await icon('info', 'Info'),
  Package: await icon('package', 'Package'),
  Search: await icon('search', 'Search'),
  X: await icon('x', 'X'),
  Instagram: pick(await load(join(iconsDir, 'dist', 'brands', 'instagram.js')), 'Instagram'),
};

// ---------- shared page frame ----------

/** Every built stylesheet, base.css first: the page loads all of them, as an app importing the barrel's CSS. */
function sheets(): string[] {
  const names = readdirSync(cssDir)
    .filter((name) => name.endsWith('.css'))
    .toSorted();
  return ['base.css', ...names.filter((name) => name !== 'base.css')];
}

function page(options: {
  title: string;
  heading: string;
  intro: string;
  style: string;
  body: string;
  script: string;
  head?: string;
}): string {
  const links = sheets()
    .map((name) => `<link rel="stylesheet" href="react-css/${name}" />`)
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${options.title}</title>
<!-- GENERATED by gen-w5.ts from packages/react/dist and packages/icons/dist; do not edit. -->
${options.head ?? ''}
<link rel="stylesheet" href="plan-tokens.css" />
<!-- run.ts --react-css serves packages/react/dist/css under react-css/ -->
${links}
<link rel="stylesheet" href="report.css" />
<style>
${options.style}
</style>
</head>
<body>
<h1>${options.heading}</h1>
${options.body}
<p>${options.intro}</p>
<div id="report"></div>
<pre id="result"></pre>
<script src="harness.js"></script>
<script src="${options.script}"></script>
</body>
</html>
`;
}

/** A section the check script finds by id; the label is for a person reading the page. */
const section = (id: string, label: string, ...children: unknown[]): unknown =>
  h('section', { id: `s-${id}` }, h('h2', null, label), ...children);

// ---------- hand-composed open popups (the engine's DOM shape) ----------

const glyphCheck = (): unknown =>
  h(
    'svg',
    {
      className: 'nz-glyph nz-glyph-check',
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.92,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    h('path', { d: 'M20 6 9 17l-5-5' }),
  );

function menuItem(
  kind: 'item' | 'checkbox-item',
  label: string,
  options: { icon?: unknown; shortcut?: string; checked?: boolean; attrs?: Props } = {},
): unknown {
  const checkable = kind === 'checkbox-item';
  return h(
    'div',
    {
      role: checkable ? 'menuitemcheckbox' : 'menuitem',
      tabIndex: -1,
      className: `nz-menu-${kind}`,
      'data-slot': `menu-${kind}`,
      ...(checkable && { 'aria-checked': options.checked ? 'true' : 'false' }),
      ...(options.checked && { 'data-checked': '' }),
      ...options.attrs,
    },
    options.icon === undefined
      ? null
      : h('span', { className: 'nz-menu-item-icon', 'aria-hidden': 'true' }, options.icon),
    h('span', { className: 'nz-menu-item-label' }, label),
    options.shortcut === undefined
      ? null
      : h(C.Kbd, {
          keys: options.shortcut,
          className: 'nz-menu-item-shortcut',
          'aria-hidden': 'true',
        }),
    checkable
      ? h('span', { className: 'nz-menu-item-indicator', 'aria-hidden': 'true' }, glyphCheck())
      : null,
  );
}

function menuPopup(id: string, style: Record<string, string>, attrs: Props, ...rows: unknown[]) {
  return h(
    'div',
    { id, className: 'nz-menu-popup', 'data-slot': 'menu-popup', 'data-open': '', style, ...attrs },
    h(
      'div',
      { role: 'menu', className: 'nz-menu-list', 'data-slot': 'menu-list', 'aria-label': id },
      ...rows,
    ),
  );
}

const menuSeparator = (): unknown =>
  h('div', { role: 'separator', className: 'nz-menu-separator', 'data-slot': 'menu-separator' });

/** The check every Select row carries (select.client.tsx); select.css shows it on the selected row only. */
const selectIndicator = (): unknown =>
  h('span', { className: 'nz-select-item-indicator', 'aria-hidden': 'true' }, glyphCheck());

function selectPopup(id: string, attrs: Props = null): unknown {
  return h(
    'div',
    {
      id,
      className: 'nz-select-popup',
      'data-slot': 'select-popup',
      'data-open': '',
      style: { '--nz-trigger-width': '240px', '--nz-transform-origin': 'top left' },
      ...attrs,
    },
    h(
      'div',
      {
        role: 'listbox',
        className: 'nz-select-list',
        'data-slot': 'select-list',
        'aria-label': id,
      },
      h(
        'div',
        { role: 'group', className: 'nz-select-group', 'data-slot': 'select-group' },
        h(
          'div',
          { className: 'nz-select-group-label', 'data-slot': 'select-group-label' },
          'Recent',
        ),
        h(
          'div',
          {
            role: 'option',
            className: 'nz-select-item',
            'data-slot': 'select-item',
            'data-focus-inset': '',
            'aria-selected': 'false',
            'data-highlighted': '',
          },
          'Last 7 days',
          selectIndicator(),
        ),
        h(
          'div',
          {
            role: 'option',
            className: 'nz-select-item',
            'data-slot': 'select-item',
            'data-focus-inset': '',
            'aria-selected': 'true',
            'data-selected': '',
          },
          'Last 30 days',
          selectIndicator(),
        ),
      ),
      h('div', {
        role: 'presentation',
        className: 'nz-select-separator',
        'data-slot': 'select-separator',
      }),
      h(
        'div',
        {
          role: 'option',
          className: 'nz-select-item',
          'data-slot': 'select-item',
          'data-focus-inset': '',
          'aria-disabled': 'true',
          'data-disabled': '',
        },
        'All time',
        selectIndicator(),
      ),
    ),
  );
}

function tooltipPopup(id: string, label: string, attrs: Props = null): unknown {
  return h(
    'div',
    {
      id,
      role: 'tooltip',
      className: 'nz-tooltip-popup',
      'data-slot': 'tooltip-popup',
      'data-open': '',
      'data-side': 'top',
      ...attrs,
    },
    label,
  );
}

function dialog(id: string, size: string | undefined): unknown {
  return h(
    'div',
    { className: 'nz-dialog-frame', id },
    h(
      'div',
      { className: 'nz-dialog-positioner', 'data-slot': 'dialog-positioner', 'data-open': '' },
      h('div', {
        className: 'nz-dialog-backdrop',
        'data-slot': 'dialog-backdrop',
        'data-open': '',
        'aria-hidden': 'true',
      }),
      h(
        'div',
        {
          className: 'nz-dialog-popup',
          'data-slot': 'dialog-popup',
          'data-open': '',
          ...(size !== undefined && { 'data-size': size }),
        },
        h(
          'section',
          {
            role: 'dialog',
            className: 'nz-dialog-content',
            'data-slot': 'dialog-content',
            'aria-labelledby': `${id}-title`,
          },
          h(
            'h2',
            { id: `${id}-title`, className: 'nz-dialog-title', 'data-slot': 'dialog-title' },
            'Delete “Stoneware mug”?',
          ),
          h(
            'p',
            { className: 'nz-dialog-description', 'data-slot': 'dialog-description' },
            'This can’t be undone.',
          ),
          h(
            'div',
            { className: 'nz-dialog-footer', 'data-slot': 'dialog-footer' },
            h(C.Button, { className: 'nz-dialog-close', 'data-slot': 'dialog-close' }, 'Cancel'),
            h(C.Button, { variant: 'critical', id: `${id}-delete` }, 'Delete'),
          ),
        ),
      ),
    ),
  );
}

// ---------- w5-components.html: computed sizes and geometry ----------

const tabRow = (rtl: boolean): unknown =>
  h(
    'div',
    { dir: rtl ? 'rtl' : undefined, className: rtl ? 'nzf-tabs-rtl' : 'nzf-tabs-ltr' },
    h(
      C.TabsRoot,
      { defaultValue: 'all' },
      h(
        C.TabsList,
        { 'aria-label': rtl ? 'Order status (RTL)' : 'Order status' },
        h(C.TabsTab, { value: 'all' }, 'All orders'),
        h(C.TabsTab, { value: 'unpaid', icon: h(I.Package), count: 12 }, 'Unpaid'),
        h(C.TabsTab, { value: 'archived' }, 'Archived'),
      ),
      h(C.TabsPanel, { value: 'all' }, 'Every order from the last 90 days.'),
    ),
  );

const switches = (rtl: boolean): unknown =>
  h(
    'div',
    { dir: rtl ? 'rtl' : undefined, className: rtl ? 'nzf-switch-rtl' : 'nzf-switch-ltr' },
    h(C.Switch, { defaultChecked: true }, rtl ? 'RTL on' : 'On'),
    h(C.Switch, null, rtl ? 'RTL off' : 'Off'),
  );

const segmentedItems = (labels: readonly string[]): unknown[] =>
  labels.map((label) => h(C.SegmentedItem, { key: label, value: label }, label));

function componentsBody(): string {
  const specimens = [
    section(
      'button',
      'Button',
      h(
        C.Inline,
        { gap: '2' },
        h(C.Button, { id: 'btn-md', variant: 'primary', leadingIcon: h(I.ArrowRight) }, 'Save'),
        h(C.Button, { id: 'btn-sm', size: 'sm' }, 'Small'),
        h(C.Button, { id: 'btn-lg', size: 'lg', leadingIcon: h(I.Calendar) }, 'Large'),
        h(C.Button, { id: 'btn-disabled', disabled: true }, 'Disabled'),
      ),
      h('div', { className: 'nzf-w300' }, h(C.Button, { id: 'btn-full', fullWidth: true }, 'Full')),
      // The documented link path (render={<Link />}): an <a> gets no border box from the UA sheet.
      h(C.Button, { id: 'btn-link', render: h('a', { href: '#orders' }) }, 'Orders'),
      h(
        'div',
        { className: 'nzf-w300' },
        h(
          C.Button,
          { id: 'btn-link-full', render: h('a', { href: '#orders' }), fullWidth: true },
          'All orders',
        ),
      ),
      h(
        'div',
        { 'data-nz-touch-targets': 'always' },
        h(C.Button, { id: 'btn-hit', size: 'sm' }, 'Hit'),
      ),
    ),
    section(
      'icon-button',
      'IconButton',
      h(
        C.Inline,
        { gap: '2' },
        h(C.IconButton, { id: 'ib-md', label: 'Notifications', icon: h(I.Bell) }),
        h(C.IconButton, { id: 'ib-sm', size: 'sm', label: 'Search', icon: h(I.Search) }),
        h(C.IconButton, { id: 'ib-lg', size: 'lg', label: 'Calendar', icon: h(I.Calendar) }),
      ),
    ),
    section(
      'alert',
      'Alert',
      h(
        C.Alert,
        {
          id: 'alert-ltr',
          icon: h(I.Info),
          title: 'Payouts move to daily on Nov 1',
          dismiss: h(C.AlertDismiss, null, h(I.X)),
        },
        'No action needed.',
      ),
      h(
        'div',
        { dir: 'rtl' },
        h(
          C.Alert,
          {
            id: 'alert-rtl',
            icon: h(I.Info),
            title: 'Payouts move to daily',
            dismiss: h(C.AlertDismiss, null, h(I.X)),
          },
          'No action needed.',
        ),
      ),
    ),
    section(
      'badge',
      'Badge',
      h(C.Badge, { id: 'badge', tone: 'success' }, 'Paid'),
      ' ',
      h(C.Delta, { id: 'delta', value: 0.124, comparison: 'vs last week' }),
    ),
    section(
      'card',
      'Card',
      h(
        C.CardRoot,
        { id: 'card-ltr' },
        h(
          C.CardHeader,
          null,
          h(C.CardTitle, null, 'Top products'),
          h(C.CardDescription, null, 'Last 30 days'),
          h(C.CardAction, null, h(C.Button, { variant: 'tertiary', size: 'sm' }, 'View all')),
        ),
        h(C.CardBody, null, 'Stoneware mug'),
        h(C.CardFooter, null, h(C.Button, { size: 'sm' }, 'Export')),
      ),
      h(
        'div',
        { dir: 'rtl' },
        h(
          C.CardRoot,
          { id: 'card-rtl' },
          h(
            C.CardHeader,
            null,
            h(C.CardTitle, null, 'Top products'),
            h(C.CardAction, null, h(C.Button, { variant: 'tertiary', size: 'sm' }, 'View all')),
          ),
        ),
      ),
    ),
    section(
      'empty-state',
      'EmptyState',
      h(C.EmptyState, {
        id: 'empty',
        title: 'No orders yet, share your store to get your first order today',
        media: h(
          'svg',
          { viewBox: '0 0 140 140', width: 140, height: 140, 'aria-hidden': 'true' },
          h('rect', { x: 30, y: 40, width: 80, height: 70, rx: 8, fill: 'currentColor' }),
        ),
        actions: h(C.Button, { variant: 'primary' }, 'Share your store'),
      }),
    ),
    section(
      'field',
      'Field and Fieldset',
      h(
        C.Field,
        { id: 'field', label: 'Product title', description: 'Shown on product pages.' },
        h(C.Input, { name: 'title', placeholder: 'e.g. Stoneware mug' }),
      ),
      h(
        C.Fieldset,
        { id: 'fieldset', legend: 'Notify me about', description: 'Emails go to the owner.' },
        h(C.Checkbox, { name: 'notify', value: 'orders', defaultChecked: true }, 'New orders'),
        h(C.Checkbox, { name: 'notify', value: 'stock', id: 'cb-mixed' }, 'Low stock'),
      ),
      h(
        C.RadioGroup,
        {
          id: 'radios',
          legend: 'Weight unit',
          name: 'unit',
          defaultValue: 'kg',
          orientation: 'horizontal',
        },
        h(C.Radio, { value: 'kg' }, 'Kilograms'),
        h(C.Radio, { value: 'lb' }, 'Pounds'),
      ),
    ),
    section(
      'inline-error',
      'InlineError',
      h(C.InlineError, { id: 'ie-one', icon: h(I.CircleX) }, 'Enter a price above zero.'),
      h(
        'div',
        { className: 'nzf-w160' },
        h(
          C.InlineError,
          { id: 'ie-wrap', icon: h(I.CircleX) },
          'Couldn’t load revenue for the selected period.',
        ),
      ),
    ),
    section(
      'type',
      'Kbd, Heading and Text',
      h('p', null, 'Search with ', h(C.Kbd, { id: 'kbd', keys: 'mod+k' }), '.'),
      h(C.Heading, { id: 'h1', level: 1 }, 'Good morning, Asha'),
      h(C.Text, { id: 'text-s', variant: 'body-s', tone: 'tertiary' }, 'Updated 2 min ago'),
      h(C.Text, { id: 'text-kpi', variant: 'numeric-kpi', render: h('span') }, '₹4,82,190'),
    ),
    section(
      'layout',
      'Stack, Inline, Container and Separator',
      h(C.Stack, { id: 'stack', gap: '4' }, h('div', null, 'Order #1040'), h('div', null, 'Paid')),
      h(
        'div',
        { className: 'nzf-w160' },
        h(
          C.Inline,
          { id: 'inline', gap: '2' },
          h(C.Button, null, 'Save'),
          h(C.Button, null, 'Cancel'),
          h(C.Button, null, 'Later'),
        ),
      ),
      h(C.Container, { id: 'container' }, h('p', null, 'Page content')),
      h(
        C.Stack,
        { gap: '3' },
        h('div', null, 'Subtotal'),
        h(C.Separator, { id: 'sep-h' }),
        h(
          C.Inline,
          { id: 'sep-row', gap: '3' },
          h('span', null, 'Edit'),
          h(C.Separator, { id: 'sep-v', orientation: 'vertical', decorative: true }),
          h('span', null, 'Archive'),
        ),
      ),
    ),
    section(
      'image',
      'Image',
      h(
        'div',
        { className: 'nzf-w200' },
        h(C.Image, {
          id: 'img-45',
          src: 'pixel.svg',
          alt: 'A',
          width: 800,
          height: 1000,
          ratio: '4/5',
          priority: true,
        }),
      ),
      h(
        'div',
        { className: 'nzf-w320' },
        h(C.Image, {
          id: 'img-169',
          src: 'pixel.svg',
          alt: 'B',
          width: 300,
          height: 300,
          ratio: '16/9',
          priority: true,
        }),
      ),
    ),
    section(
      'skeleton',
      'Skeleton',
      h('div', { className: 'nzf-font14' }, h(C.Skeleton, { id: 'sk-line' })),
      h(C.Stack, { className: 'nzf-font40' }, h(C.Skeleton, { id: 'sk-circle', shape: 'circle' })),
      h(
        C.Stack,
        null,
        h(C.Skeleton, {
          id: 'sk-circle-48',
          shape: 'circle',
          style: { '--nz-skeleton-height': '48px' },
        }),
      ),
    ),
    section(
      'controls',
      'Checkbox, Switch, SegmentedControl',
      h(C.Checkbox, { id: 'cb', defaultChecked: true }, 'Checked'),
      switches(false),
      switches(true),
      h(
        'div',
        { id: 'seg-md' },
        h(
          C.SegmentedRoot,
          { 'aria-label': 'Range', defaultValue: '7D' },
          ...segmentedItems(['7D', '30 days', '12M']),
        ),
      ),
      h(
        'div',
        { id: 'seg-sm' },
        h(
          C.SegmentedRoot,
          { 'aria-label': 'Range small', size: 'sm', defaultValue: '7D' },
          ...segmentedItems(['7D', '30D']),
        ),
      ),
      h(
        'div',
        { id: 'seg-lg' },
        h(
          C.SegmentedRoot,
          { 'aria-label': 'Range large', size: 'lg', defaultValue: '7D' },
          ...segmentedItems(['7D', '30D']),
        ),
      ),
      h(
        'div',
        { id: 'seg-full', className: 'nzf-w480' },
        h(
          C.SegmentedRoot,
          { 'aria-label': 'Range full', fullWidth: true, defaultValue: 'Day' },
          ...segmentedItems(['Day', 'Week', 'Month']),
        ),
      ),
    ),
    section(
      'inputs',
      'Input, Textarea, NativeSelect',
      h(
        'div',
        { className: 'nzf-w320 nzf-grid' },
        h(C.Input, { id: 'in-md', 'aria-label': 'Search', leadingIcon: h(I.Search) }),
        h(C.Input, { id: 'in-sm', 'aria-label': 'Small', size: 'sm' }),
        h(C.Input, { id: 'in-lg', 'aria-label': 'Large', size: 'lg' }),
        h(
          'div',
          { dir: 'rtl' },
          h(C.Input, {
            id: 'in-rtl',
            'aria-label': 'Price',
            prefix: '₹',
            suffix: 'kg',
            defaultValue: '240',
          }),
        ),
      ),
      h(
        'div',
        { className: 'nzf-w420 nzf-grid' },
        h(C.Textarea, { id: 'ta-2', 'aria-label': 'Two rows', rows: 2 }),
        h(C.Textarea, { id: 'ta-6', 'aria-label': 'Six rows', rows: 6 }),
        h(C.Textarea, {
          id: 'ta-full',
          'aria-label': 'Eight lines',
          rows: 2,
          defaultValue: '1\n2\n3\n4\n5\n6\n7\n8',
        }),
      ),
      h(
        'div',
        { className: 'nzf-w320 nzf-grid' },
        h(
          C.NativeSelect,
          { id: 'ns-ltr', 'aria-label': 'Country', placeholder: 'Choose a country' },
          h('option', { value: 'IN' }, 'India'),
        ),
        h(
          'div',
          { dir: 'rtl' },
          h(
            C.NativeSelect,
            { id: 'ns-rtl', 'aria-label': 'Country (RTL)', defaultValue: 'IN' },
            h('option', { value: 'IN' }, 'India'),
          ),
        ),
      ),
    ),
    section(
      'select',
      'Select (trigger from the server; popup composed open)',
      h(
        C.SelectRoot,
        { 'aria-label': 'Period', defaultValue: '30d', id: 'select-root' },
        h(C.SelectTrigger, null),
        h(C.SelectPopup, null, h(C.SelectItem, { value: '30d' }, 'Last 30 days')),
      ),
      h('div', { className: 'nzf-popup-host' }, selectPopup('select-popup')),
      h(
        'div',
        { className: 'nzf-popup-host' },
        selectPopup('select-entering', { 'data-entering': '' }),
      ),
    ),
    section(
      'menu',
      'Menu (trigger from the server; popups composed open)',
      h(
        C.MenuRoot,
        null,
        h(C.MenuTrigger, { render: h(C.Button, { id: 'menu-trigger' }) }, 'Actions'),
        h(C.MenuPopup, null, h(C.MenuItem, null, 'Edit')),
      ),
      h(
        'div',
        { className: 'nzf-popup-host' },
        menuPopup(
          'menu-plain',
          { '--nz-transform-origin': 'top left' },
          null,
          menuItem('item', 'Edit', { icon: h(I.Calendar), shortcut: 'mod+e' }),
          menuItem('item', 'Disabled', { attrs: { 'aria-disabled': 'true', 'data-disabled': '' } }),
          menuSeparator(),
          menuItem('item', 'Delete', { attrs: { 'data-tone': 'critical' } }),
        ),
      ),
      h(
        'div',
        { className: 'nzf-popup-host' },
        menuPopup(
          'menu-checkable',
          { '--nz-trigger-width': '300px', '--nz-transform-origin': 'top left' },
          null,
          menuItem('item', 'Columns', { attrs: { id: 'menu-plain-row' } }),
          menuItem('checkbox-item', 'Price', { checked: true, attrs: { id: 'menu-checked' } }),
          menuItem('checkbox-item', 'Stock', { attrs: { id: 'menu-unchecked' } }),
        ),
      ),
      h(
        'div',
        { className: 'nzf-popup-host' },
        menuPopup(
          'menu-short',
          { '--nz-available-height': '120px', '--nz-transform-origin': 'top left' },
          null,
          ...['One', 'Two', 'Three', 'Four', 'Five', 'Six'].map((label) => menuItem('item', label)),
        ),
      ),
      h(
        'div',
        { className: 'nzf-popup-host' },
        menuPopup(
          'menu-entering',
          { '--nz-transform-origin': 'top left' },
          { 'data-entering': '' },
          menuItem('item', 'Entering'),
        ),
        menuPopup(
          'menu-exiting',
          { '--nz-transform-origin': 'top left' },
          { 'data-exiting': '' },
          menuItem('item', 'Exiting'),
        ),
      ),
    ),
    section(
      'tooltip',
      'Tooltip (popups composed open)',
      h('div', { className: 'nzf-popup-host' }, tooltipPopup('tip-short', 'Refresh data')),
      h(
        'div',
        { className: 'nzf-popup-host' },
        tooltipPopup(
          'tip-long',
          'Download the report as CSV, with every order and refund in the selected period and store',
        ),
      ),
      h(
        'div',
        { className: 'nzf-popup-host' },
        tooltipPopup('tip-entering', 'Entering', { 'data-entering': '' }),
      ),
    ),
    section(
      'dialog',
      'Dialog (composed open inside a transformed frame)',
      dialog('dialog-md', undefined),
      dialog('dialog-sm', 'sm'),
    ),
    section(
      'tabs',
      'Tabs and TabNav',
      tabRow(false),
      tabRow(true),
      h(
        C.TabNavRoot,
        { id: 'tabnav', 'aria-label': 'Customers' },
        h(C.TabNavLink, { href: '?vip', current: true, count: 24 }, 'VIP'),
        h(C.TabNavLink, { href: '?all' }, 'All'),
        h(C.TabNavLink, { href: '?subscribers' }, 'Subscribers'),
      ),
    ),
    section(
      'progress',
      'ProgressBar, Meter, ProgressRing',
      h(C.ProgressBar, { id: 'pb', label: 'Monthly goal', value: 68 }),
      h(C.Meter, { id: 'meter', label: 'Plan storage', value: 40 }),
      h(
        C.Inline,
        { gap: '4' },
        h(C.ProgressRing, { id: 'ring-md', 'aria-label': 'Store setup', value: 25 }),
        h(C.ProgressRing, { id: 'ring-sm', 'aria-label': 'Small', value: 25, size: 'sm' }),
        h(C.ProgressRing, { id: 'ring-lg', 'aria-label': 'Large', value: 25, size: 'lg' }),
      ),
    ),
    section(
      'icons',
      '@nizivo/icons: 1em sizing and RTL mirroring',
      h(
        'p',
        { id: 'icon-sizes' },
        h('span', { className: 'nzf-font13' }, h(I.ArrowRight)),
        h('span', { className: 'nzf-font24' }, h(I.Calendar)),
        h('span', { className: 'nzf-font40' }, h(I.Instagram)),
      ),
      h(
        'p',
        { id: 'icon-ltr' },
        h(I.ArrowRight, { id: 'icon-ltr-arrow' }),
        h(I.ChevronRight, { id: 'icon-ltr-chevron' }),
      ),
      h(
        'p',
        { id: 'icon-rtl', dir: 'rtl' },
        h(I.ArrowRight, { id: 'icon-rtl-arrow' }),
        h(I.ChevronRight, { id: 'icon-rtl-chevron' }),
        h(I.ArrowRight, { id: 'icon-rtl-optout', mirror: false }),
        h(I.Calendar, { id: 'icon-rtl-calendar' }),
      ),
    ),
  ];
  // one render, so useId gives every Field and engine part a distinct id
  return html(h('div', { id: 'controls', 'data-nz-theme': 'light' }, ...specimens));
}

const componentsStyle = `/* computed style is read at once after a state change, so nothing may be mid-transition */
#controls *,
#controls *::before,
#controls *::after {
  transition-duration: 0s !important;
  animation-play-state: paused !important;
}
#controls section {
  margin-block: 1.5rem;
}
#controls h2 {
  font: 600 14px/1.4 ui-sans-serif, system-ui, sans-serif;
}
.nzf-w160 { inline-size: 160px; }
.nzf-w200 { inline-size: 200px; }
.nzf-w300 { inline-size: 300px; }
.nzf-w320 { inline-size: 320px; }
.nzf-w420 { inline-size: 420px; }
.nzf-w480 { inline-size: 480px; }
.nzf-grid { display: grid; gap: 12px; margin-block: 12px; }
.nzf-font13 { font-size: 13px; }
.nzf-font14 { font-size: 14px; }
.nzf-font24 { font-size: 24px; }
.nzf-font40 { font-size: 40px; }
/* engines position popups with an inline style; here they sit in the flow */
.nzf-popup-host { display: flex; gap: 16px; align-items: flex-start; margin-block: 12px; }
/* a transform makes the frame the containing block of the dialog's fixed positioner */
.nz-dialog-frame {
  position: relative;
  inline-size: 640px;
  max-inline-size: 100%;
  block-size: 480px;
  transform: translateZ(0);
  overflow: hidden;
  margin-block: 12px;
}`;

// ---------- w5-paint.html: fills and indicators sampled from a screenshot ----------

function paintBody(): string {
  const bar = (id: string, rtl: boolean, kind: 'pb' | 'meter'): unknown =>
    h(
      'div',
      { className: 'nzp-row', id, dir: rtl ? 'rtl' : undefined },
      kind === 'pb'
        ? h(C.ProgressBar, { 'aria-label': id, value: 30, showValue: false })
        : h(C.Meter, { 'aria-label': id, value: 30, showValue: false }),
    );
  const body = [
    bar('pb-ltr', false, 'pb'),
    bar('pb-rtl', true, 'pb'),
    bar('meter-ltr', false, 'meter'),
    bar('meter-rtl', true, 'meter'),
    h(
      'div',
      { className: 'nzp-row nzp-flex' },
      h(C.ProgressRing, { id: 'ring', 'aria-label': 'Ring', value: 25 }),
      h(
        'div',
        { className: 'nzp-skeleton-bed', id: 'sk-bed' },
        h(C.Skeleton, { id: 'sk', shape: 'circle' }),
      ),
    ),
    h(
      'div',
      { className: 'nzp-row', id: 'tabs-paint' },
      h(
        C.TabsRoot,
        { defaultValue: 'b' },
        h(
          C.TabsList,
          { 'aria-label': 'Paint tabs' },
          h(C.TabsTab, { value: 'a' }, 'Orders'),
          h(C.TabsTab, { value: 'b' }, 'Unpaid'),
          h(C.TabsTab, { value: 'c' }, 'Open'),
        ),
      ),
    ),
    h(
      'div',
      { className: 'nzp-row', id: 'tabnav-paint' },
      h(
        C.TabNavRoot,
        { 'aria-label': 'Paint links' },
        h(C.TabNavLink, { href: '?a' }, 'Orders'),
        h(C.TabNavLink, { href: '?b', current: true }, 'Unpaid'),
        h(C.TabNavLink, { href: '?c' }, 'Open'),
      ),
    ),
    h(
      'div',
      { className: 'nzp-row', id: 'seg-paint' },
      h(
        C.SegmentedRoot,
        { 'aria-label': 'Paint range', defaultValue: 'b' },
        ...segmentedItems(['a', 'b', 'c']),
      ),
    ),
    h(
      'div',
      { className: 'nzp-row nzp-flex' },
      h('div', { id: 'switch-ltr' }, h(C.Switch, { defaultChecked: true, 'aria-label': 'LTR' })),
      h(
        'div',
        { id: 'switch-rtl', dir: 'rtl' },
        h(C.Switch, { defaultChecked: true, 'aria-label': 'RTL' }),
      ),
    ),
  ];
  return html(h('div', { id: 'paint', 'data-nz-theme': 'light' }, ...body));
}

// Red is the part under test (fill, indicator, thumb), blue what is around it: the runner's sampler
// reads them as L and D. The hooks are the components' public ones, so this also checks they work.
const paintStyle = `#paint {
  --nzp-red: rgb(255 0 0);
  --nzp-blue: rgb(0 0 255);
  --nz-progress-bar-fill: var(--nzp-red);
  --nz-progress-bar-track-bg: var(--nzp-blue);
  --nz-progress-bar-height: 16px;
  --nz-meter-fill: var(--nzp-red);
  --nz-meter-track-bg: var(--nzp-blue);
  --nz-meter-height: 16px;
  --nz-progress-ring-fill: var(--nzp-red);
  --nz-progress-ring-track-bg: var(--nzp-blue);
  --nz-tabs-indicator: var(--nzp-red);
  --nz-tab-nav-indicator: var(--nzp-red);
  --nz-segmented-control-thumb-bg: var(--nzp-red);
  --nz-segmented-control-bg: var(--nzp-blue);
  --nz-switch-thumb-bg: var(--nzp-red);
  --nz-switch-thumb-shadow: none;
  --nz-switch-accent: var(--nzp-blue);
  --nz-skeleton-bg: var(--nzp-red);
  --nz-skeleton-height: 48px;
  inline-size: 340px;
}
#paint *,
#paint *::before,
#paint *::after {
  transition-duration: 0s !important;
  animation: none !important;
}
.nzp-row { margin-block-end: 10px; }
.nzp-flex { display: flex; gap: 24px; align-items: center; }
/* the strips' own background is the blue around the red indicator */
#paint .nz-tabs-list,
#paint .nz-tab-nav { background: var(--nzp-blue); }
.nzp-skeleton-bed { padding: 4px; background: var(--nzp-blue); }`;

// ---------- w5-grid-frame.html: one Grid, loaded at three widths by w5-grid.html ----------

function gridFrameBody(): string {
  const item = (id: string, span: unknown) =>
    h(C.GridItem, { id, span, className: 'nzg-item' }, id);
  const body = [
    h(
      C.Container,
      { id: 'container' },
      h(
        C.Grid,
        { id: 'grid' },
        item('span-full', 'full'),
        item('span-8-lg', { base: 'full', lg: 8 }),
        item('span-4-lg', { base: 'full', lg: 4 }),
        item('span-4-sm-3-lg', { base: 'full', sm: 4, lg: 3 }),
        item('span-12', 12),
        item('span-6', 6),
        item('span-1', 1),
        item('span-default', undefined),
      ),
      h(C.Grid, { id: 'grid-gap', gap: '2' }, item('gap-a', 1), item('gap-b', 1)),
    ),
  ];
  return html(h('div', null, ...body));
}

const gridFrame = (): string =>
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Floor lane: grid frame</title>
<!-- GENERATED by gen-w5.ts from packages/react/dist; do not edit. Loaded by w5-grid.html in iframes. -->
<link rel="stylesheet" href="plan-tokens.css" />
<link rel="stylesheet" href="react-css/base.css" />
<link rel="stylesheet" href="react-css/container.css" />
<link rel="stylesheet" href="react-css/grid.css" />
<style>
body { margin: 0; font: 12px/1.4 ui-sans-serif, system-ui, sans-serif; }
.nzg-item { block-size: 24px; background: #cbd0c8; overflow: hidden; }
</style>
</head>
<body data-nz-theme="light">
${gridFrameBody()}
</body>
</html>
`;

// ---------- output ----------

/** Fails when a hand-composed popup uses a class the built stylesheets no longer define. */
function assertClassesExist(pageHtml: string): void {
  const css = sheets()
    .map((name) => readFileSync(join(cssDir, name), 'utf8'))
    .join('\n');
  const used = new Set<string>();
  for (const [, list] of pageHtml.matchAll(/\sclass="([^"]*)"/g)) {
    for (const name of (list ?? '').split(/\s+/)) if (name.startsWith('nz-')) used.add(name);
  }
  // only the overlay parts are composed here; the rest is the components' own output
  const composed = /^nz-(select|menu|tooltip|dialog)-/;
  const missing = [...used].filter(
    (name) => composed.test(name) && name !== 'nz-dialog-frame' && !css.includes(`.${name}`),
  );
  if (missing.length > 0)
    throw new Error(`classes with no rule in dist/css: ${missing.join(', ')}`);
}

const outputs: Record<string, string> = {
  'w5-components.html': page({
    title: 'Floor lane: week 5 components',
    heading: 'Every v0.1 component on the floor: computed sizes and geometry',
    intro:
      'The server HTML of the built @nizivo/react (renderToStaticMarkup), under tokens.css and every shipped stylesheet. Each check reads computed style or a box, so it shows whether the browser applied the rule. Open popups are composed from the engine DOM, because React Aria renders none on the server.',
    style: componentsStyle,
    body: componentsBody(),
    script: 'w5-components.js',
    head: html(h(C.ThemeScript, null)),
  }),
  'w5-paint.html': page({
    title: 'Floor lane: week 5 painted fills',
    heading: 'Fills and indicators, painted',
    intro:
      'Red is the part under test, blue is what surrounds it, set through the components’ public hooks. The runner samples a screenshot at each probe; by hand, compare each probe with its label in the table.',
    style: paintStyle,
    body: paintBody(),
    script: 'w5-paint.js',
  }),
  'w5-grid-frame.html': gridFrame(),
};

for (const content of Object.values(outputs)) assertClassesExist(content);

// oxfmt formats the pages exactly as the repo's format check expects, so a fresh render compares equal.
function format(dir: string, names: string[]): void {
  const oxfmt = join(repo, 'node_modules', '.bin', 'oxfmt');
  const config = `--config=${join(repo, '.oxfmtrc.json')}`;
  const done = spawnSync(oxfmt, [config, ...names], { cwd: dir, encoding: 'utf8' });
  if (done.status !== 0) throw new Error(`oxfmt failed: ${done.stderr}${done.stdout}`);
}

const { values } = parseArgs({ options: { check: { type: 'boolean', default: false } } });
const names = Object.keys(outputs);
if (values.check) {
  const dir = mkdtempSync(join(tmpdir(), 'nz-floor-gen-'));
  try {
    for (const [name, content] of Object.entries(outputs)) writeFileSync(join(dir, name), content);
    format(dir, names);
    const stale = names.filter((name) => {
      const fresh = readFileSync(join(dir, name), 'utf8');
      let committed = '';
      try {
        committed = readFileSync(join(pagesDir, name), 'utf8');
      } catch {
        return true;
      }
      return fresh !== committed;
    });
    if (stale.length > 0) {
      console.error(`stale: ${stale.join(', ')} (run node fixtures/floor-lane/gen-w5.ts)`);
      process.exitCode = 1;
    } else console.log(`up to date: ${names.join(', ')}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else {
  for (const [name, content] of Object.entries(outputs))
    writeFileSync(join(pagesDir, name), content);
  format(pagesDir, names);
  console.log(`wrote ${names.map((name) => `pages/${name}`).join(', ')}`);
}
