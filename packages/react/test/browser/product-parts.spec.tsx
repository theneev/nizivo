// v0.5's parts in a browser (ARCHITECTURE.md §21.4a, D-do): Tag (a pressed toggle with a check, a
// named remove button, sibling buttons), Rating (one image named in words), NotificationItem (one
// link that says "Unread"), FileItem (a named progress bar, buttons named after the file), Comment
// (Like named with its count), EventCard (the full date for screen readers) and ProfileCard (a
// heading and a description list).
import { useState, type JSX, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { Comment } from '../../src/unstable/comment/comment';
import { EventCard } from '../../src/unstable/event-card/event-card';
import { FileItem } from '../../src/unstable/file-item/file-item';
import { NotificationItem } from '../../src/unstable/notification-item/notification-item';
import { ProfileCard } from '../../src/unstable/profile-card/profile-card';
import { Rating } from '../../src/unstable/rating/rating';
import { Tag } from '../../src/unstable/tag/tag';

const STYLES = import.meta.glob(
  [
    '../../../tokens/dist/tokens.css',
    '../../styles/base.css',
    '../../src/progress-bar/progress-bar.css',
    '../../src/unstable/tag/tag.css',
    '../../src/unstable/rating/rating.css',
    '../../src/unstable/notification-item/notification-item.css',
    '../../src/unstable/file-item/file-item.css',
    '../../src/unstable/comment/comment.css',
    '../../src/unstable/event-card/event-card.css',
    '../../src/unstable/profile-card/profile-card.css',
  ],
  { query: '?raw', import: 'default', eager: true },
);
if (Object.keys(STYLES).length !== 10)
  throw new Error('a stylesheet is missing; build @nizivo/tokens');
const style = document.createElement('style');
style.textContent = Object.values(STYLES).join('\n');
document.head.append(style);

const roots: Root[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) root.unmount();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

async function hydrate(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  container.innerHTML = renderToString(app);
  document.body.append(container);
  const before = container.innerHTML;
  const problems: unknown[] = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => problems.push(args));
  roots.push(hydrateRoot(container, app, { onRecoverableError: (error) => problems.push(error) }));
  await settle();
  expect(container.innerHTML).toBe(before);
  expect(problems).toEqual([]);
  return container;
}

async function mount(app: ReactNode): Promise<HTMLElement> {
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  roots.push(root);
  root.render(app);
  await settle();
  return container;
}

function one(container: ParentNode, selector: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(selector);
  if (element === null) throw new Error(`no ${selector}`);
  return element;
}

function Filter({ onRemove }: { onRemove: () => void }): JSX.Element {
  const [selected, setSelected] = useState(false);
  return (
    <Tag
      label="Ceramics"
      selected={selected}
      onToggle={() => setSelected(!selected)}
      removable
      onRemove={onRemove}
    />
  );
}

describe('Tag', () => {
  test('hydrates; a token is text with a named remove button', async () => {
    const container = await hydrate(<Tag label="Ceramics" removable />);
    expect(container.querySelector('[data-slot="tag-toggle"]')).toBeNull();
    expect(one(container, '[data-slot="tag-remove"]').getAttribute('aria-label')).toBe(
      'Remove Ceramics',
    );
  });

  test('a filter toggles aria-pressed and its check; remove is a sibling button', async () => {
    const onRemove = vi.fn<() => void>();
    const container = await mount(<Filter onRemove={onRemove} />);
    const toggle = one(container, '[data-slot="tag-toggle"]');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('.nz-tag-check')).toBeNull();
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.nz-tag-check')).not.toBeNull();
    const remove = one(container, '[data-slot="tag-remove"]');
    expect(toggle.contains(remove)).toBe(false);
    await userEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Rating', () => {
  test('one image named in words; the visible parts are hidden from it', async () => {
    const container = await hydrate(<Rating value={4.8} count={1208} />);
    const rating = one(container, '[data-slot="rating"]');
    expect(rating.getAttribute('role')).toBe('img');
    expect(rating.getAttribute('aria-label')).toBe('Rated 4.8 out of 5 from 1,208 reviews');
    expect(rating.textContent).toBe('4.8(1,208 reviews)');
    expect(container.querySelectorAll('[data-variant="filled"]')).toHaveLength(4);
  });
});

describe('NotificationItem', () => {
  test('one link; an unread row says so in its name', async () => {
    const container = await hydrate(
      <>
        <NotificationItem href="#a" unread title="Jonah commented" detail="Ship it." />
        <NotificationItem href="#b" title="Maya ordered" />
      </>,
    );
    const [unread, read] = [...container.querySelectorAll('a')];
    expect(unread?.textContent).toBe('Unread: Jonah commentedShip it.');
    expect(read?.textContent).toBe('Maya ordered');
    expect(unread?.getAttribute('data-variant')).toBe('unread');
  });
});

describe('FileItem', () => {
  test('a named progress bar and buttons named after the file', async () => {
    const onCancel = vi.fn<() => void>();
    const container = await mount(
      <>
        <FileItem name="a.pdf" status="uploading" progress={62} onCancel={onCancel} />
        <FileItem name="b.pdf" status="done" />
        <FileItem name="c.pdf" status="error" detail="Too big" />
      </>,
    );
    const progress = container.querySelector('progress');
    expect(progress?.getAttribute('aria-label')).toBe('Uploading a.pdf');
    expect(progress?.value).toBe(62);
    const actions = [...container.querySelectorAll('[data-slot="file-item-action"]')];
    expect(actions.map((a) => a.getAttribute('aria-label'))).toEqual([
      'Cancel upload of a.pdf',
      'Retry upload of c.pdf',
    ]);
    const cancel = actions[0];
    if (!(cancel instanceof HTMLElement)) throw new Error('no cancel');
    await userEvent.click(cancel);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Uploaded');
  });
});

describe('Comment', () => {
  test('Like is a toggle named with its count; replies nest as articles', async () => {
    const onLike = vi.fn<() => void>();
    const container = await hydrate(
      <Comment
        author="Priya"
        likes={1208}
        onLike={onLike}
        replyable
        replies={<Comment author="Jonah">Yes.</Comment>}
      >
        Try the sage glaze.
      </Comment>,
    );
    const [like, reply] = [
      ...container.querySelectorAll<HTMLElement>('[data-slot="comment-action"]'),
    ];
    expect(like?.getAttribute('aria-label')).toBe('Like, 1,208');
    expect(like?.getAttribute('aria-pressed')).toBe('false');
    expect(reply?.textContent).toBe('Reply');
    expect(container.querySelectorAll('article article')).toHaveLength(1);
  });
});

describe('EventCard', () => {
  test('the date block is hidden; the full date is a time element', async () => {
    const container = await hydrate(
      <EventCard title="Live drop" date="2026-11-16T18:00:00Z" timeZone="UTC" when="18:00" />,
    );
    expect(one(container, '.nz-event-card-date').getAttribute('aria-hidden')).toBe('true');
    const time = one(container, 'time');
    expect(time.getAttribute('datetime')).toBe('2026-11-16T18:00:00.000Z');
    expect(time.textContent).toBe('Monday, November 16, 2026');
    expect(one(container, 'h3').textContent).toBe('Live drop');
  });
});

describe('ProfileCard', () => {
  test('the name is the heading; the counts are a description list', async () => {
    const container = await hydrate(
      <ProfileCard name="Alex Rivera" stats={[{ label: 'Posts', value: '142' }]} />,
    );
    expect(one(container, 'h3').textContent).toBe('Alex Rivera');
    expect(one(container, 'dt').textContent).toBe('Posts');
    expect(one(container, 'dd').textContent).toBe('142');
  });
});
