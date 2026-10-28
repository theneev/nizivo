// The site's facts, read from the repo at build time (M90), so the header and the changelog never
// drift from the packages: the version in @nizivo/react's package.json, and every release in the four
// published packages' CHANGELOG.md files (Changesets' format: `## <version>`, `### <kind> Changes`,
// then `- <hash>: <note>` with indented continuation lines).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** The packages whose changelogs the Changelog page shows, in the order it lists them. */
export const CHANGELOG_PACKAGES = ['react', 'tokens', 'icons', 'charts'] as const;

export interface ChangelogGroup {
  /** "Major", "Minor" or "Patch", as Changesets writes it. */
  kind: string;
  /** Each note in Markdown (inline code, links, emphasis), the commit hash dropped. */
  notes: string[];
}

export interface ChangelogRelease {
  version: string;
  groups: ChangelogGroup[];
}

export interface SiteFacts {
  version: string;
  changelog: Record<(typeof CHANGELOG_PACKAGES)[number], ChangelogRelease[]>;
}

/** One package's releases, newest first, as the file lists them. */
export function parseChangelog(text: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = [];
  let note: string[] | undefined;
  const flush = (group: ChangelogGroup | undefined): void => {
    if (group !== undefined && note !== undefined) group.notes.push(note.join(' ').trim());
    note = undefined;
  };
  let group: ChangelogGroup | undefined;
  for (const line of text.split('\n')) {
    const version = /^## (\S+)\s*$/.exec(line);
    const kind = /^### (\w+) Changes\s*$/.exec(line);
    const item = /^- (?:[0-9a-f]{7,40}: )?(.*)$/.exec(line);
    if (version !== null) {
      flush(group);
      group = undefined;
      releases.push({ version: version[1] ?? '', groups: [] });
    } else if (kind !== null) {
      flush(group);
      group = { kind: kind[1] ?? '', notes: [] };
      releases.at(-1)?.groups.push(group);
    } else if (item !== null && group !== undefined) {
      flush(group);
      note = [item[1] ?? ''];
    } else if (note !== undefined && /^\s+\S/.test(line)) {
      note.push(line.trim());
    } else if (line.trim() === '') {
      flush(group);
    }
  }
  flush(group);
  return releases;
}

export function siteFacts(repoRoot: string): SiteFacts {
  const read = (path: string): string => readFileSync(join(repoRoot, path), 'utf8');
  const manifest: unknown = JSON.parse(read('packages/react/package.json'));
  const version =
    typeof manifest === 'object' && manifest !== null && 'version' in manifest
      ? String(manifest.version)
      : '';
  const log = (name: string): ChangelogRelease[] =>
    parseChangelog(read(`packages/${name}/CHANGELOG.md`));
  return {
    version,
    changelog: {
      react: log('react'),
      tokens: log('tokens'),
      icons: log('icons'),
      charts: log('charts'),
    },
  };
}
