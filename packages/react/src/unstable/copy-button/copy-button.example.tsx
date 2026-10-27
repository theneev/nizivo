import type { JSX } from 'react';
import { CodeBlock } from '../code-block/index';

/** On the dark code surface it lives on: a CodeBlock's Copy, which reads "Copied" for 2 seconds. */
export function CopyButtonExample(): JSX.Element {
  return <CodeBlock variant="command" items={[{ label: 'npm', code: 'npm i @nizivo/react' }]} />;
}
