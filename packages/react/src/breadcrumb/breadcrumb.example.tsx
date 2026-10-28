import type { ComponentPropsWithRef, JSX } from 'react';
import { Breadcrumb } from './index';

/** Stands in for a router link (Next `Link`, React Router `Link`). */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/** A trail: two links and the current page, which is text with `aria-current="page"`. */
export function BreadcrumbExample(): JSX.Element {
  return (
    <Breadcrumb.Root>
      <Breadcrumb.Item href="/products">Products</Breadcrumb.Item>
      <Breadcrumb.Item href="/products/mugs">Mugs &amp; cups</Breadcrumb.Item>
      <Breadcrumb.Item current>Stoneware mug</Breadcrumb.Item>
    </Breadcrumb.Root>
  );
}

/** A router's link goes in through `render`; a separator replaces every chevron. */
export function BreadcrumbRouterExample(): JSX.Element {
  return (
    <Breadcrumb.Root separator="/" labels={{ nav: 'You are here' }}>
      <Breadcrumb.Item render={<Link href="/orders" />}>Orders</Breadcrumb.Item>
      <Breadcrumb.Item render={<Link href="/orders/1042" />}>#1042</Breadcrumb.Item>
      <Breadcrumb.Item current>Refund</Breadcrumb.Item>
    </Breadcrumb.Root>
  );
}
