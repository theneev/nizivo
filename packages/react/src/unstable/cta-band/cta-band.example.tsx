import type { JSX } from 'react';
import { Button } from '../../button/index';
import { CtaBand } from './index';

/** Figma's closing ask: an Accent primary action and a quiet Secondary one. */
export function CtaBandExample(): JSX.Element {
  return (
    <CtaBand
      title="Ship your next screen with Nizivo"
      description="One library, two themes, every state designed."
      actions={
        <>
          <Button variant="accent">Get started</Button>
          <Button variant="secondary">Read the docs</Button>
        </>
      }
    />
  );
}
