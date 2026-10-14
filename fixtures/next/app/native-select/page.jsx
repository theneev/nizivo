// NativeSelect is server-safe (§9.5): with no Field around it, the page ships no @nizivo client module.
import { Heading } from '@nizivo/react/heading';
import { NativeSelect } from '@nizivo/react/native-select';

export default function Page() {
  return (
    <main>
      <Heading level={1}>NativeSelect, no client code</Heading>
      <label htmlFor="currency">Currency</label>
      <NativeSelect id="currency" name="currency" defaultValue="inr">
        <option value="inr">Indian rupee</option>
        <option value="usd">US dollar</option>
      </NativeSelect>
    </main>
  );
}
