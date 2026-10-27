import type { JSX } from 'react';
import { Avatar } from '../../avatar/index';
import { TestimonialCard } from './index';

/** Figma's quote with its author. Use real, attributed quotes only; this copy is a placeholder. */
export function TestimonialCardExample(): JSX.Element {
  return (
    <TestimonialCard
      quote="We rebuilt our checkout in two weeks and the accessibility review came back clean the first time."
      name="Maya Lindqvist"
      jobTitle="Founder, Moss & Kiln"
      avatar={<Avatar name="Maya Lindqvist" size="lg" decorative />}
    />
  );
}
