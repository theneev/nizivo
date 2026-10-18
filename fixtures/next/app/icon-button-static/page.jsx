// IconButtonStatic (M31): the same <button> as <IconButton tooltip={false}>, from a module that
// imports no client leaf, so this page may ship no @nizivo client module in any mode.
import { Heading } from '@nizivo/react/heading';
import { IconButtonStatic } from '@nizivo/react/icon-button';

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
      <Heading level={1}>IconButtonStatic</Heading>
      <IconButtonStatic aria-label="Delete product" icon={<Trash />} />
    </main>
  );
}
