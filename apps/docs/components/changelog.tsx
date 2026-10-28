// The Changelog page (M90): every release of the four published packages, from their CHANGELOG.md
// files (scripts/site.ts writes .generated/changelog.json at build). Server-rendered; the notes'
// inline Markdown (code, emphasis, links) is rendered here, since Changesets writes nothing else.
import type { JSX, ReactNode } from 'react';
import { readRepoJson } from '../lib/repo';

interface Group {
  kind: string;
  notes: string[];
}
interface Release {
  version: string;
  groups: Group[];
}
type Log = Record<string, Release[]>;

const NAMES: Record<string, string> = {
  react: '@nizivo/react',
  tokens: '@nizivo/tokens',
  icons: '@nizivo/icons',
  charts: '@nizivo/charts',
};

function isLog(value: unknown): value is Log {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((releases) => Array.isArray(releases))
  );
}

/** `code`, **strong**, *emphasis* and [links](url), the inline Markdown a changeset uses. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0;
  for (const m of text.matchAll(pattern)) {
    const start = m.index;
    if (start > at) out.push(text.slice(at, start));
    const key = `${start}`;
    if (m[1] !== undefined) out.push(<code key={key}>{m[1]}</code>);
    else if (m[2] !== undefined) out.push(<strong key={key}>{inline(m[2])}</strong>);
    else if (m[3] !== undefined) out.push(<em key={key}>{inline(m[3])}</em>);
    else
      out.push(
        <a key={key} href={m[5]}>
          {inline(m[4] ?? '')}
        </a>,
      );
    at = start + m[0].length;
  }
  if (at < text.length) out.push(text.slice(at));
  return out;
}

/** The releases of every package, newest first; a release with no notes says it only followed the others. */
export function Changelog(): JSX.Element {
  const log = readRepoJson(
    'apps/docs/.generated/changelog.json',
    isLog,
    'run `node scripts/generate.ts` in apps/docs (the docs build runs it first)',
  );
  const react = log['react'] ?? [];
  return (
    <div className="nz-docs-changelog">
      {react.map((release) => (
        <section key={release.version} aria-labelledby={`v${release.version}`}>
          <h2 id={`v${release.version}`}>{release.version}</h2>
          {Object.entries(log).map(([pkg, releases]) => {
            const notes = releases
              .find((r) => r.version === release.version)
              ?.groups.filter((g) => g.notes.length > 0);
            if (notes === undefined || notes.length === 0) return null;
            return (
              <div key={pkg}>
                <h3>{NAMES[pkg] ?? pkg}</h3>
                {notes.map((group) => (
                  <div key={group.kind}>
                    <p className="nz-docs-changelog-kind">{group.kind} changes</p>
                    <ul>
                      {group.notes.map((note) => (
                        <li key={note}>{inline(note)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
