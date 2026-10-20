// The chart conformance suite (ARCHITECTURE.md §14.1, §10.8 "Renderer seam", seam ledger K9). What
// ChartFrame guarantees around ANY child, a Nizivo renderer or a third-party one:
//
// - the figure and its caption, the title naming the server-rendered data table (§16),
// - the status contract (§16.5): data-loading | data-empty | data-error, aria-busy while loading,
//   the plot's child only while ready, the same box (the same slots) in all four statuses,
// - the frame's strings forwarded (`labels`, §16.4), and `titleVisibility` (M42): with `'hidden'`
//   the caption is visually hidden, not removed, so it still names the figure,
// - no inline style (CSP Profile B, §19.3), classes `nz-*` and data-* from contracts/vocabulary.json,
// - and the keyboard claim, which depends on who draws the plot:
//   `interaction: 'nizivo'`: a Nizivo renderer, whose ChartInteraction island is in the SERVER markup
//     while ready: at least one named tab stop and exactly one polite live region (Figma 03: a
//     focusable layer, ←/→/Home/End/PageUp/PageDown/Esc, active point text to a polite region);
//     nothing of it in the other statuses (the island renders only when ready).
//   `interaction: 'none'`: no tab stop and no live region in any status. For a third-party child
//     (`child` given) that holds for the frame's own markup, and the child reaches the plot
//     verbatim; the frame still owns caption, table, legend and status. That is the whole K9 claim:
//     keyboard access is only claimed for Nizivo renderers. A Nizivo renderer that makes no keyboard
//     claim yet (no island) registers with 'none' too, and all its markup is checked.
//
// Every framed chart part runs it with one call in test/conformance/<part>.conformance.test.tsx:
//
//   chartConformance({ part: 'area-chart', interaction: 'nizivo', render: (frame) => <AreaChart {...PROPS} {...frame} /> });
//
// `frame` carries only what every renderer forwards to ChartFrame (status, labels,
// titleVisibility). The run is on
// react-dom/server output, where a 'use client' island renders its initial markup, which is what a
// user without JavaScript (or before hydration) gets. test/conformance/coverage.test.ts fails while a
// part that renders ChartFrame has no registration.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type {
  ChartFrameLabels,
  ChartInteractionMode,
  ChartTitleVisibility,
  DataStatus,
} from '../../src/chart-frame/chart-frame.contract';
import { PACKAGE_DIR } from '../helpers/source';
import {
  all,
  byClass,
  bySlot,
  classes,
  descendants,
  isLiveRegion,
  isTabStop,
  parse,
  textOf,
  within,
  type Node,
} from './markup';

/** What the suite passes to a part, and what every renderer forwards to its ChartFrame. */
export interface FrameForward {
  status: DataStatus;
  labels?: Partial<ChartFrameLabels>;
  titleVisibility?: ChartTitleVisibility;
}

export interface ChartConformanceCase {
  /** The part's folder under src/ (`area-chart`), or a description for ChartFrame's own cases. */
  part: string;
  /** Who claims the keyboard: `'nizivo'` (the island) or `'none'` (a third-party child). */
  interaction: ChartInteractionMode;
  /** Renders the part with sample data that has at least one row, spreading `frame` last. */
  render: (frame: FrameForward) => ReactElement;
  /**
   * A third-party case only: the child as passed. The suite then checks that it reaches the plot
   * verbatim (nothing added to it or beside it) and leaves its markup alone (its classes, data-*
   * and styles are its own). Without it, every element is Nizivo's and checked, including a Nizivo
   * renderer that makes no keyboard claim (`interaction: 'none'`, no island).
   */
  child?: ReactElement;
}

export const STATUSES: readonly DataStatus[] = ['ready', 'loading', 'empty', 'error'];

/** Translated strings no default contains, to see them come through. */
export const FORWARDED: Pick<ChartFrameLabels, 'loading' | 'empty' | 'error'> = {
  loading: 'Diagramm wird geladen',
  empty: 'Keine Daten',
  error: 'Diagramm konnte nicht geladen werden',
};

const VOCABULARY = readVocabulary();

interface VocabularyEntry {
  presence: boolean;
  values: string[] | null;
}

function readVocabulary(): Map<string, VocabularyEntry> {
  const file = join(PACKAGE_DIR, '..', '..', 'contracts', 'vocabulary.json');
  const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const out = new Map<string, VocabularyEntry>();
  if (typeof parsed !== 'object' || parsed === null) return out;
  for (const group of Object.values(parsed)) {
    if (!Array.isArray(group)) continue;
    for (const entry of group as unknown[]) {
      if (typeof entry !== 'object' || entry === null) continue;
      const name: unknown = Reflect.get(entry, 'name');
      const values: unknown = Reflect.get(entry, 'values');
      if (typeof name !== 'string') continue;
      out.set(name, {
        presence: Reflect.get(entry, 'presence') === true,
        values: Array.isArray(values) ? values.map(String) : null,
      });
    }
  }
  return out;
}

/** One rendered status, parsed, with the parts the checks look at. */
interface Rendered {
  status: DataStatus;
  markup: string;
  figure: Node;
  plot: Node | undefined;
  /** The markup Nizivo owns: all of it, or all but a third-party `child`. */
  owned: Node[];
}

function render(c: ChartConformanceCase, frame: FrameForward): Rendered {
  const markup = renderToStaticMarkup(c.render(frame));
  const root = parse(markup);
  const [figure] = root.children;
  if (figure === undefined) throw new Error(`${c.part}: rendered nothing`);
  const [plot] = all(figure, bySlot('chart-frame-plot'));
  const owned = [figure, ...descendants(figure)].filter(
    (node) => c.child === undefined || plot === undefined || node === plot || !within(node, plot),
  );
  return { status: frame.status, markup, figure, plot, owned };
}

function accessibleName(node: Node, figure: Node): string {
  const label = node.attrs.get('aria-label')?.trim();
  if (label !== undefined && label !== '') return label;
  const ids = node.attrs.get('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? [];
  const byId = new Map(
    all(figure, (n) => n.attrs.has('id')).map((n) => [n.attrs.get('id') ?? '', n]),
  );
  const labelled = ids.map((id) => {
    const target = byId.get(id);
    return target === undefined ? '' : textOf(target).trim();
  });
  if (labelled.length > 0) return labelled.every(Boolean) ? labelled.join(' ') : '';
  return ['button', 'a', 'summary'].includes(node.tag) ? textOf(node).trim() : '';
}

/** The frame's slots in order, minus what only one status has (as test/ssr/chart-frame.test.tsx). */
function box(r: Rendered): string[] {
  return [r.figure, ...descendants(r.figure)]
    .map((node) => node.attrs.get('data-slot') ?? '')
    .filter((slot) => /^(chart-frame|legend)/.test(slot))
    .filter((slot) => !/skeleton|table/.test(slot));
}

/** Everything wrong with one status, as readable lines ([] when it conforms). */
export function statusProblems(c: ChartConformanceCase, frame: FrameForward): string[] {
  const r = render(c, frame);
  const problems: string[] = [];
  const { figure, plot, status } = r;
  const flag = (ok: boolean, message: string) => {
    if (!ok) problems.push(`${status}: ${message}`);
  };

  // The figure, its caption first, the title with an id.
  flag(
    figure.tag === 'figure' && figure.attrs.get('data-slot') === 'chart-frame',
    `the root is <${figure.tag} data-slot="${figure.attrs.get('data-slot') ?? ''}">, not the frame's <figure>`,
  );
  flag(classes(figure).includes('nz-chart-frame'), 'the figure has no nz-chart-frame class');
  const [first] = figure.children;
  flag(first?.tag === 'figcaption', 'the <figcaption> is not the figure’s first child');
  const titles = all(figure, byClass('nz-chart-frame-title'));
  const title = titles[0];
  const titleId = title?.attrs.get('id') ?? '';
  flag(
    titles.length === 1 && title !== undefined && first !== undefined && within(title, first),
    `${titles.length} titles, or the title is outside the caption`,
  );
  flag(titleId !== '' && textOf(title ?? figure).trim() !== '', 'the title has no id or no text');
  // titleVisibility (M42): 'hidden' hides the caption visually and keeps it in the markup, so the
  // figcaption still names the figure and the title the table
  const hidden = first !== undefined && classes(first).includes('nz-chart-visually-hidden');
  flag(
    hidden === (frame.titleVisibility === 'hidden'),
    hidden
      ? 'the caption is visually hidden without titleVisibility="hidden"'
      : `the caption is not visually hidden with titleVisibility="${frame.titleVisibility ?? 'visible'}"`,
  );
  flag(figure.attrs.has('data-x-direction'), 'no data-x-direction on the figure');
  flag(plot !== undefined, 'no chart-frame-plot');

  // The status contract (§16.5).
  for (const other of ['loading', 'empty', 'error'] as const) {
    const on = figure.attrs.get(`data-${other}`);
    flag(
      other === status ? on === '' : on === undefined,
      `data-${other} is ${on === undefined ? 'absent' : `"${on}"`}`,
    );
  }
  const busy = figure.attrs.get('aria-busy');
  flag(
    status === 'loading' ? busy === 'true' : busy === undefined,
    `aria-busy is ${busy ?? 'absent'}`,
  );
  const message = { ...FORWARDED, ...frame.labels };
  if (status === 'loading') {
    flag(all(figure, bySlot('chart-frame-skeleton')).length === 1, 'no skeleton while loading');
  }
  if (status !== 'ready' && plot !== undefined) {
    flag(all(plot, (n) => n.tag === 'svg').length === 0, 'the plot draws while not ready');
    if (frame.labels !== undefined) {
      flag(textOf(plot).includes(message[status]), `the plot does not say "${message[status]}"`);
    }
  }

  // The accessible alternative: a table named by the title, only while ready.
  const tables = all(figure, bySlot('chart-frame-table'));
  if (status === 'ready') {
    const [table] = tables;
    flag(tables.length === 1 && table?.tag === 'table', `${tables.length} data tables`);
    if (table !== undefined) {
      flag(table.attrs.get('aria-labelledby') === titleId, 'the table is not named by the title');
      const heads = all(table, (n) => n.tag === 'th' && n.attrs.get('scope') === 'col');
      const rows = all(table, (n) => n.tag === 'tr' && n.parent?.tag === 'tbody');
      flag(heads.length >= 2, `${heads.length} column headers`);
      flag(rows.length >= 1, 'the table has no rows');
      flag(
        rows.every(
          (row) => row.children[0]?.tag === 'th' && row.children[0].attrs.get('scope') === 'row',
        ),
        'a row does not start with <th scope="row">',
      );
      flag(
        rows.every((row) => row.children.length === heads.length),
        'a row has a different number of cells than there are columns',
      );
    }
  } else {
    flag(tables.length === 0, 'a data table while not ready');
  }

  // Ticks are a picture of the table's values: hidden from assistive technology.
  for (const ticks of [
    ...all(figure, bySlot('chart-frame-x-ticks')),
    ...all(figure, bySlot('chart-frame-y-ticks')),
  ]) {
    flag(
      ticks.attrs.get('aria-hidden') === 'true',
      `${ticks.attrs.get('data-slot') ?? ''} is not aria-hidden`,
    );
  }

  // CSP Profile B, the class and data-* vocabulary, on the markup Nizivo owns.
  for (const node of r.owned) {
    flag(
      !node.attrs.has('style'),
      `inline style on <${node.tag} class="${node.attrs.get('class') ?? ''}">`,
    );
    for (const token of classes(node)) {
      flag(
        /^nz-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(token),
        `class "${token}" is not nz-<part>[-<element>]`,
      );
    }
    for (const [attr, value] of node.attrs) {
      if (!attr.startsWith('data-')) continue;
      const entry = VOCABULARY.get(attr);
      if (entry === undefined) {
        flag(false, `${attr} is not in contracts/vocabulary.json`);
      } else if (entry.presence) {
        flag(value === '', `${attr}="${value}" is a presence attribute`);
      } else if (entry.values !== null && entry.values.length > 0) {
        flag(
          entry.values.includes(value),
          `${attr}="${value}" is not one of ${entry.values.join(', ')}`,
        );
      }
    }
    const tabindex = node.attrs.get('tabindex');
    flag(
      tabindex === undefined || Number(tabindex) <= 0,
      `tabindex="${tabindex ?? ''}" (positive)`,
    );
  }

  // The keyboard claim.
  const stops = r.owned.filter(
    (node) =>
      isTabStop(node) &&
      !(node.tag === 'summary' && node.parent?.attrs.get('data-slot') === 'chart-frame-details'),
  );
  const live = r.owned.filter((node) => isLiveRegion(node));
  if (c.interaction === 'nizivo' && status === 'ready') {
    flag(stops.length >= 1, 'no tab stop: the keyboard claim of a Nizivo renderer does not hold');
    for (const stop of stops) {
      flag(
        accessibleName(stop, figure) !== '',
        `the tab stop <${stop.tag}> has no accessible name`,
      );
    }
    flag(
      live.length === 1 && live[0]?.attrs.get('aria-live') === 'polite',
      `${live.length} live regions (want exactly one, aria-live="polite")`,
    );
  } else {
    flag(
      stops.length === 0,
      `${stops.length} tab stops (${stops.map((n) => n.tag).join(', ')}) where no keyboard claim is made`,
    );
    flag(live.length === 0, `${live.length} live regions where no keyboard claim is made`);
  }
  if (
    c.interaction === 'none' &&
    status === 'ready' &&
    c.child !== undefined &&
    plot !== undefined
  ) {
    const inner = plotInner(r.markup);
    flag(
      inner === renderToStaticMarkup(c.child),
      'the third-party child does not reach the plot verbatim',
    );
  }
  return problems;
}

/** The plot's inner markup, cut from the full markup (the child as React rendered it there). */
function plotInner(markup: string): string {
  const start = markup.indexOf('data-slot="chart-frame-plot"');
  const open = markup.indexOf('>', start) + 1;
  // the plot is followed by the x ticks or closes the body
  let depth = 1;
  const tag = /<(\/?)div\b[^>]*?(\/?)>/g;
  tag.lastIndex = open;
  for (let m = tag.exec(markup); m !== null; m = tag.exec(markup)) {
    if (m[2] === '/') continue;
    depth += m[1] === '/' ? -1 : 1;
    if (depth === 0) return markup.slice(open, m.index);
  }
  return markup.slice(open);
}

/** Problems across statuses: the same box in all four, the strings forwarded. */
export function caseProblems(c: ChartConformanceCase): string[] {
  const problems: string[] = [];
  const boxes = STATUSES.map((status) => box(render(c, { status })));
  const [ready] = boxes;
  STATUSES.forEach((status, i) => {
    const slots = boxes[i] ?? [];
    if (slots.join(' ') !== (ready ?? []).join(' ')) {
      problems.push(`${status}: the frame's slots differ from ready (${slots.join(' ')})`);
    }
  });
  for (const status of STATUSES) {
    problems.push(...statusProblems(c, { status, labels: FORWARDED }));
    problems.push(...statusProblems(c, { status, titleVisibility: 'hidden' }));
  }
  return problems;
}

/** Registers the suite for one part (see the header). */
export function chartConformance(c: ChartConformanceCase): void {
  describe(`${c.part}: chart conformance (K9, interaction "${c.interaction}")`, () => {
    test.each(STATUSES)(
      '%s: frame, status contract, table, vocabulary, keyboard claim',
      (status) => {
        expect(statusProblems(c, { status })).toEqual([]);
      },
    );

    test('the same box in all four statuses; the frame’s strings and titleVisibility come through', () => {
      expect(caseProblems(c)).toEqual([]);
    });
  });
}
