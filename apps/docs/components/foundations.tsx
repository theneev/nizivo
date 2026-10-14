// The Foundations tables, generated at build time from @nizivo/tokens (contract.json and tokens.css).
// Every swatch and sample is painted by the real token through var(), inside an explicit
// `data-nz-theme` scope, so the light and dark columns show what the CSS does, not a copied hex.
import type { CSSProperties, JSX, ReactNode } from 'react';
import {
  byNumericSuffix,
  contract,
  publicTokens,
  referenceOf,
  remToPx,
  resolveToken,
  shortName,
  tokenValues,
} from '../lib/tokens';
import { Table } from './table';

function Code({ children }: { children: ReactNode }): JSX.Element {
  return <code>{children}</code>;
}

const COLOUR_GROUPS: { key: string; title: string; kind: 'fill' | 'text' | 'border' }[] = [
  { key: 'bg', title: 'Backgrounds', kind: 'fill' },
  { key: 'text', title: 'Text', kind: 'text' },
  { key: 'icon', title: 'Icons', kind: 'text' },
  { key: 'border', title: 'Borders', kind: 'border' },
  { key: 'chart', title: 'Charts', kind: 'fill' },
  { key: 'elevation', title: 'Elevation colours', kind: 'fill' },
];

function colourGroups(): { title: string; kind: 'fill' | 'text' | 'border'; tokens: string[] }[] {
  const vars = contract().variables;
  const colours = publicTokens('color');
  const groups = COLOUR_GROUPS.map((g) => ({
    title: g.title,
    kind: g.kind,
    tokens: colours.filter((n) => vars[n]?.token.split('.')[1] === g.key),
  }));
  const placed = new Set(groups.flatMap((g) => g.tokens));
  const rest = colours.filter((n) => !placed.has(n));
  if (rest.length > 0) groups.push({ title: 'Other colours', kind: 'fill', tokens: rest });
  return groups.filter((g) => g.tokens.length > 0);
}

/**
 * The background a text or icon colour is made for: `--nz-text-on-brand` on `--nz-bg-brand`,
 * `--nz-text-inverse` on `--nz-bg-inverse`, any other on `--nz-bg-surface`.
 */
function pairedBackground(token: string): string {
  const m = /^--nz-(?:text|icon)-(?:on-(.+)|inverse)$/.exec(token);
  if (!m) return '--nz-bg-surface';
  const bg = m[1] === undefined ? '--nz-bg-inverse' : `--nz-bg-${m[1]}`;
  return bg in contract().variables ? bg : '--nz-bg-surface';
}

function Chip({ token, kind }: { token: string; kind: 'fill' | 'text' | 'border' }): JSX.Element {
  const style: CSSProperties =
    kind === 'fill'
      ? { background: `var(${token})` }
      : kind === 'border'
        ? { border: `2px solid var(${token})`, background: 'var(--nz-bg-surface)' }
        : { color: `var(${token})`, background: `var(${pairedBackground(token)})` };
  return (
    // The "Aa" of a text colour is drawn by CSS (`data-sample`), not as text: the swatch shows a
    // token's real colour, and some are meant to sit under 4.5:1 (`--nz-text-disabled`, exempt as
    // inactive UI), which a contrast checker would otherwise report as page text.
    <span
      className="nz-docs-chip"
      style={style}
      aria-hidden="true"
      {...(kind === 'text' && { 'data-sample': 'Aa' })}
    />
  );
}

function SchemeCell({
  token,
  scheme,
  kind,
}: {
  token: string;
  scheme: 'light' | 'dark';
  kind: 'fill' | 'text' | 'border';
}): JSX.Element {
  const ref = referenceOf(token, scheme);
  return (
    <td>
      <div data-nz-theme={scheme} className="not-prose nz-docs-swatch">
        <Chip token={token} kind={kind} />
        <span>
          <Code>{resolveToken(token, scheme)}</Code>
          {ref !== undefined && <span className="nz-docs-ref">{shortName(ref)}</span>}
        </span>
      </div>
    </td>
  );
}

/** Every public semantic colour, in light and in dark. */
export function ColourSwatches(): JSX.Element {
  return (
    <>
      {colourGroups().map((g) => (
        <section key={g.title}>
          <h3 id={`colour-${g.title.toLowerCase().replaceAll(' ', '-')}`}>{g.title}</h3>
          <Table label={`${g.title} colours`} className="nz-docs-swatches">
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Light</th>
                <th scope="col">Dark</th>
              </tr>
            </thead>
            <tbody>
              {g.tokens.map((t) => (
                <tr key={t} data-token={t}>
                  <th scope="row" className="font-normal">
                    <Code>{t}</Code>
                  </th>
                  <SchemeCell token={t} scheme="light" kind={g.kind} />
                  <SchemeCell token={t} scheme="dark" kind={g.kind} />
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      ))}
    </>
  );
}

/** The primitive palette the semantic colours point at (not public API). */
export function PrimitivePalette(): JSX.Element {
  const prims = Object.entries(contract().variables)
    .filter(([n, v]) => v.type === 'color' && !v.public && n.startsWith('--nz-p-'))
    .map(([n]) => n);
  const families = new Map<string, string[]>();
  for (const p of prims) {
    const fam = /^--nz-p-(.+)-\d+$/.exec(p)?.[1] ?? 'other';
    families.set(fam, [...(families.get(fam) ?? []), p]);
  }
  return (
    <div className="not-prose nz-docs-palette">
      {[...families].map(([fam, list]) => (
        <div key={fam} className="nz-docs-palette-row">
          <span className="nz-docs-palette-name">{fam}</span>
          <div className="nz-docs-palette-steps">
            {list.toSorted(byNumericSuffix).map((p) => (
              <span
                key={p}
                className="nz-docs-palette-step"
                title={`${p}: ${resolveToken(p, 'light')}`}
              >
                <span
                  className="nz-docs-chip"
                  style={{ background: `var(${p})` }}
                  aria-hidden="true"
                />
                <span>{/-(\d+)$/.exec(p)?.[1]}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Every text style: a sample set in the style, and its parts. */
export function TypeScale(): JSX.Element {
  const vars = contract().variables;
  const base = tokenValues().base;
  const styles = Object.entries(vars)
    .filter(([, v]) => v.type === 'typography' && v.part === undefined && v.public)
    .map(([n]) => n);
  const part = (style: string, p: string): string => base.get(`${style}-${p}`) ?? '';
  return (
    <Table label="Text styles" className="nz-docs-type">
      <thead>
        <tr>
          <th scope="col">Style</th>
          <th scope="col">Sample</th>
          <th scope="col">Size / line</th>
          <th scope="col">Weight</th>
          <th scope="col">Tracking</th>
        </tr>
      </thead>
      <tbody>
        {styles.map((s) => {
          const name = s.replace('--nz-font-', '');
          const tracking = `--nz-tracking-${name}`;
          const size = part(s, 'font-size');
          return (
            <tr key={s}>
              <th scope="row" className="font-normal">
                <Code>{s}</Code>
              </th>
              <td>
                <span
                  className="nz-docs-type-sample"
                  style={{
                    font: `var(${s})`,
                    letterSpacing: base.has(tracking) ? `var(${tracking})` : undefined,
                  }}
                >
                  {name.startsWith('numeric') ? '1,284.50' : 'Stoneware mug'}
                </span>
              </td>
              <td>
                <Code>{size}</Code>
                {remToPx(size) !== undefined && (
                  <span className="nz-docs-ref">{remToPx(size)}</span>
                )}{' '}
                / <Code>{part(s, 'line-height')}</Code>
              </td>
              <td>
                <Code>{part(s, 'font-weight')}</Code>
              </td>
              <td>{base.has(tracking) ? <Code>{base.get(tracking)}</Code> : '–'}</td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function FontFamilies(): JSX.Element {
  const base = tokenValues().base;
  return (
    <ul>
      {publicTokens('fontFamily').map((t) => (
        <li key={t}>
          <Code>{t}</Code>: <Code>{base.get(t)}</Code>
        </li>
      ))}
    </ul>
  );
}

/** A dimension scale with a bar or box per step. */
function ScaleTable({
  tokens,
  visual,
  label,
}: {
  tokens: string[];
  visual: 'bar' | 'radius' | 'square';
  label: string;
}): JSX.Element {
  const base = tokenValues().base;
  return (
    <Table label={label}>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Value</th>
          <th scope="col">
            <span className="sr-only">Preview</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {tokens.map((t) => {
          const v = base.get(t) ?? '';
          return (
            <tr key={t}>
              <th scope="row" className="font-normal">
                <Code>{t}</Code>
              </th>
              <td>
                <Code>{v}</Code>
                {remToPx(v) !== undefined && <span className="nz-docs-ref">{remToPx(v)}</span>}
              </td>
              <td>
                {visual === 'bar' && (
                  <span
                    className="nz-docs-bar"
                    style={{ inlineSize: `var(${t})` }}
                    aria-hidden="true"
                  />
                )}
                {visual === 'square' && (
                  <span
                    className="nz-docs-square"
                    style={{ inlineSize: `var(${t})`, blockSize: `var(${t})` }}
                    aria-hidden="true"
                  />
                )}
                {visual === 'radius' && (
                  <span
                    className="nz-docs-radius"
                    style={{ borderRadius: `var(${t})` }}
                    aria-hidden="true"
                  />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

export function SpaceScale(): JSX.Element {
  return (
    <ScaleTable
      tokens={publicTokens('dimension', '--nz-space-').toSorted(byNumericSuffix)}
      visual="bar"
      label="Space"
    />
  );
}

export function SizeScale(): JSX.Element {
  const sizes = [
    ...publicTokens('dimension', '--nz-size-'),
    ...publicTokens('dimension', '--nz-border-width-'),
  ];
  return <ScaleTable tokens={sizes} visual="square" label="Sizes" />;
}

export function RadiusScale(): JSX.Element {
  const base = tokenValues().base;
  const tokens = publicTokens('dimension', '--nz-radius-').toSorted(
    (a, b) => Number.parseFloat(base.get(a) ?? '0') - Number.parseFloat(base.get(b) ?? '0'),
  );
  return <ScaleTable tokens={tokens} visual="radius" label="Radius" />;
}

/** Tokens that change with the viewport: one column per custom media query. */
export function ResponsiveTokens(): JSX.Element {
  const { base, breakpoints } = tokenValues();
  const names = [...new Set(breakpoints.flatMap((b) => [...b.values.keys()]))].toSorted();
  return (
    <Table label="Responsive tokens">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Base</th>
          {breakpoints.map((b) => (
            <th scope="col" key={b.name}>
              <Code>{b.name}</Code> <span className="nz-docs-ref">{b.query}</span>
              {b.status !== undefined && <span className="nz-docs-ref">{b.status}</span>}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {names.map((n) => (
          <tr key={n}>
            <th scope="row" className="font-normal">
              <Code>{n}</Code>
            </th>
            <td>
              <Code>{base.get(n)}</Code>
            </td>
            {breakpoints.map((b) => (
              <td key={b.name}>{b.values.has(n) ? <Code>{b.values.get(n)}</Code> : '–'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function ZIndexScale(): JSX.Element {
  const base = tokenValues().base;
  const z = publicTokens('number', '--nz-z-').toSorted(
    (a, b) => Number(base.get(a)) - Number(base.get(b)),
  );
  return (
    <ul>
      {z.map((t) => (
        <li key={t}>
          <Code>{t}</Code>: <Code>{base.get(t)}</Code>
        </li>
      ))}
    </ul>
  );
}

/** Shadows on a surface, in both schemes (dark adds a hairline ring, since shadows carry little there). */
export function ElevationScale(): JSX.Element {
  const shadows = publicTokens('shadow');
  return (
    <div className="not-prose nz-docs-elevation">
      {(['light', 'dark'] as const).map((scheme) => (
        <div key={scheme} data-nz-theme={scheme} className="nz-docs-elevation-scheme">
          <p className="nz-docs-elevation-label">{scheme === 'light' ? 'Light' : 'Dark'}</p>
          <div className="nz-docs-elevation-grid">
            {shadows.map((t) => (
              <div key={t} className="nz-docs-elevation-card" style={{ boxShadow: `var(${t})` }}>
                <code>{t.replace('--nz-', '')}</code>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShadowValues(): JSX.Element {
  const base = tokenValues().base;
  return (
    <Table label="Shadow values">
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        {publicTokens('shadow').map((t) => (
          <tr key={t}>
            <th scope="row" className="font-normal">
              <Code>{t}</Code>
            </th>
            <td>
              <Code>{base.get(t)}</Code>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** An easing as a curve: `cubic-bezier()` as a path, `linear()` as its stops. */
function EasingCurve({ value }: { value: string }): JSX.Element | null {
  const W = 120;
  const H = 64;
  const pad = 10;
  const x = (t: number): number => pad + t * (W - 2 * pad);
  const y = (v: number): number => H - pad - v * (H - 2 * pad - 8);
  let d: string | undefined;
  const cb = /^cubic-bezier\(([^)]+)\)$/.exec(value);
  if (cb) {
    const [x1 = 0, y1 = 0, x2 = 1, y2 = 1] = (cb[1] ?? '').split(',').map((n) => Number(n.trim()));
    d = `M${x(0)},${y(0)} C${x(x1)},${y(y1)} ${x(x2)},${y(y2)} ${x(1)},${y(1)}`;
  }
  const lin = /^linear\((.+)\)$/.exec(value);
  if (lin) {
    const stops = (lin[1] ?? '').split(',').map((s) => s.trim().split(/\s+/));
    const pts = stops.map(([v = '0', p], i) => {
      const t = p !== undefined ? Number.parseFloat(p) / 100 : i / (stops.length - 1);
      return `${x(t)},${y(Number(v))}`;
    });
    d = `M${pts.join(' L')}`;
  }
  if (!d) return null;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      aria-hidden="true"
      className="nz-docs-curve"
    >
      <line x1={x(0)} y1={y(1)} x2={x(1)} y2={y(1)} />
      <path d={d} />
    </svg>
  );
}

/** Motion tokens with their reduced-motion values (`prefers-reduced-motion` or `data-nz-motion="reduce"`). */
export function MotionTokens(): JSX.Element {
  const { base, reduced } = tokenValues();
  const groups: { title: string; tokens: string[]; curve?: boolean }[] = [
    { title: 'Durations', tokens: publicTokens('duration') },
    {
      title: 'Easings',
      tokens: [...publicTokens('cubicBezier'), ...publicTokens('string', '--nz-easing-')],
      curve: true,
    },
    {
      title: 'Distances, scales and effects',
      tokens: [
        ...publicTokens('dimension', '--nz-distance-'),
        ...publicTokens('number', '--nz-scale-'),
        ...publicTokens('dimension', '--nz-magnetic-'),
        ...publicTokens('number', '--nz-tilt-'),
      ],
    },
  ];
  return (
    <>
      {groups.map((g) => (
        <section key={g.title}>
          <h2 id={`motion-${g.title.split(',')[0]?.toLowerCase()}`}>{g.title}</h2>
          <Table label={g.title}>
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">Default</th>
                <th scope="col">Reduced</th>
                {g.curve && (
                  <th scope="col">
                    <span className="sr-only">Curve</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {g.tokens.map((t) => (
                <tr key={t}>
                  <th scope="row" className="font-normal">
                    <Code>{t}</Code>
                  </th>
                  <td className="nz-docs-break">
                    <Code>{base.get(t)}</Code>
                  </td>
                  <td>
                    {reduced.has(t) ? (
                      <Code>{reduced.get(t)}</Code>
                    ) : (
                      <span className="text-fd-muted-foreground">same</span>
                    )}
                  </td>
                  {g.curve && (
                    <td>
                      <EasingCurve value={base.get(t) ?? ''} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      ))}
    </>
  );
}

/** Every public token, by type: the complete reference. */
export function TokenReference(): JSX.Element {
  const vars = contract().variables;
  const base = tokenValues().base;
  const types = [...new Set(Object.values(vars).map((v) => v.type))].toSorted();
  return (
    <>
      {types.map((type) => {
        const list = Object.entries(vars)
          .filter(([, v]) => v.public && v.type === type)
          .map(([n]) => n);
        if (list.length === 0) return null;
        return (
          <section key={type}>
            <h2 id={`type-${type.toLowerCase()}`}>
              {type} <span className="nz-docs-ref">{list.length}</span>
            </h2>
            <Table label={`${type} tokens`}>
              <thead>
                <tr>
                  <th scope="col">Token</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr key={n}>
                    <th scope="row" className="font-normal">
                      <Code>{n}</Code>
                    </th>
                    <td className="nz-docs-break">
                      <Code>{base.get(n) ?? '(set in a theme scope)'}</Code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </section>
        );
      })}
    </>
  );
}
