// A Field around an Input with generated ids (no `ids` prop): two of these islands on one page must
// not produce the same id (§11.1: @astrojs/react gives each island its own useId prefix).
import { Field } from '@nizivo/react/field';
import { Input } from '@nizivo/react/input';

export function SkuField({ label }) {
  return (
    <Field label={label} description="Letters and digits only.">
      <Input name={label.toLowerCase()} />
    </Field>
  );
}
