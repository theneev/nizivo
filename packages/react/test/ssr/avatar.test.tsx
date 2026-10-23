// Avatar and AvatarGroup (Figma Avatar 7370:21, Avatar Group 7370:26): server-safe, 0 KB of client
// JS. Module graph, RSC render with no client boundary, and markup: the name is the root's accessible
// name, the initials are always rendered under the photo (the no-script fallback for a missing or
// broken image), a decorative avatar is hidden, and a group is announced as one item.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, reactImports, REACT_SERVER, rekey } from '../helpers/graph';
import {
  serverRender,
  underReactServer,
  withDispatcher,
  type ClientBoundary,
} from '../helpers/rsc';
import { Avatar, AvatarGroup, avatarInitials } from '../../src/avatar/avatar';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  const { modules, externals } = graph(SRC, 'src/avatar/avatar.tsx');

  test("no 'use client' module; it imports only react: 0 KB under RSC", () => {
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([]);
    expect([...externals]).toEqual(['react']);
  });

  test('every react import exists under the react-server condition', () => {
    expect(reactImports(SRC, modules).filter((name) => !REACT_SERVER.has(name))).toEqual([]);
  });
});

describe('react-server build', () => {
  test('every example renders on the server with no client boundary', async () => {
    const { loaded, react } = await underReactServer(() =>
      Promise.all([import('../../src/avatar/index'), import('../../src/avatar/avatar.example')]),
    );
    const [entry, examples] = loaded;
    expect(Object.keys(entry).length).toBeGreaterThan(0);
    const list = Object.values(examples);
    expect(list).toHaveLength(2);
    for (const Example of list) {
      const boundaries: ClientBoundary[] = [];
      const tree = withDispatcher(react, () => serverRender(Example(), boundaries));
      expect(boundaries).toEqual([]);
      expect(JSON.stringify(tree)).toContain('"data-slot":"avatar"');
    }
  });
});

describe('initials', () => {
  test.each([
    ['Maya Rao', 'MR'],
    ['  jonah   okafor  ', 'JO'],
    ['Priya Lakshmi Shah', 'PS'],
    ['Cher', 'C'],
    ['', ''],
    ['Émile Zola', 'ÉZ'],
    ['𝒜da Lovelace', '𝒜L'],
  ])('%j → %j', (name, initials) => {
    expect(avatarInitials(name)).toBe(initials);
  });
});

describe('markup', () => {
  test('initials only: a named img role, the letters hidden, Figma Md by default', () => {
    expect(renderToString(<Avatar name="Maya Rao" />)).toBe(
      '<span data-slot="avatar" data-size="md" role="img" aria-label="Maya Rao" class="nz-avatar">' +
        '<span class="nz-avatar-initials" data-slot="avatar-initials" aria-hidden="true">MR</span></span>',
    );
  });

  test('a photo lies over the initials, alt="" and lazy: the name stays on the root', () => {
    const html = renderToString(<Avatar name="Maya Rao" src="/maya.jpg" size="xl" />);
    expect(html).toMatch(
      /^<span data-slot="avatar" data-size="xl" role="img" aria-label="Maya Rao"/,
    );
    expect(html).toContain('aria-hidden="true">MR</span>');
    expect(html).toContain(
      '<img class="nz-avatar-image" data-slot="avatar-image" alt="" src="/maya.jpg" loading="lazy" decoding="async"/>',
    );
    // no script, no inline style: the fallback is the markup itself (CSP Profile B)
    expect(html).not.toMatch(/onerror|style=/i);
  });

  test('decorative: hidden from assistive technology, no role or name', () => {
    const html = renderToString(<Avatar name="Priya Shah" decorative src="/p.jpg" />);
    expect(html).toMatch(
      /^<span data-slot="avatar" data-size="md" aria-hidden="true" class="nz-avatar">/,
    );
    expect(html).not.toContain('role=');
    expect(html).not.toContain('aria-label');
  });

  test('initials override, a consumer aria-label, and a framework image element', () => {
    const html = renderToString(
      <Avatar
        name="Neev Store"
        initials="N"
        aria-label="Your store"
        image={<img src="/store.png" className="framework" alt="logo" />}
      />,
    );
    expect(html).toContain('aria-label="Your store"');
    expect(html).toContain('aria-hidden="true">N</span>');
    expect(html).toContain(
      '<img src="/store.png" class="nz-avatar-image framework" alt="" data-slot="avatar-image"/>',
    );
  });

  test('render composes the root and receives the state', () => {
    const html = renderToString(
      <Avatar
        name="Maya Rao"
        src="/m.jpg"
        size="lg"
        render={(props, state) => (
          <span {...props} title={`${state.size} ${String(state.image)}`} />
        )}
      />,
    );
    expect(html).toContain('title="lg true"');
    expect(html).toContain('class="nz-avatar"');
  });
});

describe('AvatarGroup', () => {
  test('one named item: three decorative avatars and the count, Intl list wording', () => {
    const html = renderToString(
      <AvatarGroup total={7}>
        <Avatar name="Maya" src="/m.jpg" />
        <Avatar name="Jonah" />
        <Avatar name="Priya" />
        <Avatar name="Sam" />
      </AvatarGroup>,
    );
    expect(html).toMatch(
      /^<span data-slot="avatar-group" data-size="md" role="img" aria-label="Maya, Jonah, Priya, and 4 more" class="nz-avatar-group">/,
    );
    // the fourth avatar passed is folded into the count
    expect(html.match(/data-slot="avatar"/g)).toHaveLength(3);
    expect(html.match(/<span data-slot="avatar" data-size="md" aria-hidden="true"/g)).toHaveLength(
      3,
    );
    expect(html).toContain(
      '<span class="nz-avatar-group-more" data-slot="avatar-group-more" aria-hidden="true">+4</span>',
    );
    expect(html).not.toContain('Sam');
  });

  test('no count when everyone shows; size, max, locale and labels', () => {
    const all = renderToString(
      <AvatarGroup size="lg">
        <Avatar name="Maya" />
        <Avatar name="Jonah" />
      </AvatarGroup>,
    );
    expect(all).toContain('aria-label="Maya and Jonah"');
    expect(all).not.toContain('nz-avatar-group-more');
    expect(all.match(/data-size="lg"/g)).toHaveLength(3);

    const de = renderToString(
      <AvatarGroup
        max={1}
        total={1201}
        locale="de-DE"
        labels={{ more: '{count} weitere', overflow: '+{count}' }}
      >
        <Avatar name="Maya" />
      </AvatarGroup>,
    );
    expect(de).toContain('aria-label="Maya und 1.200 weitere"');
    expect(de).toContain('aria-hidden="true">+1.200</span>');
  });

  test('count labels take a CLDR plural object, chosen by the count in the group locale', () => {
    const more = {
      one: '{count} inna osoba',
      few: '{count} inne osoby',
      many: '{count} innych osób',
      other: '{count} innej osoby',
    };
    const group = (total: number) =>
      renderToString(
        <AvatarGroup max={1} total={total} locale="pl" labels={{ more }}>
          <Avatar name="Maya" />
        </AvatarGroup>,
      );
    expect(group(2)).toContain('aria-label="Maya i 1 inna osoba"');
    expect(group(4)).toContain('aria-label="Maya i 3 inne osoby"');
    expect(group(6)).toContain('aria-label="Maya i 5 innych osób"');
    expect(group(6)).toContain('aria-hidden="true">+5</span>');
  });
});
