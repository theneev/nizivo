// v0.6's marketing parts in a browser (ARCHITECTURE.md §21.4a, D-dp): each hydrates unchanged and
// keeps its structure: a named region with a named close button, the section's h2, the card's h3,
// a term and its value in a description list, a quote in a figure with its caption, the band's h2,
// the footer's navs named by their headings, and the signup's label, validation and success.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { AnnouncementBar } from '../../src/unstable/announcement-bar/announcement-bar';
import { BentoTile } from '../../src/unstable/bento-tile/bento-tile';
import { CtaBand } from '../../src/unstable/cta-band/cta-band';
import { FeatureCard } from '../../src/unstable/feature-card/feature-card';
import { NewsletterSignup } from '../../src/unstable/newsletter-signup/newsletter-signup.client';
import { SectionHeader } from '../../src/unstable/section-header/section-header';
import { SiteFooter } from '../../src/unstable/site-footer/site-footer';
import { SiteNavbar } from '../../src/unstable/site-navbar/site-navbar';
import { StatBlock } from '../../src/unstable/stat-block/stat-block';
import { TestimonialCard } from '../../src/unstable/testimonial-card/testimonial-card';

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function hydrate(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(container.innerHTML).toBe(before);
  expect(problems).toEqual([]);
  return container;
}

describe('marketing parts', () => {
  test('AnnouncementBar: a named region with a named close button', async () => {
    const onDismiss = vi.fn<() => void>();
    const container = await hydrate(
      <AnnouncementBar dismissible onDismiss={onDismiss} action={<a href="/x">Read</a>}>
        Out now.
      </AnnouncementBar>,
    );
    const region = container.querySelector('[role="region"]');
    expect(region?.getAttribute('aria-label')).toBe('Announcement');
    const close = container.querySelector('button');
    expect(close?.getAttribute('aria-label')).toBe('Dismiss announcement');
    close?.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('SectionHeader and FeatureCard: an h2 and an h3', async () => {
    const container = await hydrate(
      <>
        <SectionHeader title="Everything" description="Tokens and parts." />
        <FeatureCard title="Accessible">Every pair passes.</FeatureCard>
      </>,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Everything');
    expect(container.querySelector('article h3')?.textContent).toBe('Accessible');
  });

  test('StatBlock: a term before its value; TestimonialCard: a quote in a figure', async () => {
    const container = await hydrate(
      <>
        <dl>
          <StatBlock value="228" label="colour pairs checked" />
        </dl>
        <TestimonialCard quote="It works." name="Maya" jobTitle="Founder" />
      </>,
    );
    const [term, value] = [...container.querySelectorAll('dl > div > *')];
    expect(term?.tagName).toBe('DT');
    expect(value?.tagName).toBe('DD');
    expect(container.querySelector('figure > blockquote')?.textContent).toBe('It works.');
    expect(container.querySelector('figure > figcaption')?.textContent).toBe('MayaFounder');
  });

  test('CtaBand and SiteFooter: an h2, and navs named by their headings', async () => {
    const container = await hydrate(
      <>
        <CtaBand title="Ship it" />
        <SiteFooter
          columns={[{ title: 'Product', links: [{ label: 'Components', href: '/c' }] }]}
          legal="Nizivo"
        />
      </>,
    );
    expect(container.querySelector('section h2')?.textContent).toBe('Ship it');
    const nav = container.querySelector('footer nav');
    const heading = document.getElementById(nav?.getAttribute('aria-labelledby') ?? '');
    expect(heading?.textContent).toBe('Product');
  });

  test('NewsletterSignup: a labelled email field, validation, then an announced success', async () => {
    const subscribed: string[] = [];
    const container = await hydrate(
      <NewsletterSignup
        title="Release notes"
        onSubscribe={(email) => void subscribed.push(email)}
      />,
    );
    const input = container.querySelector('input');
    expect(input?.type).toBe('email');
    expect(input?.getAttribute('autocomplete')).toBe('email');
    expect(input?.labels?.[0]?.textContent).toContain('Email');
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (input === null || submit === null) throw new Error('no form');
    await userEvent.click(submit);
    expect(subscribed).toEqual([]);
    expect(input.validity.valueMissing).toBe(true);
    await userEvent.type(input, 'maya@example.com');
    await userEvent.click(submit);
    await vi.waitFor(() => expect(subscribed).toEqual(['maya@example.com']));
    await vi.waitFor(() =>
      expect(container.querySelector('.nz-newsletter-signup-status')?.textContent).toBe(
        'Thanks — check your inbox to confirm.',
      ),
    );
  });

  test('SiteNavbar: a nav named "Main", the current page marked; BentoTile: its h3', async () => {
    const container = await hydrate(
      <>
        <SiteNavbar
          links={[
            { label: 'Docs', href: '/docs/', current: true },
            { label: 'Pricing', href: '/pricing/' },
          ]}
        />
        <BentoTile title="Tokens" />
      </>,
    );
    const nav = container.querySelector('header nav');
    expect(nav?.getAttribute('aria-label')).toBe('Main');
    const current = [...container.querySelectorAll('a[aria-current="page"]')];
    expect(current.length).toBeGreaterThan(0);
    expect(current.every((link) => link.textContent === 'Docs')).toBe(true);
    expect(container.querySelector('summary')?.getAttribute('aria-label')).toBe('Menu');
    expect(container.querySelector('article h3')?.textContent).toBe('Tokens');
  });
});
