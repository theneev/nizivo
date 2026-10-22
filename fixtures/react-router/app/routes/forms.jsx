// A Field around every control, a Fieldset of Switches, a RadioGroup, a SegmentedControl named by its
// Field, and a zero-JS Field around a NativeSelect. A plain GET form: the submit is native (no
// handler), so the browser itself sends the values, as it would before hydration in an SSR app.
import { Button } from '@nizivo/react/button';
import { Checkbox } from '@nizivo/react/checkbox';
import { Field } from '@nizivo/react/field';
import { Fieldset } from '@nizivo/react/fieldset';
import { Heading } from '@nizivo/react/heading';
import { Input } from '@nizivo/react/input';
import { NativeSelect } from '@nizivo/react/native-select';
import { Radio, RadioGroup } from '@nizivo/react/radio-group';
import { SegmentedControl } from '@nizivo/react/segmented-control';
import { Stack } from '@nizivo/react/stack';
import { Switch } from '@nizivo/react/switch';
import { Textarea } from '@nizivo/react/textarea';

export default function Page() {
  return (
    <main>
      <Heading level={1}>Forms</Heading>
      <form method="get" action="/forms">
        <Stack gap="4">
          <Field
            label="Product name"
            description="Shown on the storefront."
            ids={{ control: 'name', label: 'name-label', description: 'name-description' }}
            required
          >
            <Input name="name" />
          </Field>
          <Field label="Description" ids={{ control: 'description' }}>
            <Textarea name="description" />
          </Field>
          <Field label="Unit" ids={{ control: 'unit' }} name="unit">
            {(control) => (
              <NativeSelect {...control} defaultValue="kg">
                <option value="kg">Kilograms</option>
                <option value="lb">Pounds</option>
              </NativeSelect>
            )}
          </Field>
          <Field
            label="Range"
            name="range"
            ids={{ label: 'range-label' }}
            description="The period the report covers."
            group
          >
            <SegmentedControl.Root defaultValue="7d">
              <SegmentedControl.Item value="7d">7D</SegmentedControl.Item>
              <SegmentedControl.Item value="30d">30D</SegmentedControl.Item>
            </SegmentedControl.Root>
          </Field>
          <Field label="Terms of sale" ids={{ control: 'terms' }}>
            <Checkbox name="terms">I accept the terms</Checkbox>
          </Field>
          <Fieldset legend="Billing emails">
            <Switch name="billing" value="invoices" defaultChecked>
              Invoices
            </Switch>
            <Switch name="billing" value="usage">
              Usage reports
            </Switch>
          </Fieldset>
          <RadioGroup legend="Shipping" name="shipping" defaultValue="standard" required>
            <Radio value="standard">Standard</Radio>
            <Radio value="express">Express</Radio>
          </RadioGroup>
          <Button type="submit" variant="primary">
            Save product
          </Button>
        </Stack>
      </form>
    </main>
  );
}
