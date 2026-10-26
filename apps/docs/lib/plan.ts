// Links into the plan, docs/ARCHITECTURE.md. Reference text in the API records and the plan's own
// table cells cites sections as `§12.2`; the docs turn each citation into a link to that heading on
// GitHub, so a reader can follow it (components/inline-md.tsx).
//
// The docs never read the plan itself: `nz gen` copies what they need (its numbered headings, §18.2
// and §23.4) into lib/plan.json, so the build hashes that file, not the whole plan.
import { isRecord } from '../scripts/json';
import { readRepoJson, repoFileUrl } from './repo';

const PLAN = 'docs/ARCHITECTURE.md';
const EXTRACT = 'apps/docs/lib/plan.json';

interface PlanExtract {
  /** `12.2` → `12.2 Focus`, the plan's first heading with that number. */
  headings: Record<string, string>;
  /** `18.2` → the section's text, from its number to the next heading. */
  sections: Record<string, string>;
}

const strings = (value: unknown): value is Record<string, string> =>
  isRecord(value) && Object.values(value).every((v) => typeof v === 'string');

function isPlanExtract(value: unknown): value is PlanExtract {
  return isRecord(value) && strings(value['headings']) && strings(value['sections']);
}

let extract: PlanExtract | undefined;

/** lib/plan.json, read once per build. */
export function planExtract(): PlanExtract {
  extract ??= readRepoJson(EXTRACT, isPlanExtract, 'run `pnpm nz gen`');
  return extract;
}

/** The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens. */
export function githubSlug(heading: string): string {
  return heading
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replaceAll(' ', '-');
}

let anchors: Map<string, string> | undefined;

/** `12.2` → the anchor of the plan's `### 12.2 …` heading (`## 12. …` for a chapter). */
function sectionAnchors(): Map<string, string> {
  if (anchors) return anchors;
  anchors = new Map(
    Object.entries(planExtract().headings).map(([number, heading]) => [
      number,
      githubSlug(heading),
    ]),
  );
  return anchors;
}

/** The plan section `number` on GitHub; the plan itself when it has no such heading. */
export function planSectionUrl(number: string): string {
  const anchor = sectionAnchors().get(number);
  return `${repoFileUrl(PLAN)}${anchor === undefined ? '' : `#${anchor}`}`;
}
