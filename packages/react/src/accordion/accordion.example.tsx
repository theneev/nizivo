import type { JSX } from 'react';
import { Accordion } from './index';

/** Frequently asked questions: one answer open at a time (`name`), with no client JavaScript. */
export function AccordionExample(): JSX.Element {
  return (
    <Accordion.Root name="shipping-faq" style={{ maxInlineSize: 560 }}>
      <Accordion.Item defaultOpen>
        <Accordion.Trigger>When will my order ship?</Accordion.Trigger>
        <Accordion.Panel>
          Orders placed before 2 pm ship the same working day. You get a tracking link by email.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Trigger>Can I change my delivery address?</Accordion.Trigger>
        <Accordion.Panel>
          Yes, until the order ships. Open the order from your account and choose Edit address.
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Trigger>How do returns work?</Accordion.Trigger>
        <Accordion.Panel>
          Return any unused item within 30 days. The return label is free for orders over €50.
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

/** A checkout's collapsible order summary: independent items, without `name`. */
export function AccordionOrderSummaryExample(): JSX.Element {
  return (
    <Accordion.Root style={{ maxInlineSize: 400 }}>
      <Accordion.Item>
        <Accordion.Trigger>Order summary (3 items) · €84.00</Accordion.Trigger>
        <Accordion.Panel>Sand mug ×2 · €48.00. Stoneware bowl ×1 · €36.00.</Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item>
        <Accordion.Trigger>Add a promo code</Accordion.Trigger>
        <Accordion.Panel>Codes apply at the payment step.</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}
