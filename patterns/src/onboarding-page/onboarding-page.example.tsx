import type { JSX } from 'react';
import { CircleCheck, Circle } from '@nizivo/icons';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { EmptyState } from '@nizivo/react/empty-state';
import { NumberValue } from '@nizivo/react/number-value';
import { PageHeader } from '@nizivo/react/page-header';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { Split } from '@nizivo/react/split';
import { Text } from '@nizivo/react/text';

interface Step {
  id: string;
  title: string;
  detail: string;
  done: boolean;
  /** The step's action while it is still to do. */
  action?: string;
}

const STEPS: Step[] = [
  {
    id: 'product',
    title: 'Add your first product',
    detail: 'Stoneware mug is live.',
    done: true,
  },
  {
    id: 'brand',
    title: 'Name your store and add a logo',
    detail: 'Moss & Kiln, with your logo on every page.',
    done: true,
  },
  {
    id: 'payments',
    title: 'Set up payments',
    detail: 'Choose how customers pay you.',
    done: false,
    action: 'Set up',
  },
  {
    id: 'shipping',
    title: 'Add shipping rates',
    detail: 'Set what delivery costs, by region.',
    done: false,
    action: 'Add rates',
  },
  {
    id: 'instagram',
    title: 'Tag products in your posts',
    detail: 'Shoppers buy straight from your feed.',
    done: false,
    action: 'Tag posts',
  },
];

/**
 * Figma 08's Pattern 8, Onboarding: the content of the app shell's `<main>` on a new store's home.
 * The page header, then the setup guide (an ordered list of steps, each done or to do in words, with
 * the overall progress on a ProgressBar), an empty state for the orders that have not come yet, and
 * an aside of next-step cards. The neutral blocks stand in for Figma's 3D renders, an `Image` in
 * the app. A server composition: it ships no JavaScript.
 */
export function OnboardingPageExample(): JSX.Element {
  const done = STEPS.filter((step) => step.done).length;
  return (
    <div className="nzp-onboarding-page">
      <PageHeader level={2} title="Let's get Moss & Kiln selling" />
      <Split.Root>
        <Split.Main className="nzp-onboarding-page-column">
          <Card.Root render={<section aria-labelledby="nzp-onboarding-guide" />}>
            <Card.Header>
              <Card.Title id="nzp-onboarding-guide">Setup guide</Card.Title>
              <Card.Description>
                {done} of {STEPS.length} steps done
              </Card.Description>
            </Card.Header>
            <ProgressBar
              label="Setup progress"
              value={done}
              max={STEPS.length}
              valueText={`${String(done)} of ${String(STEPS.length)} steps done`}
            />
            <ol className="nzp-onboarding-page-steps">
              {STEPS.map((step) => (
                <li
                  key={step.id}
                  className={
                    step.done
                      ? 'nzp-onboarding-page-step nzp-onboarding-page-done'
                      : 'nzp-onboarding-page-step'
                  }
                >
                  <span className="nzp-onboarding-page-mark">
                    {step.done ? <CircleCheck /> : <Circle />}
                  </span>
                  <span className="nzp-onboarding-page-text">
                    <Text render={<span />} variant="label-m-strong">
                      {step.title}
                    </Text>
                    <Text render={<span />} tone="secondary">
                      {step.done ? 'Done' : 'To do'} · {step.detail}
                    </Text>
                  </span>
                  {step.action !== undefined && (
                    <Button size="sm" aria-label={`${step.action}: ${step.title}`}>
                      {step.action}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </Card.Root>
          <EmptyState
            level={3}
            title="No orders yet"
            media={<span className="nzp-onboarding-page-render" aria-hidden="true" />}
            actions={<Button variant="primary">Share your store</Button>}
          />
        </Split.Main>
        <Split.Aside className="nzp-onboarding-page-column">
          <Card.Root tone="brand" render={<section aria-labelledby="nzp-onboarding-instagram" />}>
            <span className="nzp-onboarding-page-media" aria-hidden="true" />
            <Card.Header>
              <Card.Title id="nzp-onboarding-instagram">
                Put your store link in your Instagram bio
              </Card.Title>
              <Card.Description>
                Followers reach your products in one tap from your profile.
              </Card.Description>
            </Card.Header>
            <Card.Footer>
              <Button variant="primary">Copy store link</Button>
            </Card.Footer>
          </Card.Root>
          <Card.Root tone="inverse" render={<section aria-labelledby="nzp-onboarding-plan" />}>
            <Card.Header>
              <Card.Title id="nzp-onboarding-plan">Grow plan</Card.Title>
              <Card.Description>
                Lower card fees, wholesale prices and five staff accounts.
              </Card.Description>
            </Card.Header>
            <Text render={<p />} className="nzp-onboarding-page-price">
              <Text render={<span />} variant="numeric-l">
                <NumberValue value={29} format={{ style: 'currency', currency: 'USD' }} />
              </Text>{' '}
              a month
            </Text>
            <Card.Footer>
              <Button variant="accent">Try Grow free</Button>
            </Card.Footer>
          </Card.Root>
        </Split.Aside>
      </Split.Root>
    </div>
  );
}
