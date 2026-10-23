import type { JSX } from 'react';
import { Field } from '../field/index';
import { Input } from '../input/index';
import { Form, FormMessage, SubmitButton } from './index';

/**
 * Native validation, inline: submit with an empty title to see its message and focus move to it.
 * With an action passed as a function, SubmitButton shows pending while it runs.
 */
export function FormExample(): JSX.Element {
  return (
    <Form style={{ display: 'grid', gap: 16, maxInlineSize: 360 }}>
      <Field
        name="title"
        label="Product title"
        required
        messages={{ valueMissing: 'Enter a product title.' }}
      >
        <Input />
      </Field>
      <Field name="sku" label="SKU" description="Letters and numbers, as printed on the label.">
        <Input />
      </Field>
      <div>
        <SubmitButton>Save</SubmitButton>
      </div>
    </Form>
  );
}

/**
 * A server action's reply: `errors` by Field name, presented by each Field until the user edits it,
 * an error summary that links to each control, and a form-level FormMessage.
 */
export function FormServerErrorsExample(): JSX.Element {
  return (
    <Form
      summary
      errors={{
        title: 'Enter a product title.',
        price: ['Enter a price above 0.', 'Enter a number.'],
      }}
      style={{ display: 'grid', gap: 16, maxInlineSize: 360 }}
    >
      <FormMessage>
        We could not save the product. Check the fields below and try again.
      </FormMessage>
      <Field name="title" label="Product title" required>
        <Input />
      </Field>
      <Field name="price" label="Price" required>
        <Input inputMode="decimal" prefix="₹" defaultValue="0" />
      </Field>
      <div>
        <SubmitButton>Save</SubmitButton>
      </div>
    </Form>
  );
}

/**
 * The form-level message. Render it always, empty until there is something to say, so the message
 * is announced when it arrives: `critical` as an alert, the other tones as a status.
 */
export function FormMessageExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 12, maxInlineSize: 420 }}>
      <FormMessage tone="success">Product saved.</FormMessage>
      <FormMessage tone="critical" title="Not saved">
        Your session ended. Sign in again to save the product.
      </FormMessage>
      <FormMessage tone="info">{null}</FormMessage>
    </div>
  );
}
