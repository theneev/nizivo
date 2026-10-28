import type { ComponentPropsWithRef, JSX } from 'react';
import { CreditCard, Plus } from '@nizivo/icons';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { ChoiceCard, ChoiceCardGroup } from '@nizivo/react/choice-card';
import { Field } from '@nizivo/react/field';
import { Stack } from '@nizivo/react/stack';

// The spoken expiry, "August 2028": an explicit locale and time zone, so the server and the browser
// print the same text.
const EXPIRY = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  /** 1 to 12. */
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const CARDS: SavedCard[] = [
  { id: 'pm_1', brand: 'Visa', last4: '4242', expMonth: 8, expYear: 2028, isDefault: true },
  { id: 'pm_2', brand: 'Mastercard', last4: '5100', expMonth: 11, expYear: 2027, isDefault: false },
  {
    id: 'pm_3',
    brand: 'American Express',
    last4: '0005',
    expMonth: 3,
    expYear: 2029,
    isDefault: false,
  },
];

/** Stands in for your router's link component, such as Next's `Link`. */
function Link({ children, ...props }: ComponentPropsWithRef<'a'>): JSX.Element {
  return <a {...props}>{children}</a>;
}

/** "Expires 08/28" on screen; "Expires August 2028" for screen readers. */
function Expiry({ card }: { card: SavedCard }): JSX.Element {
  const month = String(card.expMonth).padStart(2, '0');
  const year = String(card.expYear % 100).padStart(2, '0');
  const spoken = EXPIRY.format(new Date(`${card.expYear}-${month}-01T00:00:00Z`));
  return (
    <>
      <span aria-hidden="true">{`Expires ${month}/${year}`}</span>
      <span className="nz-visually-hidden">{`Expires ${spoken}`}</span>
    </>
  );
}

/** The card's name: the brand in words, the bullets hidden, the last four digits in Mono. */
function CardName({ card }: { card: SavedCard }): JSX.Element {
  return (
    <>
      {card.brand}
      <span className="nz-visually-hidden"> ending in</span>{' '}
      <span className="nzp-payment-method-number">
        <span aria-hidden="true">•••• </span>
        {card.last4}
      </span>
    </>
  );
}

/**
 * A Payment Method as a choice of saved cards: a ChoiceCard per card, native
 * radios in a Field that names the group, so arrow keys move the choice and the form submits it. Each
 * card is read as "Visa ending in 4242, Default", described by "Expires August 2028". The generic
 * mark stands in for a card brand's logo, which is the app's to supply under the brand's rules.
 */
export function PaymentMethodExample(): JSX.Element {
  return (
    <form action="#" aria-label="Payment" className="nzp-payment-method">
      <Stack gap="4">
        <Field label="Payment method" name="paymentMethod" group required>
          <ChoiceCardGroup defaultValue="pm_1">
            {CARDS.map((card) => (
              <ChoiceCard
                key={card.id}
                value={card.id}
                leading={
                  <span className="nzp-payment-method-mark">
                    <CreditCard size={18} />
                  </span>
                }
                description={<Expiry card={card} />}
                trailing={card.isDefault ? <Badge dot={false}>Default</Badge> : undefined}
              >
                <CardName card={card} />
              </ChoiceCard>
            ))}
          </ChoiceCardGroup>
        </Field>
        <div>
          <Button
            variant="tertiary"
            leadingIcon={<Plus />}
            render={<Link href="#add-payment-method" />}
          >
            Add a payment method
          </Button>
        </div>
      </Stack>
    </form>
  );
}
