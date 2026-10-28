import type { JSX } from 'react';
import { Badge } from '../badge/index';
import { Field } from '../field/index';
import { ChoiceCard, ChoiceCardGroup } from './index';

/**
 * Stands in for a card brand's mark (a 44 × 30 Mark). Brand marks have their own rules, so
 * they are the app's to supply; the brand's name is in the text too.
 */
function Mark({ brand }: { brand: string }): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        inlineSize: 44,
        blockSize: 30,
        borderRadius: 'var(--nz-radius-xs)',
        background: 'var(--nz-bg-inverse)',
        color: 'var(--nz-text-inverse)',
        font: 'var(--nz-font-label-s)',
      }}
    >
      {brand}
    </span>
  );
}

/** The card's number in Mono, with the brand spelled out for assistive technology. */
function Last4({ brand, last4 }: { brand: string; last4: string }): JSX.Element {
  return (
    <span style={{ font: 'var(--nz-font-mono-m-strong)' }}>
      <span className="nz-visually-hidden">{`${brand} ending in `}</span>
      <span aria-hidden="true">•••• </span>
      {last4}
    </span>
  );
}

/**
 * Saved payment methods: native radios, so arrow keys move the choice and the form submits it with
 * no JavaScript. The "Default" Badge is composition, at the card's end; its text joins the name.
 */
export function ChoiceCardExample(): JSX.Element {
  return (
    <Field label="Payment method" name="paymentMethod" group>
      <ChoiceCardGroup defaultValue="pm_1" style={{ maxInlineSize: 430 }}>
        <ChoiceCard
          value="pm_1"
          leading={<Mark brand="VISA" />}
          description="Expires 08/28"
          trailing={<Badge dot={false}>Default</Badge>}
        >
          <Last4 brand="Visa" last4="4242" />
        </ChoiceCard>
        <ChoiceCard value="pm_2" leading={<Mark brand="MC" />} description="Expires 11/27">
          <Last4 brand="Mastercard" last4="5100" />
        </ChoiceCard>
      </ChoiceCardGroup>
    </Field>
  );
}

/** Any choice that needs a second line: delivery speeds, with one not available today. */
export function ChoiceCardDeliveryExample(): JSX.Element {
  return (
    <Field label="Delivery" name="delivery" group required>
      <ChoiceCardGroup style={{ maxInlineSize: 430 }}>
        <ChoiceCard value="standard" description="3–5 working days · Free">
          Standard
        </ChoiceCard>
        <ChoiceCard value="express" description="Next working day · ₹120">
          Express
        </ChoiceCard>
        <ChoiceCard value="same-day" description="Order before 12:00 · ₹240" disabled>
          Same day
        </ChoiceCard>
      </ChoiceCardGroup>
    </Field>
  );
}

/**
 * Invalid through the Field: a declined or expired card. The Field's error describes the group, and
 * the chosen card's ring turns critical.
 */
export function ChoiceCardInvalidExample(): JSX.Element {
  return (
    <Field
      label="Payment method"
      name="paymentMethodRetry"
      group
      error="This card has expired. Choose another card or add one."
    >
      <ChoiceCardGroup defaultValue="pm_3" style={{ maxInlineSize: 430 }}>
        <ChoiceCard value="pm_3" leading={<Mark brand="AMEX" />} description="Expired 09/26">
          <Last4 brand="American Express" last4="0005" />
        </ChoiceCard>
        <ChoiceCard value="pm_1" leading={<Mark brand="VISA" />} description="Expires 08/28">
          <Last4 brand="Visa" last4="4242" />
        </ChoiceCard>
      </ChoiceCardGroup>
    </Field>
  );
}
