// Inline Markdown to plain text, for the places that cannot render it: <meta> descriptions, the
// sidebar and previous/next cards (Fumadocs prints the page tree's text as is), and the search index.
// The pages themselves render the Markdown (components/inline-md.tsx).
export function plainText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1');
}
