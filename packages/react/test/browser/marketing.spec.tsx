// v0.6's marketing parts in a browser (ARCHITECTURE.md §21.4a, D-dp): each hydrates unchanged and
// keeps its structure: a named region with a named close button, the section's h2, the card's h3,
// a term and its value in a description list, and a quote in a figure with its caption.
import type { ReactNode } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AnnouncementBar } from '../../src/unstable/announcement-bar/announcement-bar';
import { FeatureCard } from '../../src/unstable/feature-card/feature-card';
import { SectionHeader } from '../../src/unstable/section-header/section-header';
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
});
