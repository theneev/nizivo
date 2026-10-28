import type { JSX } from 'react';
import { Badge } from '@nizivo/react/badge';
import { Layers, ShoppingBag } from '@nizivo/icons';

interface Post {
  id: string;
  href: string;
  /** The post's date as the app prints it (fixed strings here, so the example has no time zone). */
  date: string;
  /** Products tagged in the post. */
  products: number;
  /** Photos in the post; more than one makes it a carousel. */
  photos: number;
}

const POSTS: Post[] = [
  { id: 'p1', href: '/posts/p1', date: '12 October', products: 3, photos: 1 },
  { id: 'p2', href: '/posts/p2', date: '9 October', products: 1, photos: 4 },
  { id: 'p3', href: '/posts/p3', date: '5 October', products: 2, photos: 1 },
  { id: 'p4', href: '/posts/p4', date: '30 September', products: 0, photos: 1 },
  { id: 'p5', href: '/posts/p5', date: '26 September', products: 4, photos: 3 },
  { id: 'p6', href: '/posts/p6', date: '21 September', products: 1, photos: 1 },
];

/** What the tile's link says: the post, its products and, for a carousel, its photos. */
function postName(post: Post): string {
  const products =
    post.products === 0
      ? 'no products'
      : `${post.products} ${post.products === 1 ? 'product' : 'products'} to shop`;
  const photos = post.photos > 1 ? `, ${post.photos} photos` : '';
  return `Post from ${post.date}, ${products}${photos}`;
}

/** One post: a single link over its media, with the Shop badge when it has products. */
function PostTile({ post }: { post: Post }): JSX.Element {
  return (
    <a className="nzp-shoppable-post" href={post.href}>
      <span className="nzp-shoppable-post-media" aria-hidden="true" />
      {post.products > 0 && (
        <Badge className="nzp-shoppable-post-badge" dot={false} aria-hidden="true">
          <ShoppingBag size={16} />
          Shop
          <span className="nzp-shoppable-post-count">{post.products}</span>
        </Badge>
      )}
      {post.photos > 1 && (
        <span className="nzp-shoppable-post-carousel" aria-hidden="true">
          <Layers size={16} />
        </span>
      )}
      <span className="nz-visually-hidden">{postName(post)}</span>
    </a>
  );
}

/**
 * A Shoppable Post: a post's media as one link, with the Post Badge
 * "Shop" and the count of tagged products on it. The badge sits on a dark surface that
 * stays dark in both themes, so its text holds its contrast over any photo. A server composition: it
 * ships no JavaScript. The media block stands in for the post's `Image`.
 */
export function ShoppablePostExample(): JSX.Element {
  const post: Post = { id: 'p1', href: '/posts/p1', date: '12 October', products: 3, photos: 1 };
  return (
    <div className="nzp-shoppable-post-single">
      <PostTile post={post} />
    </div>
  );
}

/**
 * The storefront's grid: three columns of 4:5 tiles with 2 px between them, as on a mobile
 * storefront. A post with several photos shows the layers glyph; a post with no
 * tagged product shows no badge.
 */
export function ShoppablePostGridExample(): JSX.Element {
  return (
    <ul className="nzp-shoppable-post-grid" aria-label="Posts">
      {POSTS.map((post) => (
        <li key={post.id}>
          <PostTile post={post} />
        </li>
      ))}
    </ul>
  );
}
