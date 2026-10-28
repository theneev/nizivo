import type { JSX } from 'react';
import { CodeBlock } from './index';

/** A command: one install line per package manager. */
export function CodeBlockExample(): JSX.Element {
  return (
    <CodeBlock
      variant="command"
      items={[
        { label: 'npm', code: 'npm i @nizivo/react' },
        { label: 'pnpm', code: 'pnpm add @nizivo/react' },
        { label: 'yarn', code: 'yarn add @nizivo/react' },
      ]}
    />
  );
}

/** A snippet: a component and its stylesheet. */
export function CodeBlockSnippetExample(): JSX.Element {
  return (
    <CodeBlock
      items={[
        {
          label: 'tsx',
          code: [
            "import { Button } from '@nizivo/react/button';",
            '',
            'export function Save() {',
            '  return <Button variant="primary">Save product</Button>;',
            '}',
          ].join('\n'),
        },
        { label: 'css', code: `@import '@nizivo/react/styles.css';` },
      ]}
    />
  );
}
