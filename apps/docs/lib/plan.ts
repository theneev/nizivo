// Links into the plan, docs/ARCHITECTURE.md. Reference text in the API records and the plan's own
// table cells cites sections as `§12.2`; the docs turn each citation into a link to that heading on
// GitHub, so a reader can follow it (components/inline-md.tsx).
import { readRepoText, repoFileUrl } from './repo';

const PLAN = 'docs/ARCHITECTURE.md';

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
  anchors = new Map();
  for (const line of readRepoText(PLAN).split('\n')) {
    const m = /^#{2,4} (\d+(?:\.\d+)*)\.? .+$/.exec(line);
    if (m?.[1] !== undefined && !anchors.has(m[1])) {
      anchors.set(m[1], githubSlug(line.replace(/^#+ /, '')));
    }
  }
  return anchors;
}

/** The plan section `number` on GitHub; the plan itself when it has no such heading. */
export function planSectionUrl(number: string): string {
  const anchor = sectionAnchors().get(number);
  return `${repoFileUrl(PLAN)}${anchor === undefined ? '' : `#${anchor}`}`;
}
