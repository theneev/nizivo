// FieldStatic (M31): the Field anatomy of /field-zero-js, from a module that imports no client leaf,
// so this page may ship no @nizivo client module in any mode (field.tsx imports FieldScope).
import { FieldStatic } from '@nizivo/react/field';
import { Heading } from '@nizivo/react/heading';
import { NativeSelect } from '@nizivo/react/native-select';

export default function Page() {
  return (
    <main>
      <Heading level={1}>FieldStatic</Heading>
      <FieldStatic
        label="Unit"
        description="Used on packing slips."
        ids={{ control: 'unit' }}
        required
      >
        {(control) => (
          <NativeSelect {...control} placeholder="Choose a unit">
            <option value="kg">Kilograms</option>
            <option value="lb">Pounds</option>
          </NativeSelect>
        )}
      </FieldStatic>
      <FieldStatic label="Currency" ids={{ control: 'currency' }}>
        {(control) => (
          <NativeSelect {...control} name="currency" defaultValue="inr">
            <option value="inr">Indian rupee</option>
            <option value="usd">US dollar</option>
          </NativeSelect>
        )}
      </FieldStatic>
    </main>
  );
}
