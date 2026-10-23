import type { JSX } from 'react';
import { Field } from '../field/index';
import { Stack } from '../stack/index';
import { Chip, ChipGroup } from './index';

/** A product colour is data: the swatch is any element with that background. */
function Swatch({ color }: { color: string }): JSX.Element {
  return <span style={{ background: color }} />;
}

/**
 * Colours with swatches, inside a Field that names the group. One value: native radios, so arrow
 * keys move the choice and the form submits it with no JavaScript. Sand is out of stock: it keeps
 * its colour, is struck through and is described as sold out, and can still be chosen.
 */
export function ChipGroupExample(): JSX.Element {
  return (
    <Field label="Colour" name="color" group>
      <ChipGroup defaultValue="moss" labels={{ unavailable: 'Sold out' }}>
        <Chip value="moss" leading={<Swatch color="#2e5a3c" />}>
          Moss
        </Chip>
        <Chip value="clay" leading={<Swatch color="#b5643c" />}>
          Clay
        </Chip>
        <Chip value="sand" leading={<Swatch color="#e9dcc3" />} unavailable>
          Sand
        </Chip>
        <Chip value="slate" leading={<Swatch color="#4a5560" />}>
          Slate
        </Chip>
      </ChipGroup>
    </Field>
  );
}

/** Sizes: text-only chips at least 48 px wide; selecting one never changes its size. */
export function ChipGroupSizesExample(): JSX.Element {
  return (
    <Field label="Size" name="size" group required>
      <ChipGroup defaultValue="m" labels={{ unavailable: 'Sold out' }}>
        <Chip value="xs" unavailable>
          XS
        </Chip>
        <Chip value="s">S</Chip>
        <Chip value="m">M</Chip>
        <Chip value="l">L</Chip>
        <Chip value="xl" disabled>
          XL
        </Chip>
      </ChipGroup>
    </Field>
  );
}

/**
 * Filters: `multiple` uses checkboxes, so any number can be on, and the form submits one `status`
 * entry per checked chip. A swatch-only chip is named with `aria-label`.
 */
export function ChipGroupMultipleExample(): JSX.Element {
  return (
    <Stack gap="4">
      <ChipGroup aria-label="Order status" name="status" multiple defaultValue={['paid', 'open']}>
        <Chip value="open">Open</Chip>
        <Chip value="paid">Paid</Chip>
        <Chip value="refunded">Refunded</Chip>
        <Chip value="archived">Archived</Chip>
      </ChipGroup>
      <ChipGroup aria-label="Glaze" name="glaze" defaultValue="white">
        <Chip value="white" leading={<Swatch color="#ffffff" />} aria-label="White" />
        <Chip value="black" leading={<Swatch color="#1d1d1b" />} aria-label="Black" />
        <Chip value="celadon" leading={<Swatch color="#a7c4a0" />} aria-label="Celadon" />
      </ChipGroup>
    </Stack>
  );
}

/** Required with no default, and an error from the server: every chip not chosen shows it. */
export function ChipGroupErrorExample(): JSX.Element {
  return (
    <Field label="Fit" name="fit" group required error="Choose a fit.">
      <ChipGroup>
        <Chip value="regular">Regular</Chip>
        <Chip value="relaxed">Relaxed</Chip>
        <Chip value="slim">Slim</Chip>
      </ChipGroup>
    </Field>
  );
}
