// usePointerFx and PointerFx (ARCHITECTURE.md §13.3; D-dd): its own subpath with one client module,
// so a page that uses CountUp from ./motion never ships it; the server renders only the effect's
// data attribute, with no style, so hydration changes nothing; `render` moves it to another element.
import { renderToString } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import { graph, isClient, rekey } from '../helpers/graph';
import { PointerFx, usePointerFx } from '../../src/pointer-fx/index';

function Hooked(): React.JSX.Element {
  const fx = usePointerFx<HTMLButtonElement>({ effect: 'magnetic' });
  return (
    <button type="button" {...fx}>
      Buy
    </button>
  );
}

const SRC = rekey(
  import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }),
  'src/',
);

describe('module graph', () => {
  test('./pointer-fx: one client module, its own; only react outside', () => {
    const { modules, externals } = graph(SRC, 'src/pointer-fx/index.ts');
    expect([...modules].filter((file) => isClient(SRC.get(file) ?? ''))).toEqual([
      'src/pointer-fx/pointer-fx.client.tsx',
    ]);
    expect([...externals]).toEqual(['react']);
  });

  test('./motion does not reach it', () => {
    const { modules } = graph(SRC, 'src/motion/index.ts');
    expect([...modules].filter((file) => file.startsWith('src/pointer-fx/'))).toEqual([]);
  });
});

describe('SSR markup', () => {
  test('PointerFx: a div with the tilt attribute and no inline style', () => {
    expect(renderToString(<PointerFx>Card</PointerFx>)).toBe(
      '<div data-pointer-fx="tilt">Card</div>',
    );
  });

  test('render puts the attribute on the consumer’s element', () => {
    expect(
      renderToString(
        <PointerFx effect="magnetic" render={<a href="#b" aria-label="Buy" />}>
          Buy
        </PointerFx>,
      ),
    ).toBe('<a href="#b" aria-label="Buy" data-pointer-fx="magnetic">Buy</a>');
  });

  test('the hook: spread on any element', () => {
    expect(renderToString(<Hooked />)).toBe(
      '<button type="button" data-pointer-fx="magnetic">Buy</button>',
    );
  });
});
