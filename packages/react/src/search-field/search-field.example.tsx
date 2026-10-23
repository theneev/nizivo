import type { JSX } from 'react';
import { Field } from '../field/index';
import { SearchField } from './index';

/**
 * Filtering with no JavaScript: in a `<form method="get">`, Enter submits the query as `?q=…`, and
 * the server page reads it back and passes it as `defaultValue`. Escape or the clear button empties a
 * filled field.
 */
export function SearchFieldExample(): JSX.Element {
  return (
    <form method="get" style={{ maxInlineSize: 360 }}>
      <SearchField name="q" placeholder="Search orders" defaultValue="stoneware" />
    </form>
  );
}

/**
 * In the top bar: a real input (M49), 360 px wide, with its shortcut drawn at the end. The app binds
 * the key (focus the field through its `ref`); the input announces it through `aria-keyshortcuts`.
 */
export function SearchFieldTopBarExample(): JSX.Element {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        paddingBlock: 12,
        paddingInline: 16,
        background: 'var(--nz-bg-canvas)',
      }}
    >
      <form method="get" style={{ flex: '0 1 360px', minInlineSize: 0 }}>
        <SearchField
          name="q"
          placeholder="Search orders, products, customers"
          shortcut="mod+k"
          labels={{ label: 'Search the store' }}
        />
      </form>
    </header>
  );
}

/** 32, 40 and 48 px, the heights of Input, Button and Select; pending and disabled. */
export function SearchFieldStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 360 }}>
      <SearchField size="sm" aria-label="Search, small" placeholder="Small" />
      <SearchField aria-label="Search, medium" placeholder="Medium" />
      <SearchField size="lg" aria-label="Search, large" placeholder="Large" />
      <SearchField aria-label="Search customers" defaultValue="anna" pending />
      <SearchField aria-label="Search archived orders" placeholder="Archived orders" disabled />
    </div>
  );
}

/** Inside a Field: the label names it, and the description and error describe it. */
export function SearchFieldFieldExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 360 }}>
      <Field label="Find a product" description="By title, SKU or barcode.">
        <SearchField name="product" placeholder="e.g. Stoneware mug" />
      </Field>
      <Field label="Order number" error="Enter at least three characters.">
        <SearchField name="order" defaultValue="10" />
      </Field>
    </div>
  );
}
