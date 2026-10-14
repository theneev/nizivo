// IconButton with tooltip={false} runs no client code (§9.5 split). Whether Next still ships the
// tooltip leaf, which icon-button.tsx imports statically, is what this page measures.
import { Heading } from '@nizivo/react/heading';
import { IconButton } from '@nizivo/react/icon-button';

function Trash() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M3 6h18M19 6v14H5V6" />
    </svg>
  );
}

export default function Page() {
  return (
    <main>
      <Heading level={1}>IconButton without a tooltip</Heading>
      <IconButton label="Delete product" icon={<Trash />} tooltip={false} />
    </main>
  );
}
