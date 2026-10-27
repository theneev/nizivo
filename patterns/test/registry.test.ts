// The copy-paste registry's item policy (ARCHITECTURE.md §19.3, K13; D-dj): the items
// apps/docs/scripts/registry.ts builds from these patterns and the component sheets pass the
// linter, the linter catches each rule it states, and the build is the same on every run.
// fixtures/runner/registry.ts installs the same items with the shadcn CLI.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { patternNames } from '../../apps/docs/scripts/examples.ts';
import {
  buildItems,
  buildRegistry,
  frozenVersions,
  componentSheets,
  packageVersions,
  range,
  registryProblems,
  versionFiles,
  type RegistryItem,
} from '../../apps/docs/scripts/registry.ts';

const versions = packageVersions();
const items = buildItems(patternNames(), versions);
const react = `@nizivo/react@${range(versions.react)}`;

function find(name: string): RegistryItem {
  const found = items.find((item) => item.name === name);
  if (found === undefined) throw new Error(`no item ${name}`);
  return found;
}

/** The linter's findings for one changed copy of an item. */
function problemsOf(name: string, change: (item: RegistryItem) => RegistryItem): string[] {
  return registryProblems([change(structuredClone(find(name)))], versions);
}

describe('the items', () => {
  it('are init, every pattern and every stable component sheet, and pass the policy', () => {
    expect(items.map((item) => item.name)).toEqual([
      'init',
      ...patternNames(),
      ...componentSheets().map((c) => `${c}-css`),
    ]);
    expect(componentSheets()).toContain('button');
    expect(componentSheets()).not.toContain('base');
    expect(componentSheets()).not.toContain('command-menu');
    expect(registryProblems(items, versions)).toEqual([]);
  });

  it('depend on what their files import, at ~x.y.0', () => {
    expect(find('init').dependencies).toEqual([`@nizivo/icons@${range(versions.icons)}`, react]);
    expect(find('product-card').dependencies).toEqual([react]);
    expect(find('analytics-page').dependencies).toEqual([
      `@nizivo/charts@${range(versions.charts)}`,
      `@nizivo/icons@${range(versions.icons)}`,
      react,
    ]);
    expect(find('button-css').dependencies).toEqual([react]);
    // a chart pattern brings the charts stylesheet; init brings only @nizivo/react's
    expect(find('analytics-page').files[0]?.content).toContain(
      "import '@nizivo/charts/styles.css';\nimport './analytics-page.css';\n",
    );
    expect(find('product-card').files[0]?.content).not.toContain('@nizivo/charts');
    expect(range('0.3.2')).toBe('~0.3.0');
  });

  it("carry the MIT notice where the CLI keeps it: after a module's imports", () => {
    const module = find('order-summary').files[0]?.content ?? '';
    const notice = module.indexOf('/*\n * Nizivo registry item "order-summary"');
    expect(module.startsWith("import './order-summary.css';\n")).toBe(true);
    expect(notice).toBeGreaterThan(module.lastIndexOf('\nimport '));
    expect(module).toContain(' * MIT License\n');
    expect(find('button-css').files[0]?.content.startsWith('/*\n * Nizivo registry item')).toBe(
      true,
    );
  });
});

describe('the linter', () => {
  it('rejects a dependency outside @nizivo or not at ~x.y.0', () => {
    expect(
      problemsOf('product-card', (item) => ({ ...item, dependencies: ['lodash@4.17.21', react] })),
    ).toEqual([
      'product-card.json: dependency lodash@4.17.21 is not @nizivo/* at ~x.y.0',
      expect.stringContaining('dependencies lodash'),
    ]);
    expect(
      problemsOf('button-css', (item) => ({
        ...item,
        dependencies: [`@nizivo/react@${versions.react}`],
      })),
    ).toEqual([
      `button-css.json: dependency @nizivo/react@${versions.react} is not @nizivo/* at ~x.y.0`,
    ]);
  });

  it('rejects dependencies that differ from the imports', () => {
    expect(problemsOf('analytics-page', (item) => ({ ...item, dependencies: [react] }))).toEqual([
      expect.stringMatching(
        /^analytics-page\.json: dependencies @nizivo\/react@.*, its imports @nizivo\/charts/,
      ),
    ]);
  });

  it('rejects a target outside components/nizivo/, and a file without the notice', () => {
    expect(
      problemsOf('button-css', (item) => ({
        ...item,
        files: item.files.map((f) => ({ ...f, target: 'components/nizivo/../../app/x.css' })),
      })),
    ).toEqual([
      'button-css.json: target components/nizivo/../../app/x.css is outside components/nizivo/',
    ]);
    expect(
      problemsOf('product-card', (item) => ({
        ...item,
        files: item.files.map((f) => ({
          ...f,
          content: f.content.replace(/\/\*\n \* Nizivo[\s\S]*?\*\/\n/, ''),
        })),
      })),
    ).toEqual([
      'product-card.json: nizivo/product-card.tsx does not carry the MIT notice where the CLI keeps it',
      'product-card.json: nizivo/product-card.tsx has no licence',
      'product-card.json: nizivo/product-card.css does not carry the MIT notice where the CLI keeps it',
      'product-card.json: nizivo/product-card.css has no licence',
    ]);
  });

  it('rejects registryDependencies, a -source fork, another import and a repeated name', () => {
    expect(
      problemsOf(
        'button-css',
        (item) => ({ ...item, registryDependencies: ['button'] }) as RegistryItem,
      ),
    ).toEqual([
      'button-css.json: fields $schema,name,type,title,description,dependencies,files,registryDependencies',
    ]);
    expect(problemsOf('button-css', (item) => ({ ...item, name: 'button-source' }))).toEqual([
      'button-source.json: no -source fork items (D-dj)',
      expect.stringContaining('button-source.json: nizivo/button-css.css does not carry'),
    ]);
    expect(
      problemsOf('product-card', (item) => ({
        ...item,
        files: item.files.map((f, i) =>
          i === 0 ? { ...f, content: `import _ from 'lodash';\n${f.content}` } : f,
        ),
      })),
    ).toEqual(["product-card.json: imports 'lodash'"]);
    expect(registryProblems([find('init'), find('init')], versions)).toEqual([
      'init.json: a second item of that name',
    ]);
  });
});

describe('the build', () => {
  it('is the same on every run, and its manifest hashes every file', () => {
    const files = versionFiles(items, versions.react);
    expect(versionFiles(buildItems(patternNames(), versions), versions.react)).toEqual(files);
    const manifest: unknown = JSON.parse(files.get('manifest.json') ?? '');
    expect(manifest).toMatchObject({ version: versions.react, algorithm: 'sha256' });
    const hashes =
      typeof manifest === 'object' && manifest !== null && 'files' in manifest
        ? Object.fromEntries(Object.entries(manifest.files ?? {}))
        : {};
    expect(Object.keys(hashes)).toEqual(
      [...files.keys()].filter((f) => f !== 'manifest.json').toSorted(),
    );
    for (const [file, hash] of Object.entries(hashes)) {
      expect(
        createHash('sha256')
          .update(files.get(file) ?? '')
          .digest('hex'),
      ).toBe(hash);
    }
  });

  it('serves /r/latest/ as the newest version, and caches versions for good', () => {
    const { files, version } = buildRegistry(patternNames());
    expect(files.get('r/latest/index.json')).toBe(files.get(`r/v${version}/index.json`));
    expect(files.get('_headers')).toContain(
      `/r/v${version}/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=31536000, immutable`,
    );
    expect(files.get('_headers')).toContain(
      '/r/latest/*\n  Access-Control-Allow-Origin: *\n  Cache-Control: public, max-age=300',
    );
  });
});

describe('the frozen versions', () => {
  it('are byte for byte as frozen: every file matches its manifest, and nothing is added', () => {
    for (const [version, files] of frozenVersions()) {
      const manifest: unknown = JSON.parse(files.get('manifest.json') ?? '');
      expect(manifest).toMatchObject({ version, algorithm: 'sha256' });
      const hashes =
        typeof manifest === 'object' && manifest !== null && 'files' in manifest
          ? Object.fromEntries(Object.entries(manifest.files ?? {}))
          : {};
      expect([...files.keys()].filter((f) => f !== 'manifest.json').toSorted()).toEqual(
        Object.keys(hashes).toSorted(),
      );
      for (const [file, hash] of Object.entries(hashes)) {
        expect(
          createHash('sha256')
            .update(files.get(file) ?? '')
            .digest('hex'),
        ).toBe(hash);
      }
    }
  });
});
