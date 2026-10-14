// Field's zero-JS path: a function child, or a NativeSelect placed directly in the Field, renders no
// client component, so nothing runs on the client.
// field.tsx imports FieldScope statically, so Next still ships its chunk (D-n; recorded in RESULTS.md).
import { Field } from '@nizivo/react/field';
import { Heading } from '@nizivo/react/heading';
import { NativeSelect } from '@nizivo/react/native-select';

export default function Page() {
  return (
    <main>
      <Heading level={1}>Field with a function child</Heading>
      <Field label="Unit" description="Used on packing slips." ids={{ control: 'unit' }} required>
        {(control) => (
          <NativeSelect {...control} placeholder="Choose a unit">
            <option value="kg">Kilograms</option>
            <option value="lb">Pounds</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Currency" ids={{ control: 'currency' }}>
        <NativeSelect name="currency" defaultValue="inr">
          <option value="inr">Indian rupee</option>
          <option value="usd">US dollar</option>
        </NativeSelect>
      </Field>
    </main>
  );
}
