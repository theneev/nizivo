// CommandMenu and hotkeys on the server (ARCHITECTURE.md §17 G18; D-dh, D-di): the menu renders only
// its trigger (a closed dialog emits no popup HTML), named with its shortcut; ./hotkeys reaches only
// react and tinykeys, and registers nothing on the server; React Aria only through engine.ts.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, rekey } from '../helpers/graph';
import { CommandMenu } from '../../src/unstable/command-menu/index';

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx,json}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  'src/',
);

function menu(hotkey?: string | null): string {
  return renderToString(
    <CommandMenu.Root {...(hotkey !== undefined && { hotkey })}>
      <CommandMenu.Trigger>Search</CommandMenu.Trigger>
      <CommandMenu.Popup>
        <CommandMenu.Input />
        <CommandMenu.List>
          <CommandMenu.Item href="#mug">Stoneware mug</CommandMenu.Item>
        </CommandMenu.List>
      </CommandMenu.Popup>
    </CommandMenu.Root>,
  );
}

describe('server markup', () => {
  test('the trigger only, its slot and its shortcut; no dialog', () => {
    const html = menu();
    expect(html).toContain('data-slot="command-menu-trigger"');
    expect(html).toContain('aria-keyshortcuts="Meta+K Control+K"');
    expect(html).toContain('>Search</button>');
    expect(html).not.toContain('Stoneware mug');
    expect(html).not.toContain('role="dialog"');
  });

  test('hotkey={null}: no shortcut announced', () => {
    expect(menu(null)).not.toContain('aria-keyshortcuts');
  });
});

describe('module graph', () => {
  test('./hotkeys: react and tinykeys only', () => {
    const { externals } = graph(SRC, 'src/hotkeys/index.ts');
    expect([...externals].toSorted()).toEqual(['react', 'tinykeys']);
  });

  test('React Aria only through the engine adapter', () => {
    const { modules } = graph(SRC, 'src/unstable/command-menu/index.ts');
    expect(modules).toContain('src/_engines/react-aria/command-menu.client.tsx');
    const leaf = SRC.get('src/unstable/command-menu/command-menu.client.tsx') ?? '';
    expect(leaf).not.toMatch(/from 'react-aria/);
  });
});
