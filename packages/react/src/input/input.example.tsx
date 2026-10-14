import type { JSX } from 'react';
import { Field } from '../field/index';
import { Input } from './index';

/** Stands in for an `@nizivo/icons` glyph (a magnifier). */
function SearchMark(): JSX.Element {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.92}
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

/** Inside a Field: the label, help text and native validation messages are wired for you. */
export function InputExample(): JSX.Element {
  return (
    <Field
      label="Product title"
      description="Shown on product pages and checkout."
      required
      messages={{ valueMissing: 'Enter a product title.' }}
    >
      <Input name="title" placeholder="e.g. Stoneware mug" />
    </Field>
  );
}

/** 32, 40 and 48 px, the heights of Button and Select. */
export function InputSizesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 320 }}>
      <Input size="sm" aria-label="Small" placeholder="Small" />
      <Input aria-label="Medium" placeholder="Medium" />
      <Input size="lg" aria-label="Large" placeholder="Large" />
    </div>
  );
}

/**
 * Decorative icons, and text affixes that join the input's description. A press anywhere in the box
 * focuses the input.
 */
export function InputSlotsExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 320 }}>
      <Input type="search" aria-label="Search products" leadingIcon={<SearchMark />} />
      <Field label="Price">
        <Input type="number" inputMode="decimal" prefix="₹" suffix="per kg" defaultValue="240" />
      </Field>
    </div>
  );
}

/** An error from the server, read-only and disabled. */
export function InputStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 320 }}>
      <Field label="Email" error="Enter an email address like name@example.com.">
        <Input type="email" defaultValue="anna@" />
      </Field>
      <Field label="SKU" readOnly>
        <Input defaultValue="MUG-0042" />
      </Field>
      <Field label="Barcode" disabled>
        <Input defaultValue="8901234567890" />
      </Field>
    </div>
  );
}
