import type { ComponentPropsWithRef, JSX } from 'react';
import { Pagination } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/**
 * Figma's footer: a summary and 13 pages, page 1 current. Every page is a URL, so it is
 * server-rendered and needs no JavaScript; previous is disabled on the first page.
 */
export function PaginationExample(): JSX.Element {
  return (
    <Pagination
      page={1}
      totalPages={13}
      getHref={(page) => `?page=${page}`}
      summary="Showing 1–20 of 248"
    />
  );
}

/** Mid-list with a router's link, the compact size and Figma's single-page siblings. */
export function PaginationRouterExample(): JSX.Element {
  return (
    <Pagination
      page={7}
      totalPages={13}
      siblingCount={0}
      size="sm"
      getHref={(page) => `/orders?page=${page}`}
      renderLink={<Link />}
    />
  );
}
