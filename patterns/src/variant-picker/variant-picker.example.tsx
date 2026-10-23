import type { JSX } from 'react';
import { Button } from '@nizivo/react/button';
import { Chip, ChipGroup } from '@nizivo/react/chip-group';
import { Field } from '@nizivo/react/field';
import { NumberValue } from '@nizivo/react/number-value';
import { Stack } from '@nizivo/react/stack';
import { Text } from '@nizivo/react/text';

/** Money as the store's currency: Intl formats it, never string concatenation. */
const USD = { style: 'currency', currency: 'USD' } as const;

interface Option {
  value: string;
  label: string;
  /** In stock in this option. An unavailable option stays choosable, struck through and described. */
  available: boolean;
}

interface ColorOption extends Option {
  /** A product colour is data: the variant's own swatch colour, never a theme token. */
  swatch: string;
}

const COLORS: ColorOption[] = [
  { value: 'moss', label: 'Moss', swatch: '#2e5a3c', available: true },
  { value: 'clay', label: 'Clay', swatch: '#b5643c', available: true },
  { value: 'sand', label: 'Sand', swatch: '#e9dcc3', available: false },
  { value: 'slate', label: 'Slate', swatch: '#4a5560', available: true },
];

const SIZES: Option[] = [
  { value: 's', label: 'S', available: true },
  { value: 'm', label: 'M', available: true },
  { value: 'l', label: 'L', available: false },
  { value: 'xl', label: 'XL', available: true },
];

/** The swatch: any element with the colour as its background, in the chip's 24 px circle. */
function Swatch({ color }: { color: string }): JSX.Element {
  return <span style={{ background: color }} />;
}

/**
 * Figma 05's Variant Option (`7275:14018`) as a product's option picker: colour chips with
 * swatches and size chips, each a ChipGroup of native radios in a Field that names it, so arrow
 * keys move the choice and the form submits it with no JavaScript of its own. Sand and L are out of
 * stock: they keep their colour, are struck through and are described as sold out, and can still be
 * chosen (to offer "Notify me", for example).
 */
export function VariantPickerExample(): JSX.Element {
  return (
    <form action="#" aria-label="Linen apron">
      <Stack gap="5">
        <Stack gap="1">
          <Text variant="label-l">Linen apron</Text>
          <Text variant="numeric-m">
            <NumberValue value={42} format={USD} />
          </Text>
        </Stack>
        <Field label="Colour" name="color" group required>
          <ChipGroup defaultValue="moss" labels={{ unavailable: 'Sold out' }}>
            {COLORS.map((color) => (
              <Chip
                key={color.value}
                value={color.value}
                leading={<Swatch color={color.swatch} />}
                unavailable={!color.available}
              >
                {color.label}
              </Chip>
            ))}
          </ChipGroup>
        </Field>
        <Field label="Size" name="size" group required>
          <ChipGroup defaultValue="m" labels={{ unavailable: 'Sold out' }}>
            {SIZES.map((size) => (
              <Chip key={size.value} value={size.value} unavailable={!size.available}>
                {size.label}
              </Chip>
            ))}
          </ChipGroup>
        </Field>
        <div>
          <Button type="submit" variant="primary">
            Add to bag
          </Button>
        </div>
      </Stack>
    </form>
  );
}
