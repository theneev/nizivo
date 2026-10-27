// Renders src/registry.tsx, which fixtures/runner/registry.ts writes after `shadcn add`: every
// pattern item's examples, with the init item's stylesheet and the component sheet items.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Registry } from './registry';

const root = document.getElementById('root');
if (root === null) throw new Error('no #root');
createRoot(root).render(
  <StrictMode>
    <Registry />
  </StrictMode>,
);
