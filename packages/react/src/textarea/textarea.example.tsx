import type { JSX } from 'react';
import { Field } from '../field/index';
import { Textarea } from './index';

/** Inside a Field: the label, help text and native validation messages are wired for you. */
export function TextareaExample(): JSX.Element {
  return (
    <Field
      label="Description"
      description="Two or three sentences about the product."
      required
      messages={{ valueMissing: 'Describe the product.' }}
    >
      <Textarea name="description" placeholder="Hand-thrown in Bristol, glazed in moss." />
    </Field>
  );
}

/**
 * 112 px at least (Figma 7367:316); `rows` above that sets the height, and the user can drag it
 * taller. Where the browser has `field-sizing`, it also grows as the text does.
 */
export function TextareaRowsExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 420 }}>
      <Textarea aria-label="Short note" placeholder="The 112 px minimum" />
      <Textarea rows={6} aria-label="Long note" placeholder="Six rows" />
    </div>
  );
}

/** An error from the server, read-only and disabled. */
export function TextareaStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 420 }}>
      <Field label="Care instructions" error="Keep it under 200 characters.">
        <Textarea defaultValue="Dishwasher safe. Microwave safe. Not for the oven." />
      </Field>
      <Field label="Supplier note" readOnly>
        <Textarea rows={2} defaultValue="Packed in recycled card." />
      </Field>
      <Field label="Internal note" disabled>
        <Textarea rows={2} defaultValue="Archived." />
      </Field>
    </div>
  );
}
