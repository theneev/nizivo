import type { JSX } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import vocabulary from '../../../../contracts/vocabulary.json' with { type: 'json' };
import allowlist from '../../src/_engines/react-aria/dom-allowlist.json' with { type: 'json' };
import { AlertDismissibleExample, AlertExample } from '../../src/alert/alert.example';
import { BadgeExample } from '../../src/badge/badge.example';
import { Button } from '../../src/button/index';
import { ButtonExample } from '../../src/button/button.example';
import { CardExample } from '../../src/card/card.example';
import { ContainerExample } from '../../src/container/container.example';
import { DeltaExample } from '../../src/delta/delta.example';
import { DialogExample, DialogOpenExample } from '../../src/dialog/dialog.example';
import { EmptyStateExample } from '../../src/empty-state/empty-state.example';
import { GridExample } from '../../src/grid/grid.example';
import { HeadingExample } from '../../src/heading/heading.example';
import { ImageExample } from '../../src/image/image.example';
import { InlineErrorExample } from '../../src/inline-error/inline-error.example';
import { InlineExample } from '../../src/inline/inline.example';
import { KbdExample } from '../../src/kbd/kbd.example';
import {
  MenuCheckboxExample,
  MenuExample,
  MenuOpenExample,
  MenuRowActionsExample,
} from '../../src/menu/menu.example';
import { MeterExample } from '../../src/meter/meter.example';
import { ProgressBarExample } from '../../src/progress-bar/progress-bar.example';
import { ProgressRingExample } from '../../src/progress-ring/progress-ring.example';
import { Select } from '../../src/select/index';
import { SelectExample, SelectOpenExample } from '../../src/select/select.example';
import { SeparatorExample } from '../../src/separator/separator.example';
import { SkeletonExample } from '../../src/skeleton/skeleton.example';
import { StackExample } from '../../src/stack/stack.example';
import { TextExample } from '../../src/text/text.example';
import { TooltipExample, TooltipOpenExample } from '../../src/tooltip/tooltip.example';

const examples: Record<string, () => JSX.Element> = {
  ButtonExample,
  SelectExample,
  SelectOpenExample,
  DialogExample,
  DialogOpenExample,
  TooltipExample,
  TooltipOpenExample,
  TextExample,
  HeadingExample,
  StackExample,
  InlineExample,
  GridExample,
  ContainerExample,
  SeparatorExample,
  KbdExample,
  ImageExample,
  AlertExample,
  AlertDismissibleExample: () => <AlertDismissibleExample />,
  BadgeExample,
  CardExample,
  DeltaExample,
  EmptyStateExample,
  InlineErrorExample,
  MeterExample,
  ProgressBarExample,
  ProgressRingExample,
  SkeletonExample,
  MenuExample,
  MenuRowActionsExample,
  MenuCheckboxExample,
  MenuOpenExample,
};

const allowed = new Set([
  ...Object.values(vocabulary)
    .filter((group) => Array.isArray(group))
    .flat()
    .map((entry: { name: string }) => entry.name),
  ...allowlist.attributes,
]);

/** The `data-*` names on every documented part (an element with `data-slot`). */
function partAttributes(html: string): string[] {
  const names = new Set<string>();
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*\bdata-slot="[^"]*"[^>]*>/g)) {
    for (const [, name] of tag.matchAll(/\s(data-[a-z0-9-]+)=/g)) if (name) names.add(name);
  }
  return [...names];
}

/** The first opening tag whose class list contains `className`. */
function openingTag(html: string, className: string): string {
  for (const [tag] of html.matchAll(/<[a-z0-9]+\s[^>]*>/g)) {
    const classes = /\sclass="([^"]*)"/.exec(tag)?.[1]?.split(' ') ?? [];
    if (classes.includes(className)) return tag;
  }
  throw new Error(`no element with class ${className}`);
}

describe('renderToString (Node, default condition)', () => {
  const errors = vi.fn<(...args: unknown[]) => void>();
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(errors);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    errors.mockReset();
  });

  for (const [name, Example] of Object.entries(examples)) {
    test(`${name} renders without errors and stays inside the vocabulary`, () => {
      const html = renderToString(<Example />);
      expect(html.length).toBeGreaterThan(0);
      expect(errors).not.toHaveBeenCalled();
      // Engine classes and engine-only state attributes never reach a documented part.
      expect(html).not.toMatch(/react-aria-[A-Z]/);
      const outside = partAttributes(html).filter((attr) => !allowed.has(attr));
      expect(outside).toEqual([]);
    });
  }

  test('Button: variants as attributes, link render without type, pending stays focusable', () => {
    const html = renderToString(<ButtonExample />);
    expect(html).toContain(
      '<button data-slot="button" data-variant="primary" data-size="md" class="nz-button nz-hit-target"',
    );
    expect(html).toMatch(
      /<a href="\/orders"[^>]*data-full-width=""[^>]*class="nz-button nz-hit-target"/,
    );
    expect(html).not.toMatch(/<a [^>]*type=/);
    expect(html).toMatch(/<button[^>]*data-pending=""[^>]*type="button"[^>]*aria-disabled="true"/);
    expect(html).toMatch(/<button[^>]*data-variant="critical"[^>]*disabled=""/);
    // §14.2 settled 7: 1.92 on the 24 viewBox, sized by the slot's font-size.
    expect(html).toMatch(
      /<svg class="nz-glyph nz-glyph-spinner"[^>]*width="1em"[^>]*stroke-width="1.92"/,
    );
  });

  test('Select: parts, size and the hidden native select for forms', () => {
    const html = renderToString(<SelectExample />);
    expect(html).toContain('class="nz-select" data-slot="select" data-size="md"');
    expect(html).toContain('class="nz-select-trigger nz-hit-target" data-slot="select-trigger"');
    expect(html).toContain('data-slot="select-value">Last 30 days</span>');
    expect(html).toMatch(/<select[^>]*name="period"/);
    // S-1: render on every DOM part; Value is the one that renders on the server.
    const composed = renderToString(
      <Select.Root defaultValue="7d" aria-label="Period">
        <Select.Trigger>
          <Select.Value render={(props) => <span {...props} title="period" />} />
        </Select.Trigger>
        <Select.Popup>
          <Select.Item value="7d">Last 7 days</Select.Item>
        </Select.Popup>
      </Select.Root>,
    );
    expect(composed).toMatch(/<span[^>]*class="nz-select-value"[^>]*title="period"/);
  });

  test('Select: open on the server marks the trigger but renders no popup', () => {
    const html = renderToString(<SelectOpenExample />);
    expect(html).toMatch(/data-slot="select-trigger"[^>]*data-invalid=""[^>]*data-open=""/);
    // React Aria's open-as-pressed convention never reaches the vocabulary.
    expect(html).not.toContain('data-pressed');
    expect(html).toContain('data-placeholder="">Choose a period</span>');
    expect(html).not.toContain('nz-select-popup');
  });

  test('Dialog: a server Button is the trigger; closed and server-open dialogs render no popup', () => {
    const html = renderToString(<DialogExample />);
    expect(html).toMatch(/<button[^>]*class="nz-button nz-hit-target nz-dialog-trigger"/);
    expect(html).toContain('aria-expanded="false"');
    const open = renderToString(<DialogOpenExample />);
    expect(open).toMatch(/data-slot="dialog-trigger" data-open=""/);
    expect(open).not.toContain('data-pressed');
    expect(open).not.toContain('nz-dialog-popup');
  });

  test('a Button composed into a part keeps the part data-slot and size, with no repeated class', () => {
    const dialog = openingTag(renderToString(<DialogExample />), 'nz-dialog-trigger');
    expect(dialog).toContain('data-slot="dialog-trigger"');
    expect(dialog).toContain('data-variant="critical"');
    const tooltip = openingTag(renderToString(<TooltipExample />), 'nz-tooltip-trigger');
    expect(tooltip).toContain('data-slot="tooltip-trigger"');
    const select = openingTag(
      renderToString(
        <Select.Root size="lg" aria-label="Period">
          <Select.Trigger render={<Button />} />
          <Select.Popup>
            <Select.Item value="7d">Last 7 days</Select.Item>
          </Select.Popup>
        </Select.Root>,
      ),
      'nz-select-trigger',
    );
    expect(select).toContain('data-slot="select-trigger"');
    expect(select).toContain('data-size="lg"');
    expect(select).toContain('class="nz-button nz-hit-target nz-select-trigger"');
  });

  test('Tooltip: a server-open trigger carries aria-describedby, the popup renders only after hydration, and the trigger never submits a form', () => {
    const html = renderToString(<TooltipOpenExample />);
    const id = /<button[^>]*aria-describedby="([^"]+)"[^>]*class="nz-tooltip-trigger"/.exec(
      html,
    )?.[1];
    expect(id).toBeDefined();
    // React Aria renders no tooltip during SSR, so the IDREF dangles until hydration (engine gap).
    expect(html).not.toContain(`id="${id}"`);
    expect(html).toContain('type="button"');
    expect(renderToString(<TooltipExample />)).toContain(
      'nz-button nz-hit-target nz-tooltip-trigger',
    );
  });
});
