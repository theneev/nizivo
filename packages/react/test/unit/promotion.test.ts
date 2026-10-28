// The promotion ledger (figma/promotion.json, plan §20, D-ds): the committed file is well formed,
// each part's ids in its latest snapshot are still the part's canonical Figma ids, and the cycle
// rule counts what it should.
import { describe, expect, test } from 'vitest';
import ledgerJson from '../../figma/promotion.json';
import {
  canonicalIds,
  checkLedger,
  fnv1a,
  type FigmaReturn,
  type Ledger,
  snapshotFrom,
  status,
} from '../../scripts/figma/ledger';

const COMPONENTS = import.meta.glob('../../src/unstable/*/component.json', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const canonical = Object.fromEntries(
  Object.entries(COMPONENTS).map(([path, raw]) => {
    return [path.split('/').at(-2)!, canonicalIds(JSON.parse(raw))];
  }),
);

const ledger = ledgerJson as Ledger;

describe('the committed ledger', () => {
  test('is well formed', () => {
    expect(checkLedger(ledger)).toEqual([]);
    expect(ledger.snapshots.length).toBeGreaterThan(0);
  });

  test("each part's latest hashes are for its canonical Figma ids", () => {
    const latest = new Map<string, string[]>();
    for (const snapshot of ledger.snapshots) {
      for (const [part, hashes] of Object.entries(snapshot.parts))
        latest.set(part, Object.keys(hashes));
    }
    for (const [part, ids] of latest) {
      if (!(part in canonical)) continue; // promoted since: its history stays
      expect({ part, ids }).toEqual({ part, ids: canonical[part] });
    }
  });
});

const snap = (date: string, hash: string): Ledger['snapshots'][number] => ({
  date,
  parts: { chip: { '1:1': hash } },
});

describe('status', () => {
  test('a part becomes a candidate after two unchanged cycles a week apart', () => {
    const rows = status({
      snapshots: [
        snap('2026-10-28', 'aaaaaaaa'),
        snap('2026-11-04', 'aaaaaaaa'),
        snap('2026-11-11', 'aaaaaaaa'),
      ],
    });
    expect(rows).toEqual([
      { part: 'chip', since: '2026-10-28', cycles: 2, candidate: true, nextCycle: '2026-11-18' },
    ]);
  });

  test('a snapshot less than a week after the last counted one does not count', () => {
    const [row] = status({
      snapshots: [
        snap('2026-10-28', 'aaaaaaaa'),
        snap('2026-10-30', 'aaaaaaaa'),
        snap('2026-11-04', 'aaaaaaaa'),
      ],
    });
    expect(row).toMatchObject({ cycles: 1, candidate: false, nextCycle: '2026-11-11' });
  });

  test('a change starts the count again, even in a snapshot that would not count', () => {
    const [row] = status({
      snapshots: [
        snap('2026-10-28', 'aaaaaaaa'),
        snap('2026-11-04', 'aaaaaaaa'),
        snap('2026-11-06', 'bbbbbbbb'),
      ],
    });
    expect(row).toMatchObject({ since: '2026-11-06', cycles: 0, nextCycle: '2026-11-13' });
  });
});

describe('snapshotFrom', () => {
  const parts = [{ id: '1:1', found: true, hash: 'aaaaaaaa' }];
  const value: FigmaReturn = { part: 'unstable-sets', check: fnv1a(JSON.stringify(parts)), parts };

  test("keys a return's hashes by part", () => {
    expect(snapshotFrom(value, '2026-10-28', { chip: ['1:1'] })).toEqual(
      snap('2026-10-28', 'aaaaaaaa'),
    );
  });

  test('refuses a return edited after Figma hashed it', () => {
    const edited = { ...value, parts: [{ ...parts[0]!, hash: 'bbbbbbbb' }] };
    expect(() => snapshotFrom(edited, '2026-10-28', { chip: ['1:1'] })).toThrow(/check hash/);
  });

  test('refuses a return without one of the parts', () => {
    expect(() => snapshotFrom(value, '2026-10-28', { chip: ['1:1', '1:2'] })).toThrow(/missing/);
  });
});
