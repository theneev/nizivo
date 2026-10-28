// The home page's sections (Figma's Website page, desktop 7398:703 and mobile 7405:1321; M90), built
// from Nizivo's own parts with the repo's real numbers (lib/home.ts). Server parts throughout; the
// client leaves are the parts that are interactive anyway (CodeBlock's tabs and copy, the shaders,
// WordRotator, Input) and the two demos in home-demos.tsx. The copy differs from the frames where
// they name a package or a count the library does not ship. The hero's floating cards are a picture
// of the kit, not controls: they are `inert` and hidden from assistive technology.
import type { JSX, ReactNode } from 'react';
import Link from 'next/link';
import { Avatar, AvatarGroup } from '@nizivo/react/avatar';
import { Badge } from '@nizivo/react/badge';
import { Button } from '@nizivo/react/button';
import { Card } from '@nizivo/react/card';
import { Delta } from '@nizivo/react/delta';
import { FieldStatic } from '@nizivo/react/field';
import { Input } from '@nizivo/react/input';
import { ProgressBar } from '@nizivo/react/progress-bar';
import { Skeleton } from '@nizivo/react/skeleton';
import { AnnouncementBar } from '@nizivo/react/unstable/announcement-bar';
import { BentoTile } from '@nizivo/react/unstable/bento-tile';
import { CaretHeadline } from '@nizivo/react/unstable/caret-headline';
import { ChatLog, ChatMessage } from '@nizivo/react/unstable/chat-message';
import { CodeBlock } from '@nizivo/react/unstable/code-block';
import { CtaBand } from '@nizivo/react/unstable/cta-band';
import { DocsCard } from '@nizivo/react/unstable/docs-card';
import { FileItem } from '@nizivo/react/unstable/file-item';
import { GlowOrb } from '@nizivo/react/unstable/glow-orb';
import { LivePulse } from '@nizivo/react/unstable/live-pulse';
import { NotificationItem } from '@nizivo/react/unstable/notification-item';
import { ProfileCard } from '@nizivo/react/unstable/profile-card';
import { Rating } from '@nizivo/react/unstable/rating';
import { ShaderSurface } from '@nizivo/react/unstable/shader-surface';
import { SiteFooter } from '@nizivo/react/unstable/site-footer';
import { StatBlock } from '@nizivo/react/unstable/stat-block';
import { SuggestionChip } from '@nizivo/react/unstable/suggestion-chip';
import { Tag } from '@nizivo/react/unstable/tag';
import { TestimonialCard } from '@nizivo/react/unstable/testimonial-card';
import { Ticker } from '@nizivo/react/unstable/ticker';
import { UsageMeter } from '@nizivo/react/unstable/usage-meter';
import { WordRotator } from '@nizivo/react/unstable/word-rotator';
import { ArrowDownRight } from '@nizivo/icons/arrow-down-right';
import { ArrowRight } from '@nizivo/icons/arrow-right';
import { ArrowUpDown } from '@nizivo/icons/arrow-up-down';
import { ArrowUpRight } from '@nizivo/icons/arrow-up-right';
import { Bell } from '@nizivo/icons/bell';
import { BookOpen } from '@nizivo/icons/book-open';
import { Box } from '@nizivo/icons/box';
import { Calendar } from '@nizivo/icons/calendar';
import { ChartColumn } from '@nizivo/icons/chart-column';
import { ChartLine } from '@nizivo/icons/chart-line';
import { Check } from '@nizivo/icons/check';
import { ChevronDown } from '@nizivo/icons/chevron-down';
import { ChevronLeft } from '@nizivo/icons/chevron-left';
import { ChevronRight } from '@nizivo/icons/chevron-right';
import { ChevronUp } from '@nizivo/icons/chevron-up';
import { ChevronsUpDown } from '@nizivo/icons/chevrons-up-down';
import { CircleCheck } from '@nizivo/icons/circle-check';
import { CircleQuestionMark } from '@nizivo/icons/circle-question-mark';
import { CircleX } from '@nizivo/icons/circle-x';
import { Clock } from '@nizivo/icons/clock';
import { Command } from '@nizivo/icons/command';
import { Copy } from '@nizivo/icons/copy';
import { CreditCard } from '@nizivo/icons/credit-card';
import { Download } from '@nizivo/icons/download';
import { Ellipsis } from '@nizivo/icons/ellipsis';
import { Eye } from '@nizivo/icons/eye';
import { FileText } from '@nizivo/icons/file-text';
import { Funnel } from '@nizivo/icons/funnel';
import { Gift } from '@nizivo/icons/gift';
import { Globe } from '@nizivo/icons/globe';
import { GripVertical } from '@nizivo/icons/grip-vertical';
import { House } from '@nizivo/icons/house';
import { Image } from '@nizivo/icons/image';
import { Info } from '@nizivo/icons/info';
import { Layers } from '@nizivo/icons/layers';
import { LayoutDashboard } from '@nizivo/icons/layout-dashboard';
import { LayoutGrid } from '@nizivo/icons/layout-grid';
import { Link as LinkIcon } from '@nizivo/icons/link';
import { List } from '@nizivo/icons/list';
import { LogOut } from '@nizivo/icons/log-out';
import { Mail } from '@nizivo/icons/mail';
import { Palette } from '@nizivo/icons/palette';
import { Plus } from '@nizivo/icons/plus';
import { SlidersHorizontal } from '@nizivo/icons/sliders-horizontal';
import { Sparkles } from '@nizivo/icons/sparkles';
import { REPO_URL } from '../lib/repo-url';
import { swatchInk, type HomeFacts } from '../lib/home';
import { FollowButton, HomePlayer } from './home-demos';
import { Mark } from './site-mark';

const INSTALL = [
  { label: 'npm', code: 'npm i @nizivo/react @nizivo/tokens' },
  { label: 'pnpm', code: 'pnpm add @nizivo/react @nizivo/tokens' },
  { label: 'yarn', code: 'yarn add @nizivo/react @nizivo/tokens' },
] as const;

const format = (n: number): string => n.toLocaleString('en-US');

/** A section's heading row: the title (with its green words) and the lede beside it. */
function Head({
  id,
  title,
  accent,
  lede,
  stacked = false,
}: {
  id: string;
  title: string;
  accent?: string;
  lede: ReactNode;
  stacked?: boolean;
}): JSX.Element {
  return (
    <div className="nz-home-head">
      <h2 id={id} className="nz-home-title">
        {title}
        {accent !== undefined && (
          <>
            {stacked ? <br /> : ' '}
            <span className="nz-home-accent">{accent}</span>
          </>
        )}
      </h2>
      <p className="nz-home-lede">{lede}</p>
    </div>
  );
}

/** The bar above the header: the release this site documents. */
export function HomeAnnouncement({ version }: { version: string }): JSX.Element {
  return (
    <AnnouncementBar action={<a href="/docs/changelog/">Read the changelog →</a>}>
      Nizivo UI {version} is out.
    </AnnouncementBar>
  );
}

/** The hero's floating cards: a picture of the kit at work. */
function HeroCluster(): JSX.Element {
  return (
    <div className="nz-home-cluster" inert aria-hidden="true">
      <Card.Root padding="sm" className="nz-home-float" data-at="rating">
        <Rating value={4.8} count={1208} />
      </Card.Root>
      <Card.Root padding="sm" className="nz-home-float" data-at="source">
        <span className="nz-home-source">
          <Globe aria-hidden="true" />
          mossandkiln.com
          <Badge>1</Badge>
        </span>
        <strong className="nz-home-float-title">Autumn restock: what sold out first</strong>
      </Card.Root>
      <Card.Root padding="sm" className="nz-home-float" data-at="credits">
        <UsageMeter
          label="AI credits"
          value={640}
          max={1000}
          note="Resets on Nov 1 · Upgrade for more"
        />
      </Card.Root>
      <Card.Root className="nz-home-float" data-at="kpi">
        <span className="nz-home-float-label">Returning rate</span>
        <span className="nz-home-kpi">
          <span className="nz-home-kpi-value">$48,290</span>
          <svg viewBox="0 0 96 32" className="nz-home-spark" aria-hidden="true">
            <path d="M2 26 10 22 18 25 26 18 34 21 42 15 50 19 58 12 66 15 74 9 82 11 94 4" />
          </svg>
        </span>
        <Delta value={0.124} comparison="vs last week" />
      </Card.Root>
      <Card.Root padding="sm" className="nz-home-float" data-at="model">
        <span className="nz-home-model">
          <strong>Fast</strong>
          <span>Quick answers for simple tasks</span>
        </span>
        <span className="nz-home-model" data-selected="">
          <strong>Balanced</strong>
          <span>Good for most work</span>
          <Check aria-hidden="true" />
        </span>
        <span className="nz-home-model">
          <strong>Deep</strong>
          <span>Slower, more careful reasoning</span>
        </span>
      </Card.Root>
      <SuggestionChip className="nz-home-float-chip" data-at="draft">
        Draft a launch post
      </SuggestionChip>
      <SuggestionChip className="nz-home-float-chip" data-at="stock">
        Find slow-moving stock
      </SuggestionChip>
      <Card.Root padding="sm" className="nz-home-float" data-at="photo">
        <span className="nz-home-photo">
          <img src="/home/mug.jpg" alt="" width={240} height={240} />
          <Badge tone="success" dot>
            Active
          </Badge>
        </span>
      </Card.Root>
      <Card.Root padding="sm" className="nz-home-float" data-at="people">
        <AvatarGroup size="sm">
          <Avatar name="Maya" src="/home/portrait-2.jpg" />
          <Avatar name="Ines" src="/home/portrait-3.jpg" />
          <Avatar name="Clara" src="/home/portrait-4.jpg" />
        </AvatarGroup>
        <span className="nz-home-float-label">Editing with 3 others</span>
      </Card.Root>
    </div>
  );
}

export function Hero({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <section className="nz-home-hero" aria-labelledby="home-title">
      <span className="nz-home-hero-ground">
        <ShaderSurface />
      </span>
      <div className="nz-home-hero-text">
        <CaretHeadline id="home-title" level={1} className="nz-home-hero-title">
          Calm, accessible product UI
        </CaretHeadline>
        <p className="nz-home-hero-lede">
          Nizivo is an open-source React design system for dashboards, commerce, websites and AI
          products: {format(facts.tokens)} tokens, {facts.components} components, live shaders and
          motion, with every colour pair measured against WCAG 2.2 AA.
        </p>
        <CodeBlock variant="command" items={INSTALL} className="nz-home-hero-code" />
        <div className="nz-home-actions">
          <Button variant="primary" size="lg" render={<Link href="/docs/getting-started/next/" />}>
            Get started
          </Button>
          <Button variant="secondary" size="lg" render={<Link href="/docs/components/" />}>
            Browse components
          </Button>
        </div>
      </div>
      <HeroCluster />
    </section>
  );
}

export function HomeTicker({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <div className="nz-home-ticker">
      <Ticker
        aria-label="Highlights"
        items={[
          'Light & Dark',
          'WCAG 2.2 AA',
          'Reduced motion',
          'Live shaders',
          `${format(facts.tokens)} tokens`,
          '1 px borders',
          '2 px focus ring',
          'Server Components',
          'Commerce kit',
          'AI kit',
        ]}
      />
    </div>
  );
}

function Step({
  n,
  title,
  text,
  children,
}: {
  n: number;
  title: string;
  text: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <li className="nz-home-card nz-home-step">
      <span className="nz-home-step-n" aria-hidden="true">
        {n}
      </span>
      <h3 className="nz-home-card-title">
        <span className="nz-visually-hidden">Step {n}: </span>
        {title}
      </h3>
      <p className="nz-home-card-text">{text}</p>
      {children}
    </li>
  );
}

export function GetStarted(): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-start">
      <Head
        id="home-start"
        title="Get started in"
        accent="three steps"
        stacked
        lede="Install the packages, load one stylesheet, then compose screens from components that render on the server."
      />
      <ol className="nz-home-steps">
        <Step n={1} title="Install" text="Add the library and its tokens to any React project.">
          <CodeBlock variant="command" items={INSTALL} />
        </Step>
        <Step
          n={2}
          title="Load the styles"
          text="One stylesheet holds the tokens and every component's styles, in Light and Dark."
        >
          <CodeBlock
            items={[
              {
                label: 'tsx',
                code: [
                  "import '@nizivo/react/styles.css';",
                  '',
                  '<html data-nz-theme="dark">',
                  '  …',
                  '</html>',
                ].join('\n'),
              },
              { label: 'css', code: "@import '@nizivo/react/styles.css';" },
            ]}
          />
        </Step>
        <Step
          n={3}
          title="Use components"
          text="Import what you need: each component is its own entry, and most need no client JavaScript."
        >
          <CodeBlock
            items={[
              {
                label: 'tsx',
                code: [
                  "import { Button } from '@nizivo/react/button';",
                  '',
                  '<Button variant="primary">',
                  '  Save product',
                  '</Button>',
                ].join('\n'),
              },
            ]}
          />
        </Step>
      </ol>
    </section>
  );
}

export function BrowseDocs({ facts }: { facts: HomeFacts }): JSX.Element {
  const cards: { title: string; href: string; text: string; meta: string; icon: ReactNode }[] = [
    {
      title: 'Getting started',
      href: '/docs/getting-started/next/',
      text: 'Install, theming, Tailwind and your first screen.',
      meta: 'Next.js · Vite · Astro',
      icon: <BookOpen />,
    },
    {
      title: 'Foundations',
      href: '/docs/foundations/colour/',
      text: 'Colour, type, space, radius, elevation and motion.',
      meta: `${facts.foundations} foundations`,
      icon: <Layers />,
    },
    {
      title: 'Components',
      href: '/docs/components/',
      text: 'Props, states, code and keyboard notes for every control.',
      meta: `${facts.components} components`,
      icon: <LayoutGrid />,
    },
    {
      title: 'Patterns',
      href: '/docs/patterns/',
      text: 'Pages and blocks for commerce: orders, products, discounts.',
      meta: `${facts.patterns} patterns`,
      icon: <LayoutDashboard />,
    },
    {
      title: 'Tokens',
      href: '/docs/foundations/tokens/',
      text: 'Every variable with its CSS name, Light and Dark values.',
      meta: `${format(facts.tokens)} tokens`,
      icon: <SlidersHorizontal />,
    },
    {
      title: 'Icons',
      href: '/docs/icons/',
      text: 'Search the set, copy the import; each icon is its own entry.',
      meta: `${format(facts.icons)} icons`,
      icon: <Palette />,
    },
    {
      title: 'Charts',
      href: '/docs/charts/',
      text: 'Area, bar, donut, funnel and heatmap, from the same tokens.',
      meta: `${facts.charts} charts`,
      icon: <ChartColumn />,
    },
    {
      title: 'Changelog',
      href: '/docs/changelog/',
      text: 'Every release of the four packages, newest first.',
      meta: `v${facts.version}`,
      icon: <FileText />,
    },
  ];
  return (
    <section className="nz-home-section" aria-labelledby="home-browse">
      <Head
        id="home-browse"
        title="Browse the"
        accent="docs"
        lede="Every component page pairs a live example with its code, props, states, tokens and accessibility notes."
      />
      <ul className="nz-home-browse">
        {cards.map((c) => (
          <li key={c.title}>
            <DocsCard
              href={c.href}
              title={c.title}
              description={c.text}
              meta={c.meta}
              icon={c.icon}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function DesignLanguage(): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-language">
      <Head
        id="home-language"
        title="Design"
        accent="language"
        stacked
        lede="Soft paper neutrals, a deep green you can trust and a lime that only shows up when something is alive: AI, live data, the next step."
      />
      <div className="nz-home-band nz-home-bento">
        <span className="nz-home-band-ground">
          <ShaderSurface />
        </span>
        <div className="nz-home-bento-player">
          <HomePlayer artwork={<img src="/home/mug.jpg" alt="" width={720} height={720} />} />
        </div>
        <Card.Root tone="inverse" className="nz-home-bento-mark">
          <Mark size={72} />
          <span className="nz-visually-hidden">The Nizivo sprout</span>
        </Card.Root>
        <div className="nz-home-card nz-home-bento-type">
          <span className="nz-home-aa" aria-hidden="true">
            Aa
          </span>
          <span className="nz-home-caption">Geist · Typography</span>
        </div>
        <BentoTile
          className="nz-home-bento-orb"
          size="square"
          headingLevel={3}
          title="Alive, not loud"
          description="Lime only marks AI and live data."
          background={
            <span className="nz-home-orb">
              <GlowOrb />
            </span>
          }
        />
        <ProfileCard
          className="nz-home-bento-profile"
          headingLevel={3}
          name="Alex Rivera"
          avatar={<Avatar name="Alex Rivera" src="/home/portrait-1.jpg" size="xl" decorative />}
          description="Product designer · Lisbon"
          stats={[
            { label: 'Posts', value: '142' },
            { label: 'Followers', value: '8.2k' },
            { label: 'Following', value: '312' },
          ]}
          action={<FollowButton />}
        />
      </div>
    </section>
  );
}

const SWATCHES: { name: string; token: string; big?: boolean }[][] = [
  [
    { name: 'Primary', token: 'bg-brand', big: true },
    { name: 'Ink', token: 'bg-inverse', big: true },
  ],
  [
    { name: 'Text', token: 'text-primary' },
    { name: 'Secondary text', token: 'text-secondary' },
    { name: 'Tertiary text', token: 'text-tertiary' },
    { name: 'Muted', token: 'bg-muted' },
    { name: 'Canvas', token: 'bg-canvas' },
    { name: 'Surface', token: 'bg-surface' },
  ],
  [
    { name: 'Accent', token: 'bg-accent' },
    { name: 'Success', token: 'icon-success' },
    { name: 'Warning', token: 'text-warning' },
    { name: 'Critical', token: 'bg-critical' },
    { name: 'Info', token: 'text-info' },
  ],
];

export function ColourPalette(): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-colour">
      <Head
        id="home-colour"
        title="Colour palette"
        lede="Green builds trust, neutrals carry the work, lime marks what is alive. Every block below is painted by its live token, so it follows the theme."
      />
      <div className="nz-home-card nz-home-palette">
        {SWATCHES.map((row) => (
          <ul key={row[0]?.name} className="nz-home-palette-row">
            {row.map((s) => (
              <li
                key={s.token}
                className="nz-home-swatch"
                data-big={s.big ? '' : undefined}
                style={{ background: `var(--nz-${s.token})`, color: swatchInk(s.token) }}
              >
                <strong>{s.name}</strong>
                <code>{s.token.replace('-', '/')}</code>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

const ALPHABET =
  'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789';

export function Typography(): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-type">
      <Head
        id="home-type"
        title="Typography"
        lede="Geist, one family from display to data. Clean geometric forms stay readable at 12 px and confident at 56."
      />
      <div className="nz-home-card nz-home-type">
        <div className="nz-home-type-top">
          <span className="nz-home-aa nz-home-aa-big" aria-hidden="true">
            Aa
          </span>
          <dl className="nz-home-weights">
            {(['Regular', 'Medium', 'Semibold'] as const).map((w) => (
              <div key={w} data-weight={w.toLowerCase()}>
                <dt>{w}</dt>
                <dd>{ALPHABET}</dd>
              </div>
            ))}
          </dl>
        </div>
        <dl className="nz-home-scale">
          <div>
            <dt>Display/L · 56</dt>
            <dd data-type="display-l">The future of product UI</dd>
          </div>
          <div>
            <dt>Heading/H1 · 32</dt>
            <dd data-type="heading-h1">Built for calm interfaces</dd>
          </div>
          <div>
            <dt>Heading/H3 · 20</dt>
            <dd data-type="heading-h3">Tokens, components, shaders and motion</dd>
          </div>
          <div>
            <dt>Body/L · 16</dt>
            <dd data-type="body-l">
              Every colour pair is measured, every state is designed, and every animation has a
              reduced-motion fallback.
            </dd>
          </div>
          <div>
            <dt>
              Text animation
              <span>
                Headlines can rotate a keyword or blink a caret; both stop in Reduced motion.
              </span>
            </dt>
            <dd className="nz-home-type-motion">
              <span data-type="heading-h3">
                Design for{' '}
                <WordRotator words={['dashboards', 'commerce', 'websites', 'AI products']} />
              </span>
              <CaretHeadline level={3} className="nz-home-type-caret">
                Build calm product UI
              </CaretHeadline>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

/** A library card; `wide` ones stay off a phone, as in Figma's mobile frame. */
function Showcase({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className="nz-home-card nz-home-show" data-wide={wide ? '' : undefined}>
      <h3 className="nz-home-show-label">{label}</h3>
      {children}
    </div>
  );
}

export function Library({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-library">
      <Head
        id="home-library"
        title="Components library"
        lede={`${facts.components} components across forms, data, navigation, marketing and AI products, each with every state designed and its keyboard notes attached.`}
      />
      <div className="nz-home-library">
        <div className="nz-home-library-col">
          <Showcase label="Buttons">
            <div className="nz-home-stack">
              <Button variant="primary" fullWidth>
                Primary button
              </Button>
              <Button variant="secondary" fullWidth>
                Secondary button
              </Button>
              <Button variant="accent" fullWidth leadingIcon={<Sparkles />}>
                Ask Nizivo AI
              </Button>
              <Button variant="primary" fullWidth pending>
                Publishing
              </Button>
            </div>
          </Showcase>
          <Showcase label="Progress" wide>
            <div className="nz-home-stack">
              <ProgressBar label="Monthly goal" value={68} showValue />
              <ProgressBar label="Orders shipped" value={91} showValue />
              <ProgressBar label="Storage used" value={42} showValue tone="neutral" />
            </div>
          </Showcase>
          <Showcase label="Badges & tags" wide>
            <div className="nz-home-wrap">
              <Badge tone="success" dot>
                Paid
              </Badge>
              <Badge tone="warning" dot>
                Pending
              </Badge>
              <Badge tone="critical" dot>
                Refunded
              </Badge>
              <Badge tone="info" dot>
                New
              </Badge>
              <Badge dot>Draft</Badge>
            </div>
            <div className="nz-home-wrap">
              <Tag label="Ceramics" selected />
              <Tag label="Candles" />
            </div>
          </Showcase>
        </div>
        <div className="nz-home-library-col">
          <Showcase label="Testimonial" wide>
            <TestimonialCard
              className="nz-home-bare"
              quote="We rebuilt our checkout in two weeks and the accessibility review came back clean the first time."
              name="Maya Lindqvist"
              jobTitle="Founder, Moss & Kiln"
              avatar={<Avatar name="Maya Lindqvist" src="/home/portrait-1.jpg" decorative />}
            />
          </Showcase>
          <div className="nz-home-card nz-home-stat">
            <h3 className="nz-home-show-label">Stat</h3>
            <dl className="nz-home-stat-list">
              <StatBlock value={facts.components} label="components, all with keyboard notes" />
            </dl>
          </div>
          <Showcase label="Inputs" wide>
            <div className="nz-home-stack">
              <FieldStatic label="Product title" description="Use 80 characters or fewer.">
                {(control) => <Input {...control} placeholder="e.g. Stoneware mug" />}
              </FieldStatic>
              <FieldStatic label="Product title" error="Use 80 characters or fewer.">
                {(control) => <Input {...control} defaultValue="Stoneware mug — Sage" />}
              </FieldStatic>
            </div>
          </Showcase>
        </div>
        <div className="nz-home-library-col">
          <Showcase label="Notifications">
            <div className="nz-home-stack">
              <NotificationItem
                href="/docs/components/notification-item/"
                unread
                title="Jonah Okafor commented on Autumn launch"
                detail="“Love the new cover photo — ship it.”"
                time="2 min ago"
                avatar={<Avatar name="Jonah Okafor" src="/home/portrait-2.jpg" decorative />}
              />
              <NotificationItem
                href="/docs/components/notification-item/"
                title="Ines Duarte approved the price change"
                detail="Stoneware mug — Sage, now $38"
                time="1 h ago"
                avatar={<Avatar name="Ines Duarte" src="/home/portrait-3.jpg" decorative />}
              />
            </div>
          </Showcase>
          <Showcase label="AI chat">
            <ChatLog>
              <ChatMessage from="user" sender="You" time="09:40">
                Summarise this week’s orders
              </ChatMessage>
              <ChatMessage from="assistant" sender="Nizivo AI" time="09:40">
                1,284 orders, up 8.1%. Wholesale doubled.
              </ChatMessage>
            </ChatLog>
          </Showcase>
          <Showcase label="Files" wide>
            <div className="nz-home-stack">
              <FileItem
                name="autumn-lookbook.pdf"
                status="uploading"
                progress={62}
                detail="2.4 of 3.9 MB"
              />
              <FileItem name="autumn-lookbook.pdf" status="done" detail="3.9 MB" />
            </div>
          </Showcase>
        </div>
      </div>
      <p className="nz-home-more">
        <a href="/docs/components/">
          Browse all components <ArrowRight aria-hidden="true" />
        </a>
      </p>
    </section>
  );
}

const SURFACES = [
  ['aurora', 'Aurora', 'Soft gradients for heroes'],
  ['contour', 'Contour', 'Topographic calm for docs'],
  ['glow-orb', 'Glow Orb', 'A living focal point'],
  ['aurora-dark', 'Aurora Dark', 'Closing CTAs and night mode'],
] as const;

export function LivingSurfaces({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <section
      className="nz-home-band nz-home-surfaces"
      // a dark band on either theme (Figma's Living surfaces): its tokens resolve dark
      data-nz-theme="dark"
      aria-labelledby="home-surfaces"
    >
      <span className="nz-home-band-ground">
        <ShaderSurface variant="dot-matrix" />
      </span>
      <Head
        id="home-surfaces"
        title="Living"
        accent="surfaces"
        stacked
        lede={`${facts.shaders} shader surfaces (Aurora, Contour, Dot Matrix, Glow Orb, Rays and Mesh, with their dark presets) render live in WebGL, follow your colour tokens and hold still in Reduced motion. This band is one of them.`}
      />
      <ul className="nz-home-surface-list">
        {SURFACES.map(([variant, name, text]) => (
          <li key={variant}>
            <span className="nz-home-surface">
              <ShaderSurface variant={variant} />
            </span>
            <strong>{name}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MotionCard({
  name,
  tokens,
  children,
}: {
  name: string;
  tokens: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <li className="nz-home-card nz-home-motion">
      <div className="nz-home-motion-stage">{children}</div>
      <strong>{name}</strong>
      <code>{tokens}</code>
    </li>
  );
}

export function Motion(): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-motion">
      <Head
        id="home-motion"
        title="Motion with manners"
        lede="Quick, quiet transitions mapped to Nizivo's motion tokens. Every loop stops in Reduced motion."
      />
      <ul className="nz-home-motions">
        <MotionCard name="Toast enter" tokens="duration/base · easing/enter">
          <span className="nz-home-toast" aria-hidden="true">
            <CircleCheck />
            Product saved
            <span className="nz-home-toast-action">View</span>
            <CircleX />
          </span>
        </MotionCard>
        <MotionCard name="Live pulse" tokens="duration/pulse · loop">
          <LivePulse>Live · syncing</LivePulse>
        </MotionCard>
        <MotionCard name="Skeleton shimmer" tokens="duration/pulse · ease-in-out">
          <span className="nz-home-skeleton" aria-hidden="true">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </span>
        </MotionCard>
        <MotionCard name="Word rotator" tokens="duration/slow · easing/standard">
          <span className="nz-home-rotator">
            Design for <WordRotator words={['dashboards', 'commerce', 'websites']} />
          </span>
        </MotionCard>
      </ul>
    </section>
  );
}

const ICONS: [string, JSX.Element][] = [
  ['arrow-down-right', <ArrowDownRight key="a" />],
  ['arrow-right', <ArrowRight key="a" />],
  ['arrow-up-down', <ArrowUpDown key="a" />],
  ['arrow-up-right', <ArrowUpRight key="a" />],
  ['bell', <Bell key="a" />],
  ['box', <Box key="a" />],
  ['calendar', <Calendar key="a" />],
  ['chart-column', <ChartColumn key="a" />],
  ['chart-line', <ChartLine key="a" />],
  ['check', <Check key="a" />],
  ['chevron-down', <ChevronDown key="a" />],
  ['chevron-left', <ChevronLeft key="a" />],
  ['chevron-right', <ChevronRight key="a" />],
  ['chevron-up', <ChevronUp key="a" />],
  ['chevrons-up-down', <ChevronsUpDown key="a" />],
  ['circle-check', <CircleCheck key="a" />],
  ['circle-question-mark', <CircleQuestionMark key="a" />],
  ['circle-x', <CircleX key="a" />],
  ['clock', <Clock key="a" />],
  ['command', <Command key="a" />],
  ['copy', <Copy key="a" />],
  ['credit-card', <CreditCard key="a" />],
  ['download', <Download key="a" />],
  ['ellipsis', <Ellipsis key="a" />],
  ['eye', <Eye key="a" />],
  ['file-text', <FileText key="a" />],
  ['funnel', <Funnel key="a" />],
  ['gift', <Gift key="a" />],
  ['globe', <Globe key="a" />],
  ['grip-vertical', <GripVertical key="a" />],
  ['house', <House key="a" />],
  ['image', <Image key="a" />],
  ['info', <Info key="a" />],
  ['layers', <Layers key="a" />],
  ['layout-dashboard', <LayoutDashboard key="a" />],
  ['layout-grid', <LayoutGrid key="a" />],
  ['link', <LinkIcon key="a" />],
  ['list', <List key="a" />],
  ['log-out', <LogOut key="a" />],
  ['mail', <Mail key="a" />],
];

export function IconSet({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-icons">
      <Head
        id="home-icons"
        title="Icon set"
        lede={`${format(facts.icons)} icons drawn at a 1.6 px stroke on a 20 px grid: calm, consistent, and each one its own import.`}
      />
      <ul className="nz-home-card nz-home-icons">
        {ICONS.map(([name, icon]) => (
          <li key={name}>
            <span aria-hidden="true">{icon}</span>
            <span className="nz-home-icon-name">{name}</span>
          </li>
        ))}
      </ul>
      <p className="nz-home-more">
        <a href="/docs/icons/">
          Browse all icons <ArrowRight aria-hidden="true" />
        </a>
      </p>
    </section>
  );
}

export function Accessible({ facts }: { facts: HomeFacts }): JSX.Element {
  return (
    <section className="nz-home-section" aria-labelledby="home-a11y">
      <Head
        id="home-a11y"
        title="Accessible by default, and measured"
        lede="WCAG 2.2 AA is the floor. The first number is counted from the token contrast matrix every time the site builds."
      />
      <ul className="nz-home-stats">
        <li className="nz-home-card">
          <strong>
            {format(facts.contrast.pass)} / {format(facts.contrast.total)}
          </strong>
          <span>colour pair checks pass, Light + Dark</span>
        </li>
        <li className="nz-home-card">
          <strong>2 px</strong>
          <span>focus outline, 2 px offset, on every control</span>
          <span className="nz-home-focus-demo" aria-hidden="true">
            <Plus /> Button
          </span>
        </li>
        <li className="nz-home-card">
          <strong>Never</strong>
          <span>colour alone: icons, checks, signs and underlines carry meaning</span>
        </li>
        <li className="nz-home-card">
          <strong>Reduced</strong>
          <span>motion mode on every shader and animation</span>
        </li>
      </ul>
    </section>
  );
}

export function Closing(): JSX.Element {
  return (
    <div className="nz-home-closing">
      <CtaBand
        title="Start building with Nizivo"
        description="One command, one stylesheet, and components that render on the server."
        background={<ShaderSurface variant="aurora-dark" />}
        actions={
          <>
            <CodeBlock variant="command" items={INSTALL} className="nz-home-closing-code" />
            <Button variant="accent" render={<Link href="/docs/getting-started/next/" />}>
              Read the docs
            </Button>
            <Button variant="secondary" render={<a href={REPO_URL} aria-label="View on GitHub" />}>
              View on GitHub
            </Button>
          </>
        }
      />
    </div>
  );
}

export function HomeFooter({ version }: { version: string }): JSX.Element {
  return (
    <SiteFooter
      className="nz-home-footer"
      brand={
        <a href="/" className="nz-home-footer-brand">
          <Mark size={28} />
          <span className="nz-visually-hidden">Nizivo UI home</span>
        </a>
      }
      description="Calm, accessible product UI from one set of tokens."
      columns={[
        {
          title: 'Product',
          links: [
            { label: 'Components', href: '/docs/components/' },
            { label: 'Patterns', href: '/docs/patterns/' },
            { label: 'Charts', href: '/docs/charts/' },
            { label: 'Changelog', href: '/docs/changelog/' },
          ],
        },
        {
          title: 'Resources',
          links: [
            { label: 'Getting started', href: '/docs/getting-started/next/' },
            { label: 'Foundations', href: '/docs/foundations/colour/' },
            { label: 'Tokens', href: '/docs/foundations/tokens/' },
            { label: 'Icons', href: '/docs/icons/' },
          ],
        },
        {
          title: 'Project',
          links: [
            { label: 'GitHub', href: REPO_URL },
            { label: 'npm', href: 'https://www.npmjs.com/package/@nizivo/react' },
            { label: 'Licence', href: `${REPO_URL}/blob/main/LICENSE` },
          ],
        },
      ]}
      legal={
        <>
          <span>Nizivo UI · v{version}</span>
          <span>Apache-2.0</span>
        </>
      }
    />
  );
}
