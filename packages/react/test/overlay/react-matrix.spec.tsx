// The overlay lane runs on the React line it names (test/react-matrix.ts), and hydrates on it.
import { useState, type ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { Button } from 'react-aria-components';
import { expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';
import { reactLineFacts } from '../helpers/react-matrix';

function Counter(): ReactNode {
  const [count, setCount] = useState(0);
  return <Button onPress={() => setCount(count + 1)}>Pressed {count}</Button>;
}

test('react, react-dom and the engine are the lane’s React line', async () => {
  const facts = reactLineFacts();
  expect(facts.react.startsWith(`${facts.line}.`), `react ${facts.react}`).toBe(true);
  expect(facts.dom).toBe(facts.react);
  expect(facts.html).toContain('Save');
  const host = document.createElement('div');
  host.innerHTML = renderToString(<Counter />);
  document.body.append(host);
  const errors: unknown[] = [];
  const root = hydrateRoot(host, <Counter />, { onRecoverableError: (e) => errors.push(e) });
  const button = host.querySelector('button');
  if (button === null) throw new Error('no button');
  await expect
    .poll(async () => {
      await userEvent.click(button);
      return button.textContent;
    })
    .not.toBe('Pressed 0');
  expect(errors).toEqual([]);
  root.unmount();
  host.remove();
});
