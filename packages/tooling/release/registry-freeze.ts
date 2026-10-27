// The copy-paste registry at release (ARCHITECTURE.md §19.3, D-dj; RELEASING.md "Deploying the
// docs"): a released version's items are frozen into apps/docs/registry/v<version>/ and served as
// frozen, so the frozen files must be what this commit builds. A pattern or component-sheet fix that
// lands after the freeze would otherwise publish packages whose registry describes other CSS.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { patternNames } from '../../../apps/docs/scripts/examples.ts';
import {
  buildItems,
  FROZEN_DIR,
  packageVersions,
  versionFiles,
} from '../../../apps/docs/scripts/registry.ts';

export interface RegistryFreeze {
  /** Whether apps/docs/registry/v<version>/ exists. */
  frozen: boolean;
  /** Frozen files that differ from (or are missing in) a build of this commit, by name. */
  drift: string[];
}

export function registryFreeze(version: string): RegistryFreeze {
  const dir = join(FROZEN_DIR, `v${version}`);
  if (!existsSync(dir)) return { frozen: false, drift: [] };
  const built = versionFiles(buildItems(patternNames(), packageVersions()), version);
  const names = new Set([...built.keys(), ...readdirSync(dir)]);
  const drift = [...names]
    .filter((name) => {
      const file = join(dir, name);
      return !existsSync(file) || readFileSync(file, 'utf8') !== built.get(name);
    })
    .toSorted();
  return { frozen: true, drift };
}
