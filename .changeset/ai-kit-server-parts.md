---
'@nizivo/react': minor
---

The AI kit begins (unstable, Figma's AI page), with six server parts and no client JavaScript:
`AiBadge` (`@nizivo/react/unstable/ai-badge`) says content was written or changed by AI, in the lime
that marks AI; `ThinkingIndicator` (`./unstable/thinking-indicator`) is the wait before the first
word, a polite status with CSS dots; `Citation` (`./unstable/citation`) links a claim to its source,
named "Source 1: …"; `SourceCard` (`./unstable/source-card`) is a web page or file as one link;
`SuggestionChip` and `SuggestionGroup` (`./unstable/suggestion-chip`) are prompt starters that fill
the composer; `UsageMeter` (`./unstable/usage-meter`) shows AI usage left on a Meter that warns from
80 %. Their strings join the unstable catalogue (`./locales/en-US-unstable`).
