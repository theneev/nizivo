import type { JSX } from 'react';
import { Eye, Upload } from '@nizivo/icons';
import { Badge } from '@nizivo/react/badge';
import { Breadcrumb } from '@nizivo/react/breadcrumb';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Checkbox } from '@nizivo/react/checkbox';
import { Chip, ChipGroup } from '@nizivo/react/chip-group';
import { Field } from '@nizivo/react/field';
import { Fieldset } from '@nizivo/react/fieldset';
import { Input } from '@nizivo/react/input';
import { KpiTile } from '@nizivo/react/kpi-tile';
import { PageHeader } from '@nizivo/react/page-header';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { Split } from '@nizivo/react/split';
import { Switch } from '@nizivo/react/switch';
import { Textarea } from '@nizivo/react/textarea';

/** The form the header's Save submits, though the button sits outside it. */
const FORM = 'nzp-product-detail-form';

const COLOURS = [
  ['moss', 'Moss', '#2e5a3c'],
  ['clay', 'Clay', '#b5643c'],
  ['sand', 'Sand', '#e9dcc3'],
  ['slate', 'Slate', '#4a5560'],
] as const;

/** A product colour is data: the swatch is any element with that background. */
function Swatch({ color }: { color: string }): JSX.Element {
  return <span style={{ background: color }} />;
}

/**
 * The Product detail page: the content of the app shell's `<main>`. A breadcrumb, the
 * page header with the product's status, then two columns (`Split`): media, details, variants and
 * pricing in the main column; sales channels, 30-day sales and inventory in the aside. Every field
 * belongs to one form, which the header's Save submits through `form`. The media tiles stand in for
 * the product's `Image`s.
 */
export function ProductDetailPageExample(): JSX.Element {
  return (
    <div className="nzp-product-detail-page">
      <Breadcrumb.Root>
        <Breadcrumb.Item href="/products">Products</Breadcrumb.Item>
        <Breadcrumb.Item href="/products?collection=mugs">Mugs &amp; cups</Breadcrumb.Item>
        <Breadcrumb.Item current>Stoneware mug</Breadcrumb.Item>
      </Breadcrumb.Root>
      <PageHeader
        level={2}
        title="Stoneware mug"
        meta={<Badge tone="success">Active</Badge>}
        actions={
          <>
            <Button leadingIcon={<Eye />}>Preview</Button>
            <Button type="submit" form={FORM} variant="primary">
              Save
            </Button>
          </>
        }
      />
      <form id={FORM} action="#">
        <Split.Root>
          <Split.Main className="nzp-product-detail-page-column">
            <Card.Root render={<section aria-labelledby="nzp-product-media" />}>
              <Card.Header>
                <Card.Title id="nzp-product-media">Media</Card.Title>
              </Card.Header>
              <div className="nzp-product-detail-page-gallery">
                <span className="nzp-product-detail-page-tile" aria-hidden="true" />
                <span className="nzp-product-detail-page-tile" aria-hidden="true" />
                <span className="nzp-product-detail-page-tile" aria-hidden="true" />
                <span className="nzp-product-detail-page-tile" aria-hidden="true" />
                <Button className="nzp-product-detail-page-upload" leadingIcon={<Upload />}>
                  Add media
                </Button>
              </div>
            </Card.Root>
            <Card.Root render={<section aria-labelledby="nzp-product-details" />}>
              <Card.Header>
                <Card.Title id="nzp-product-details">Details</Card.Title>
              </Card.Header>
              <Field label="Title" required>
                <Input name="title" defaultValue="Stoneware mug" />
              </Field>
              <Field label="Description" description="Shown on the product page and at checkout.">
                <Textarea
                  name="description"
                  defaultValue="Thrown by hand and glazed in moss green. Holds 350 ml; dishwasher safe."
                />
              </Field>
            </Card.Root>
            <Card.Root render={<section aria-labelledby="nzp-product-variants" />}>
              <Card.Header>
                <Card.Title id="nzp-product-variants">Variants</Card.Title>
              </Card.Header>
              <Field label="Colour" name="colour" group>
                <ChipGroup defaultValue="moss" labels={{ unavailable: 'Sold out' }}>
                  {COLOURS.map(([value, label, color]) => (
                    <Chip
                      key={value}
                      value={value}
                      leading={<Swatch color={color} />}
                      unavailable={value === 'sand'}
                    >
                      {label}
                    </Chip>
                  ))}
                </ChipGroup>
              </Field>
              <Field label="Size" name="size" group>
                <ChipGroup defaultValue="350">
                  <Chip value="250">250 ml</Chip>
                  <Chip value="350">350 ml</Chip>
                  <Chip value="500">500 ml</Chip>
                </ChipGroup>
              </Field>
            </Card.Root>
            <Card.Root render={<section aria-labelledby="nzp-product-pricing" />}>
              <Card.Header>
                <Card.Title id="nzp-product-pricing">Pricing</Card.Title>
              </Card.Header>
              <div className="nzp-product-detail-page-prices">
                <Field label="Price">
                  <Input name="price" inputMode="decimal" prefix="$" defaultValue="28.00" />
                </Field>
                <Field label="Compare-at price">
                  <Input name="compare-at" inputMode="decimal" prefix="$" defaultValue="34.00" />
                </Field>
                <Field label="Cost per item" description="Customers won't see this.">
                  <Input name="cost" inputMode="decimal" prefix="$" defaultValue="11.20" />
                </Field>
              </div>
            </Card.Root>
          </Split.Main>
          <Split.Aside className="nzp-product-detail-page-column">
            <Card.Root render={<section aria-labelledby="nzp-product-status" />}>
              <Card.Header>
                <Card.Title id="nzp-product-status">Status</Card.Title>
              </Card.Header>
              <Fieldset legend="Sales channels">
                <Switch name="channels" value="instagram" defaultChecked>
                  Instagram shop
                </Switch>
                <Switch name="channels" value="store" defaultChecked>
                  Store link
                </Switch>
                <Switch name="channels" value="wholesale">
                  Wholesale
                </Switch>
              </Fieldset>
            </Card.Root>
            <KpiTile
              tone="brand"
              label="Sold · 30 days"
              value={412}
              delta={0.086}
              comparison="vs previous 30 days"
            />
            <Card.Root render={<section aria-labelledby="nzp-product-inventory" />}>
              <Card.Header>
                <Card.Title id="nzp-product-inventory">Inventory</Card.Title>
              </Card.Header>
              <ProgressBar label="On hand" value={124} max={180} valueText="124 of 180" />
              <Checkbox name="track-inventory" defaultChecked>
                Track inventory
              </Checkbox>
            </Card.Root>
          </Split.Aside>
        </Split.Root>
      </form>
    </div>
  );
}
