// IconButton with its default tooltip: the label shows on hover and keyboard focus (React Aria),
// and the button is named by it, not described by it.
import { Heading } from '@nizivo/react/heading';
import { IconButton } from '@nizivo/react/icon-button';

function Bold() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor">
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  );
}

export default function Page() {
  return (
    <main>
      <Heading level={1}>IconButton with its tooltip</Heading>
      <IconButton label="Bold" icon={<Bold />} variant="tertiary" shortcut="mod+b" />
    </main>
  );
}
