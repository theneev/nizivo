'use client';
// Fumadocs' search dialog on the static index (app/api/search.json/route.ts): the browser downloads the
// prebuilt index once, on first search, and searches it locally. No server, no external service,
// and it works offline.
//
// Focus goes back where it was on close. Fumadocs opens the Radix dialog without a Radix trigger, and
// Radix returns focus only to its trigger, so focus would otherwise fall to <body> and the next Tab
// would start from the top of the page (WCAG 2.4.3).
import { useRef, type JSX } from 'react';
import { useStaticSearch } from 'fumadocs-core/search/client/orama-static';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';

export default function StaticSearchDialog(props: SharedProps): JSX.Element {
  const search = useStaticSearch({ from: '/api/search.json' });
  const returnTo = useRef<HTMLElement | null>(null);
  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent
        onOpenAutoFocus={() => {
          // Runs before focus moves in, so this is what had focus when search opened.
          returnTo.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          const target = returnTo.current;
          returnTo.current = null;
          if (target?.isConnected !== true) return;
          event.preventDefault();
          target.focus();
        }}
      >
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  );
}
