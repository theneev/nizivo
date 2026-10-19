// Every framed chart part runs the conformance suite (chart.conformance.tsx): a part whose source
// renders ChartFrame (imports ../chart-frame/) needs test/conformance/<part>.conformance.test.tsx,
// whose one call is
//   chartConformance({ part: '<part>', interaction: 'nizivo', render: (frame) => <Part {...PROPS} {...frame} /> });
// Parts that draw no frame (Sparkline, a tooltip, the legend) are not charts in the K9 sense.
import { readdirSync } from 'node:fs';
import { expect, test } from 'vitest';
import { sources, specifiers } from '../helpers/source';

const HERE = import.meta.dirname;

/** Parts (src/<part>/, not _internal folders) with a non-example module that imports ChartFrame. */
function framedParts(): string[] {
  const parts = new Set<string>();
  for (const [file, text] of sources()) {
    const [, part, name = ''] = file.split('/');
    if (part === undefined || part.startsWith('_') || part === 'chart-frame') continue;
    if (name.endsWith('.example.tsx')) continue;
    if (specifiers(text).some((s) => /^\.\.\/chart-frame(?:\/|$)/.test(s))) parts.add(part);
  }
  return [...parts].toSorted();
}

test('every part that renders ChartFrame registers with the chart conformance suite', () => {
  const registered = new Set(
    readdirSync(HERE)
      .filter((name) => name.endsWith('.conformance.test.tsx'))
      .map((name) => name.replace(/\.conformance\.test\.tsx$/, '')),
  );
  expect(registered.has('chart-frame')).toBe(true);
  expect(framedParts().filter((part) => !registered.has(part))).toEqual([]);
});

test('the detector reads the frame import the way parts write it', () => {
  expect(framedParts()).not.toContain('legend');
  const found = specifiers("import { ChartFrame } from '../chart-frame/chart-frame';");
  expect(found.some((s) => /^\.\.\/chart-frame(?:\/|$)/.test(s))).toBe(true);
});
