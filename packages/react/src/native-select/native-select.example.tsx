import type { JSX } from 'react';
import { Field } from '../field/index';
import { NativeSelect } from './index';

/**
 * Zero JS: placed in a Field, the select gets its id, name and ARIA wiring as plain attributes (a
 * function child, `{(control) => <NativeSelect {...control} />}`, does the same). The page ships no
 * client code for it, and the browser validates `required` itself.
 */
export function NativeSelectExample(): JSX.Element {
  return (
    <Field label="Country" description="Where the order ships." required>
      <NativeSelect name="country" placeholder="Choose a country">
        <option value="IN">India</option>
        <option value="GB">United Kingdom</option>
        <option value="US">United States</option>
      </NativeSelect>
    </Field>
  );
}

/** Option groups, as a native `<select>` draws them. */
export function NativeSelectGroupsExample(): JSX.Element {
  return (
    <NativeSelect aria-label="Period" defaultValue="30d">
      <optgroup label="Recent">
        <option value="7d">Last 7 days</option>
        <option value="30d">Last 30 days</option>
      </optgroup>
      <optgroup label="Longer">
        <option value="12m">Last 12 months</option>
        <option value="all">All time</option>
      </optgroup>
    </NativeSelect>
  );
}

/** 32, 40 and 48 px: the Select trigger's heights, so the two can swap without a layout shift. */
export function NativeSelectSizesExample(): JSX.Element {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <NativeSelect size="sm" aria-label="Small" defaultValue="a">
        <option value="a">Small</option>
      </NativeSelect>
      <NativeSelect aria-label="Medium" defaultValue="a">
        <option value="a">Medium</option>
      </NativeSelect>
      <NativeSelect size="lg" aria-label="Large" defaultValue="a">
        <option value="a">Large</option>
      </NativeSelect>
    </div>
  );
}

/** An error from the server, and disabled. */
export function NativeSelectStatesExample(): JSX.Element {
  return (
    <div style={{ display: 'grid', gap: 16, maxInlineSize: 320 }}>
      <Field label="Shipping zone" error="Choose a zone that ships to this address.">
        {(control) => (
          <NativeSelect {...control} defaultValue="eu">
            <option value="eu">Europe</option>
            <option value="asia">Asia</option>
          </NativeSelect>
        )}
      </Field>
      <Field label="Currency" disabled>
        {(control) => (
          <NativeSelect {...control} defaultValue="INR">
            <option value="INR">Indian rupee</option>
          </NativeSelect>
        )}
      </Field>
    </div>
  );
}
