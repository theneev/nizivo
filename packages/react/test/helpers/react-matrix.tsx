// The React matrix's own check (test/react-matrix.ts), run by the node, browser and overlay lanes:
// react and react-dom are both the line the lane names, and the engine renders on that same copy
// (with a second React copy, React Aria's first hook call throws).
import { version as reactVersion } from 'react';
import { version as domVersion } from 'react-dom';
import { renderToString } from 'react-dom/server';
import { Button } from 'react-aria-components';

export interface ReactLineFacts {
  line: string;
  react: string;
  dom: string;
  html: string;
}

export function reactLineFacts(): ReactLineFacts {
  return {
    line: NZ_REACT_LINE,
    react: reactVersion,
    dom: domVersion,
    html: renderToString(<Button>Save</Button>),
  };
}
