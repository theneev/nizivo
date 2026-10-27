import type { JSX } from 'react';
import { ModelSelector } from './index';

const MODELS = [
  { value: 'fast', label: 'Fast', description: 'Quick answers for simple tasks' },
  { value: 'balanced', label: 'Balanced', description: 'Good for most work' },
  { value: 'deep', label: 'Deep', description: 'Slower, more careful reasoning' },
];

/** Figma's three trade-offs, named in words, with Balanced chosen. */
export function ModelSelectorExample(): JSX.Element {
  return <ModelSelector models={MODELS} defaultValue="balanced" />;
}
