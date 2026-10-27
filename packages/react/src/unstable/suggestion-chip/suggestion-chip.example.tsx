import type { JSX } from 'react';
import { SuggestionChip, SuggestionGroup } from './index';

/** Prompt starters under an empty composer; each fills it, and people still press send. */
export function SuggestionChipExample(): JSX.Element {
  return (
    <SuggestionGroup style={{ maxInlineSize: 560 }}>
      <SuggestionChip>Write a product description</SuggestionChip>
      <SuggestionChip>Summarise this week’s orders</SuggestionChip>
      <SuggestionChip>Find slow-moving stock</SuggestionChip>
      <SuggestionChip>Draft a launch post</SuggestionChip>
    </SuggestionGroup>
  );
}
