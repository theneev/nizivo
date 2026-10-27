import type { JSX } from 'react';
import { PromptComposer } from '../prompt-composer/index';
import { SuggestionChip, SuggestionGroup } from '../suggestion-chip/index';
import { AiWelcome } from './index';

/** Figma's empty conversation: a greeting, what the assistant can see, starters and the composer. */
export function AiWelcomeExample(): JSX.Element {
  return (
    <AiWelcome
      style={{ maxInlineSize: 560 }}
      greeting="Good morning, Maya"
      description="Ask about your orders, write captions, or tag products — I can see your store and Instagram."
    >
      <SuggestionGroup>
        <SuggestionChip>Write a product description</SuggestionChip>
        <SuggestionChip>Summarise this week’s orders</SuggestionChip>
        <SuggestionChip>Find slow-moving stock</SuggestionChip>
        <SuggestionChip>Draft a launch post</SuggestionChip>
      </SuggestionGroup>
      <PromptComposer labels={{ placeholder: 'Ask Nizivo AI anything…' }} />
    </AiWelcome>
  );
}
