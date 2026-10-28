// The promotion ledger's command line (plan §20, D-ds; the rules are in ledger.ts).
//
//   node scripts/figma/promotion.ts ids                    the ids to set in parts.figma.js
//   node scripts/figma/promotion.ts record <return.json> [YYYY-MM-DD]
//                                                          add a snapshot (default date: today)
//   node scripts/figma/promotion.ts status                 each part's cycles and candidates
//
// <return.json> is the parts.figma.js return saved verbatim, outside the repo (PROMOTION-AGENT.md).
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canonicalIds,
  checkLedger,
  DATE,
  isFigmaReturn,
  isLedger,
  type Ledger,
  snapshotFrom,
  status,
} from './ledger.ts';

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const UNSTABLE_DIR = resolve(PACKAGE_ROOT, 'src/unstable');
const LEDGER_PATH = resolve(PACKAGE_ROOT, 'figma/promotion.json');

/** The unstable parts and their canonical Figma ids, from each `component.json`. */
function unstableParts(dir: string = UNSTABLE_DIR): Record<string, string[]> {
  const parts: Record<string, string[]> = {};
  for (const name of readdirSync(dir).toSorted()) {
    const file = resolve(dir, name, 'component.json');
    if (!existsSync(file)) continue;
    const ids = canonicalIds(JSON.parse(readFileSync(file, 'utf8')));
    if (ids.length > 0) parts[name] = ids;
  }
  return parts;
}

function readLedger(path: string = LEDGER_PATH): Ledger {
  if (!existsSync(path)) return { snapshots: [] };
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isLedger(value)) throw new Error(`${path}: ${checkLedger(value).join('; ')}`);
  return value;
}

function main(argv: string[]): number {
  const [command, file, dateArg] = argv;
  if (command === 'ids') {
    console.log(JSON.stringify(Object.values(unstableParts()).flat()));
    return 0;
  }
  if (command === 'record' && file !== undefined) {
    const date = dateArg ?? new Date().toISOString().slice(0, 10);
    if (!DATE.test(date)) throw new Error(`${date} is not YYYY-MM-DD`);
    const ledger = readLedger();
    const last = ledger.snapshots.at(-1);
    if (last !== undefined && last.date >= date) {
      throw new Error(`the ledger already has a snapshot on or after ${date} (${last.date})`);
    }
    const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!isFigmaReturn(value)) throw new Error(`${file} is not a parts.figma.js return`);
    ledger.snapshots.push(snapshotFrom(value, date, unstableParts()));
    writeFileSync(LEDGER_PATH, `${JSON.stringify(ledger, null, 2)}\n`);
    console.log(`recorded ${date}: ${Object.keys(ledger.snapshots.at(-1)!.parts).length} parts`);
    return main(['status']);
  }
  if (command === 'status') {
    const rows = status(readLedger());
    for (const row of rows) {
      const mark = row.candidate ? 'candidate' : `next cycle from ${row.nextCycle}`;
      console.log(`${row.part.padEnd(20)} since ${row.since}  cycles ${row.cycles}  ${mark}`);
    }
    const recorded = new Set(rows.map((r) => r.part));
    for (const part of Object.keys(unstableParts())) {
      if (!recorded.has(part)) console.log(`${part.padEnd(20)} no snapshot yet`);
    }
    const candidates = rows.filter((r) => r.candidate).length;
    console.log(`${rows.length} parts, ${candidates} candidate(s)`);
    return 0;
  }
  console.error('Usage: promotion.ts ids | record <return.json> [YYYY-MM-DD] | status');
  return 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  process.exitCode = main(process.argv.slice(2));
