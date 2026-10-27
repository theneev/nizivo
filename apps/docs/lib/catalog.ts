// The list of documented entries, generated from @nizivo/react's exports map: a new subpath gets a
// page with no hand edit (ARCHITECTURE.md §18.2). A subpath with a component.json is a component;
// any other JS subpath (config, contracts, augment, i18n, locales/<tag>) is a utility entry.
import { hasExports, isRecord } from '../scripts/json';
import { readRepoJson, repoFileExists } from './repo';

/**
 * The fields of packages/react/src/<name>/component.json the docs read (gen/COMPONENT-JSON.md).
 * `interactive`, `focusTarget` and `stateIndicator` are read from contracts/api's slots instead.
 */
export interface ComponentManifest {
  name: string;
  status?: 'stable' | 'unstable';
  tier: 'server' | 'client' | 'engine' | 'own';
  engine?: string;
  overlay?: boolean;
  parts?: string[];
  exports?: string[];
  cssDeps?: string[];
  variants?: Record<string, string[]>;
  figma?: { canonical?: string[]; ghosts?: string[]; variantsSeen?: string[]; related?: string[] };
}

export interface CatalogEntry {
  /** The subpath without `./`: `progress-bar`, `locales/en-US`. */
  name: string;
  /** The exports key: `./progress-bar`. */
  entry: string;
  /** The import specifier: `@nizivo/react/progress-bar`. */
  specifier: string;
  kind: 'component' | 'utility';
  /** `ProgressBar`; for a utility entry, the subpath itself. */
  title: string;
  /** `/docs/components/progress-bar/`. */
  url: string;
  /** The stylesheet's exports key, when the exports map has `./css/<name>.css`. */
  stylesheet?: string;
  manifest?: ComponentManifest;
}

const REACT_PACKAGE = 'packages/react/package.json';

function isManifest(value: unknown): value is ComponentManifest {
  return isRecord(value) && typeof value.name === 'string' && typeof value.tier === 'string';
}

export function pascal(kebab: string): string {
  return kebab.replace(/(^|-)([a-z0-9])/g, (_m, _d: string, c: string) => c.toUpperCase());
}

let cached: CatalogEntry[] | undefined;

export function catalog(): CatalogEntry[] {
  if (cached) return cached;
  const keys = Object.keys(readRepoJson(REACT_PACKAGE, hasExports).exports);
  const entries: CatalogEntry[] = [];
  for (const key of keys) {
    // Files (./css/<name>.css, ./styles.css, ./package.json) are not JS entries.
    if (!key.startsWith('./') || /\.[a-z]+$/.test(key)) continue;
    // ./unstable/<name> is a component page at its bare name, marked unstable by its manifest
    const unstable = /^unstable\/([a-z0-9-]+)$/.exec(key.slice(2))?.[1];
    const name = unstable ?? key.slice(2);
    // ./locales/<tag> (a string catalogue) is a utility page at /docs/utilities/locales/<tag>/.
    const locale = /^locales\/([A-Za-z0-9-]+)$/.exec(name)?.[1];
    if (name.includes('/') && locale === undefined) {
      throw new Error(`docs: no page layout for the nested entry ${key} yet (lib/catalog.ts).`);
    }
    const manifestPath = `packages/react/src/${unstable === undefined ? '' : 'unstable/'}${name}/component.json`;
    const manifest = repoFileExists(manifestPath)
      ? readRepoJson(manifestPath, isManifest)
      : undefined;
    const kind = manifest ? 'component' : 'utility';
    const stylesheet = keys.includes(`./css/${name}.css`) ? `./css/${name}.css` : undefined;
    entries.push({
      name,
      entry: key,
      specifier: `@nizivo/react/${key.slice(2)}`,
      kind,
      // Utilities too, so the sidebar's Utilities group reads like the Components one.
      title: locale === undefined ? pascal(name) : `Locales/${locale}`,
      url: `/docs/${kind === 'component' ? 'components' : 'utilities'}/${name}/`,
      ...(stylesheet !== undefined && { stylesheet }),
      ...(manifest !== undefined && { manifest }),
    });
  }
  cached = entries.toSorted((a, b) => a.name.localeCompare(b.name));
  return cached;
}

/** Every `./css/<name>.css` key of the exports map. */
export function stylesheetKeys(): Set<string> {
  const keys = Object.keys(readRepoJson(REACT_PACKAGE, hasExports).exports);
  return new Set(keys.filter((k) => k.startsWith('./css/')));
}

export function findEntry(kind: CatalogEntry['kind'], name: string): CatalogEntry | undefined {
  return catalog().find((e) => e.kind === kind && e.name === name);
}
