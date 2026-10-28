// The promotion ledger's rules (plan §20, D-ds), with no Node imports so the unit test can load
// them: a part is a candidate for promotion from `unstable/*` once its Figma set has stayed the
// same for two sync cycles, and a snapshot counts as a cycle when it is at least seven days after
// the last one that counted for that part. The CLI is promotion.ts.
export const MIN_DAYS_BETWEEN_CYCLES = 7;
export const CYCLES_TO_PROMOTE = 2;

/** Each part's Figma set hashes, keyed by node id. */
export type PartHashes = Record<string, string>;

export interface Snapshot {
  date: string;
  parts: Record<string, PartHashes>;
}

export interface Ledger {
  snapshots: Snapshot[];
}

export interface PartStatus {
  part: string;
  /** The snapshot where the part's set first appeared or last changed. */
  since: string;
  cycles: number;
  candidate: boolean;
  /** The earliest date the next snapshot counts as a cycle for this part. */
  nextCycle: string;
}

/** FNV-1a (32 bit) over UTF-16 code units: the same function parts.figma.js runs. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export const DATE: RegExp = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const days = (from: string, to: string): number =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;

const addDays = (date: string, n: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const same = (a: PartHashes, b: PartHashes): boolean => {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k]);
};

/** Each part in the latest snapshot, walked through the ledger oldest first. */
export function status(ledger: Ledger): PartStatus[] {
  const latest = ledger.snapshots.at(-1);
  if (latest === undefined) return [];
  return Object.keys(latest.parts)
    .toSorted()
    .map((part) => {
      let previous: PartHashes | undefined;
      let since = '';
      let counted = '';
      let cycles = 0;
      for (const snapshot of ledger.snapshots) {
        const hashes = snapshot.parts[part];
        if (hashes === undefined) continue;
        if (previous === undefined || !same(previous, hashes)) {
          since = snapshot.date;
          counted = snapshot.date;
          cycles = 0;
        } else if (days(counted, snapshot.date) >= MIN_DAYS_BETWEEN_CYCLES) {
          counted = snapshot.date;
          cycles++;
        }
        previous = hashes;
      }
      return {
        part,
        since,
        cycles,
        candidate: cycles >= CYCLES_TO_PROMOTE,
        nextCycle: addDays(counted, MIN_DAYS_BETWEEN_CYCLES),
      };
    });
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const NODE_ID = /^\d+:\d+$/;
const HASH = /^[0-9a-f]{8}$/;

/** What is wrong with a ledger read from disk; empty when it is a well-formed `Ledger`. */
export function checkLedger(value: unknown): string[] {
  if (!isRecord(value) || !Array.isArray(value.snapshots)) return ['`snapshots` is not an array'];
  const problems: string[] = [];
  let last = '';
  for (const snapshot of value.snapshots as unknown[]) {
    if (!isRecord(snapshot) || typeof snapshot.date !== 'string' || !DATE.test(snapshot.date)) {
      problems.push('a snapshot has no YYYY-MM-DD date');
      continue;
    }
    const { date, parts } = snapshot;
    if (date <= last) problems.push(`snapshot ${date} is not after ${last}`);
    last = date;
    if (!isRecord(parts)) {
      problems.push(`snapshot ${date} has no parts`);
      continue;
    }
    for (const [part, hashes] of Object.entries(parts)) {
      if (!isRecord(hashes)) {
        problems.push(`${date} ${part}: no hashes`);
        continue;
      }
      for (const [id, hash] of Object.entries(hashes)) {
        if (!NODE_ID.test(id)) problems.push(`${date} ${part}: ${id} is not a node id`);
        if (typeof hash !== 'string' || !HASH.test(hash)) {
          problems.push(`${date} ${part}: ${id} has no hash`);
        }
      }
    }
  }
  return problems;
}

export const isLedger = (value: unknown): value is Ledger => checkLedger(value).length === 0;

/** A part's canonical Figma ids, from its parsed `component.json`. */
export function canonicalIds(json: unknown): string[] {
  if (!isRecord(json) || !isRecord(json.figma) || !Array.isArray(json.figma.canonical)) return [];
  return json.figma.canonical.filter((id): id is string => typeof id === 'string');
}

export interface FigmaReturn {
  part: string;
  check: string;
  parts: { id: string; found: boolean; hash?: string }[];
}

export const isFigmaReturn = (value: unknown): value is FigmaReturn =>
  isRecord(value) &&
  value.part === 'unstable-sets' &&
  typeof value.check === 'string' &&
  Array.isArray(value.parts) &&
  value.parts.every(
    (p: unknown) =>
      isRecord(p) &&
      typeof p.id === 'string' &&
      typeof p.found === 'boolean' &&
      (p.hash === undefined || typeof p.hash === 'string'),
  );

/** A snapshot from a parts.figma.js return, checked against its own hash and the parts' ids. */
export function snapshotFrom(
  value: FigmaReturn,
  date: string,
  parts: Record<string, string[]>,
): Snapshot {
  if (fnv1a(JSON.stringify(value.parts)) !== value.check) {
    throw new Error('the return does not match its check hash: was it saved verbatim?');
  }
  const byId = new Map(value.parts.map((p) => [p.id, p]));
  const snapshot: Snapshot = { date, parts: {} };
  for (const [part, ids] of Object.entries(parts)) {
    const hashes: PartHashes = {};
    for (const id of ids) {
      const read = byId.get(id);
      if (read === undefined) throw new Error(`${part}: ${id} is missing from the return`);
      if (!read.found || read.hash === undefined) throw new Error(`${part}: ${id} is not in Figma`);
      hashes[id] = read.hash;
    }
    snapshot.parts[part] = hashes;
  }
  return snapshot;
}
