import type { ComponentPropsWithRef, JSX } from 'react';
import { Image } from './index';

/** Stands in for a framework image component (Next `Image`, unpic). */
function FrameworkImage({ alt, ...props }: ComponentPropsWithRef<'img'>): JSX.Element {
  return <img alt={alt} {...props} />;
}

export function ImageExample(): JSX.Element {
  return (
    <div>
      <Image
        src="/media/mug.jpg"
        alt="Stoneware mug in sage glaze"
        width={800}
        height={1000}
        ratio="4/5"
      />
      <Image src="/media/hero.jpg" alt="" width={1600} height={900} ratio="16/9" priority />
      <Image
        src="/media/napkins.jpg"
        alt="Linen napkins, folded"
        width={600}
        height={600}
        render={<FrameworkImage />}
      />
    </div>
  );
}
