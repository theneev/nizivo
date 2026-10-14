// Optional hand-written prose for a generated component page: content/components/<subpath>.mdx.
import { componentNotes } from '../.source/server';

export type ComponentNotes = (typeof componentNotes)[number];

export function notesFor(name: string): ComponentNotes | undefined {
  return componentNotes.find((n) => n.info.path === `${name}.mdx`);
}

/** Every notes file must belong to a public component subpath (lib/source.ts checks). */
export function allNotes(): ComponentNotes[] {
  return componentNotes;
}
