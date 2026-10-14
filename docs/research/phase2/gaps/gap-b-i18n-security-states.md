# Gap B: i18n and RTL, security and supply chain, and the loading/empty/error contract

Date: 2026-10-14. Fills critique gaps **G14** (i18n/RTL), **G17** (security and supply chain beyond publishing) and **G20** (loading, empty and error states; streaming). It is written against the 16 settled decisions; none is re-opened.

**Evidence labels.** EMPIRICAL = measured or reproduced in this session (scripts listed in §E). PRIMARY = official docs, specs, registry data or library source code. SECONDARY = third-party write-ups. UNVERIFIED = I could not confirm it.

**Package name placeholder.** Import paths use `@nizivo/ui` only as a placeholder. The core package name is still open (C1/D3), and this report does not decide it.

---

## 0. Decisions at a glance

| # | Question | Recommendation | Confidence |
|---|---|---|---|
| 1 | Built-in strings | Each part takes a serializable **`labels` prop** with English defaults. The optional client `NizivoConfig` can also supply `labels`, and plain-object locale catalogs ship at `@nizivo/ui/locales/<tag>`. Values are strings with `{placeholders}` or CLDR plural objects, run through a ~0.2 KB built-in formatter. No message-format dependency. | High |
| 2 | Locale determinism | The default locale is `'en-US'`; never read `navigator.language` during render. **The React Aria adapter must always wrap its parts in `I18nProvider` with that locale.** Without it, RAC renders `en-US` during SSR and then switches to the browser locale after hydration (verified in its source). | High |
| 3 | Direction | **Remove `direction` from `NizivoConfig`** (this changes r8 §7.5). For RAC, direction comes from the locale. Nizivo's own code reads it from the DOM when an event fires. CSS uses only logical properties plus `:dir()`. | High |
| 4 | Numbers and dates | Use `Intl` with an explicit `locale` and `timeZone`. `format` takes a serializable `Intl.*Options` object or a named preset. **Format once, where the value first renders.** Node and browsers disagree on some output, which was reproduced. Wrap formatted values in `unicode-bidi: isolate` and use tabular figures. | High |
| 5 | Plurals | Use `Intl.PluralRules` with CLDR category objects (`{one, few, many, other}`). Never concatenate strings. | High |
| 6 | Icon mirroring | A curated directional subset in `@nizivo/icons` auto-mirrors through `data-mirror="rtl"` plus `scale: -1 1` under `:dir(rtl)`, and can opt out per instance. Components mirror only their own built-in glyphs. Never mirror media, clocks, checks, search, rings or trend icons. | High |
| 7 | Charts in RTL | Time and value axes **do not mirror by default** (`xDirection="ltr"`), with opt-in `"auto"`/`"rtl"`. Chart chrome (legend, title, tooltip placement) follows `dir`. Categorical horizontal bars anchor to inline-start. | Medium |
| 8 | Test locales | Use a 10-locale matrix plus two pseudo-locales (§A7). Only `ar-EG` (and `he-IL` for spot checks) enters visual regression. | Medium |
| 9 | CSP | Publish two supported **CSP profiles**. Profile A, the full library, needs `style-src-attr 'unsafe-inline'` plus nonces. Profile B, server-safe core only, works with **no** inline style attributes. **Server-safe components never emit a `style` attribute.** Data-driven geometry uses SVG presentation attributes, native `<progress>`/`<meter>` or classes. All of these were verified to survive a strict CSP. | High |
| 10 | Trusted Types | No DOM-XSS sinks in library code. The only `dangerouslySetInnerHTML` is the server-only `ThemeScript`. A CI fixture runs with `require-trusted-types-for 'script'`. | High |
| 11 | SBOM and provenance | Keep npm provenance (automatic with OIDC, r4). Add `pnpm sbom --sbom-format cyclonedx --prod` per package, attached to the GitHub Release and attested with `actions/attest@v4` (`sbom-path`) on the packed tarballs. | Medium |
| 12 | Dependency policy | Keep a tiny runtime dependency set (listed in §B4). Use caret ranges for runtime engine dependencies (so consumers dedupe) and exact pins for tooling. Set pnpm `minimumReleaseAge` 4320, `trustPolicy: no-downgrade`, `blockExoticSubdeps: true` and `allowBuilds: {}`. Run dependency-review with a licence allowlist. | High |
| 13 | Licences and assets | The dependency mix is compatible with either Apache-2.0 or MIT. `@nizivo/icons` must carry the Lucide ISC and Feather MIT notices. **No Figma image (3D renders, product photos, portraits) ships anywhere public** until it is in a provenance ledger. CI enforces this. | High |
| 14 | Registry supply chain | Use immutable versioned URLs, a CI-built and attested registry, and a SHA-256 manifest. An item-policy linter allows only `@nizivo/*` deps, no `envVars`, no foreign `registryDependencies`, and confined targets. | Medium |
| 15 | Instagram media | The library never talks to Meta. Components take neutral `MediaSource` data and element slots. Docs require a server-side proxy or cache (signed URLs expire) and a legal review of Meta's storage terms. Hotlinking leaks visitor IPs to Meta (GDPR exposure). | Medium |
| 16 | Loading, empty and error | **One contract.** Data-display components take `status: 'ready' \| 'loading' \| 'empty' \| 'error'`, `pending` and `empty`/`error` slots. **The Suspense fallback is the same component with `status="loading"`.** The frame persists and only the content region swaps. The library never fetches and never suspends. | High |
| 17 | Data attributes | Add `data-loading`, `data-pending`, `data-empty`, `data-error` and `data-mirror` (plus the chart-local `data-x-direction`) to the canonical vocabulary. `data-error` (load failure) is distinct from `data-invalid` (validation). | High |
| 18 | Button busy state | **Rename the proposed `loading` prop to `pending`** (this changes 02 and the r8 sketch), to match React (`isPending`) and RAC (`data-pending`). Keep the button focusable with `aria-disabled`. `SubmitButton` is a client leaf that reads `useFormStatus()`. | Medium |
| 19 | Optimistic UI | Make every stateful part controllable so `useOptimistic` drives it. Use `data-pending` for optimistic rows. Never disable controls during a transition. Include docs recipes; there is no library hook. | High |

**Changes to earlier proposals, stated explicitly:**
- `NizivoConfig` loses `direction` (r8 §6.7/§7.5).
- Button `loading` becomes `pending` (02 §5.1, r8 §7.2).
- Drawer `side` becomes logical `start | end | top | bottom` (07 used `right | left`).
- r6's `Image` sketch must drop `style={{ aspectRatio }}` (§B1.4).
- 07's "role=status inside every Skeleton" becomes "static visually hidden text, no live region" (§C2.3).
- The `status` prop name is reserved for the data lifecycle, so domain statuses use domain names (`availability`, `paymentStatus`, `fulfillmentStatus`). This affects the 05 sketches.

---

# Part A. Internationalisation and RTL

## A1. Inventory of built-in strings

These are the strings a component renders that it does **not** get from `children` or other props. The list is collected from the Figma reports (02–10), r8 §6.10 and the engine split (r3). Strings inside RAC-backed parts (for example NumberField "Increase", DatePicker segments and Toast region labels) come from RAC's own 36-locale catalogues. They are **not** in Nizivo's catalogue.

| Component (tier) | Keys (English default) | Interpolation / plural | Rendered on server? |
|---|---|---|---|
| Dialog, Drawer, Sheet (T1) | `close` "Close" | – | client |
| Alert / Banner (T0 + island) | `dismiss` "Dismiss", `dismissBanner` "Dismiss banner" | – | server markup |
| Toast (T2) | `region` "Notifications ({hotkey})", `dismiss` "Dismiss notification" | `{hotkey}` | client |
| Pagination (T0) | `nav` "Pagination", `previous` "Previous page", `next` "Next page", `page` "Page {page}", `summary` "Showing {from}–{to} of {total}" | numbers | **server** |
| Breadcrumb (T0) | `nav` "Breadcrumb" | – | server |
| Skeleton / any `status="loading"` | `loading` "Loading {label}" | `{label}` | **server** |
| KpiTile / Metric | `noData` "No data", `loading`, `error` "Couldn't load {label}" | `{label}` | **server** |
| Delta (T0) | `up` "Up {value} {comparison}", `down` "Down {value} {comparison}", `flat` "No change {comparison}" | numbers | **server** |
| Progress / Meter (T0) | `valueText` "{value} of {max}" | numbers | server |
| Charts (server + island) | `viewData` "View data", `dataTable` "Data table for {title}", `chart` "Interactive chart", `empty` "No data for this period" | `{title}` | server + client |
| Table / DataTable | `selectAll` "Select all rows", `selectRow` "Select row", `selected` {one: "{count} row selected", other: "{count} rows selected"}, `noResults` "No results", `empty` "Nothing here yet" | plural | server + client |
| SearchField | `clear` "Clear search" | – | client |
| Upload (T2) | `browse` "Browse", `dropHere` "Drag and drop files", `files` {one: "{count} file", other: "{count} files"}, `remove` "Remove {name}" | plural | client |
| CopyButton | `copy` "Copy", `copied` "Copied" | – | client |
| Sidebar / MobileTabBar | `collapse` "Collapse sidebar", `expand` "Expand sidebar", `more` "More" | – | client |
| CommandMenu | `placeholder` "Search commands", `noResults` "No results", `results` {one: "{count} result", other: "{count} results"} | plural | client |
| Kbd (T0 + island) | `mod.apple` "⌘", `mod.other` "Ctrl" (German keyboards print "Strg"), `shift`, `alt`… | – | server |
| Password toggle | `show` "Show password", `hide` "Hide password" | – | client |
| PageIndicator / Carousel | `slide` "Slide {n} of {total}", `previous`, `next` | numbers | server + client |
| Rating (commerce pattern) | `rating` "{value} out of {max} stars" | numbers | server |
| Show more / Disclosure | `more` "Show more", `less` "Show less" | – | client |

That is about 60 keys. It is small enough to ship real catalogues for the locales Neev needs, and too small to justify a message-format dependency (§A2).

## A2. How built-in strings are supplied

### Recommendation

Labels resolve in three layers, highest priority first:

1. **Per-instance `labels` prop.** It is `Partial<XLabels>` and serializable (strings and plain objects only), so it can be passed from a Server Component into a client part.
2. **Nearest `NizivoConfig` `labels`.** This is client-only and only client parts read it, which matches settled decision 8.
3. **Built-in English defaults**, compiled into each component module.

Locale catalogues are **plain objects** published as subpaths (`@nizivo/ui/locales/de-DE`). An app imports one where it renders, either into `NizivoConfig` or spread into a server component's `labels`. Unused catalogues tree-shake away.

**Value type:** `string` with `{name}` placeholders, or a **plural object** keyed by CLDR category. A ~0.2 KB internal `formatLabel()` resolves both with `Intl.PluralRules` and `Intl.NumberFormat`.

```ts
// @nizivo/ui/i18n — server-safe (no directive), ~0.2 KB gz (EMPIRICAL, esbuild min+gzip)
export type PluralLabel = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;
export type Label = string | PluralLabel;
export type Vars = Record<string, string | number>;

export function formatLabel(locale: string, label: Label, vars: Vars = {}): string {
  const tpl = typeof label === 'string'
    ? label
    : label[new Intl.PluralRules(locale).select(Number(vars.count ?? 0))] ?? label.other;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return typeof v === 'number' ? new Intl.NumberFormat(locale).format(v) : String(v ?? '');
  });
}

// pagination.labels.ts — English defaults live next to the component
export interface PaginationLabels {
  nav: Label; previous: Label; next: Label; page: Label; summary: Label;
}
export const paginationLabels: PaginationLabels = {
  nav: 'Pagination', previous: 'Previous page', next: 'Next page',
  page: 'Page {page}', summary: 'Showing {from}–{to} of {total}',
};
```

```tsx
// Server Component use: no provider, no context. Locale and labels are explicit.
import { Pagination } from '@nizivo/ui/pagination';
import de from '@nizivo/ui/locales/de-DE';          // { pagination: {...}, toast: {...}, ... }

<Pagination locale="de-DE" labels={de.pagination} page={3} totalPages={13} getHref={(p) => `?page=${p}`} />

// Client islands: one optional config at the root of each React root (each Astro island too).
'use client';
import { NizivoConfig } from '@nizivo/ui/config';
<NizivoConfig locale="de-DE" labels={de}>{children}</NizivoConfig>
```

**Existing app i18n stacks plug in without an adapter.** With next-intl 4.14.9, react-intl 12.1.4, Lingui 6.9.1, Paraglide 2.27.0 or i18next 26.4.4 (all registry-checked today), the app passes already-translated strings, keeping Nizivo's `{placeholders}` for values only the component knows:

```tsx
<Pagination labels={{ summary: t('pagination.summary') /* "Zeige {from}–{to} von {total}" */ }} … />
```

### Rejected alternatives

| Option | Why rejected |
|---|---|
| FormatJS `intl-messageformat` as a dependency (ICU MF1) | **9.65 KB gz** (EMPIRICAL) for about 60 strings, and it would be the single largest non-engine dependency. Apps that want ICU already have their own stack. |
| `messageformat` 4.1.0 (Unicode MF2) | **7.42 KB gz** (EMPIRICAL). MF2 has been a stable Unicode spec since CLDR 47 (March 2025), but `Intl.MessageFormat` is not on track to ship in browsers soon: the TC39 proposal is reported stuck or not advancing (PRIMARY: tc39/proposal-intl-messageformat; SECONDARY: Locize, May 2026). The plural-object shape converts mechanically to MF2 later. |
| A messages context only (r8's `NizivoConfig.labels` alone) | Server Components cannot read context, so server-safe Pagination, Breadcrumb, Delta, KpiTile and Skeleton would be stuck in English. |
| Function-valued labels (`summary: (from, to, total) => string`) | Functions do not serialize across the RSC boundary (react.dev, already cited by r8), so a catalogue could never be passed from server to client. |
| `createNizivo({ locale, messages })` factory returning pre-bound components (05's `createCommerce`) | It creates two import paths and breaks the namespace and flat exports. It also gets in the way of tree-shaking per subpath. An app can write the three-line wrapper itself (§A3). |
| Per-request server config through React `cache()` | `cache` memoizes only in the RSC environment, so the same component would act differently in Vite SSR, React Router 8 non-RSC or Astro. That couples the library to a framework. |

## A3. Locale propagation and hydration determinism

**Facts.**
- **React Aria's default locale flips after hydration (PRIMARY, source).** `react-aria@3.53.1` `dist/private/i18n/useDefaultLocale.mjs` contains this code and comment:
  - `if (isSSR) return { locale: window[localeSymbol] || 'en-US', direction: 'ltr' }`
  - "We cannot determine the browser's language on the server, so default to en-US. This will be updated after hydration on the client to the correct value."
  - It also listens for `languagechange`.

  Without an `I18nProvider`, a German or Arabic visitor therefore sees English RAC strings and LTR keyboard behaviour first, then a re-render into their browser locale. This is not a hydration error, but it is a visible switch and it breaks the r8 determinism rule.
- **`I18nProvider` has only `locale` and `children`; there is no `direction` prop.** RAC derives direction from the locale, and `useLocale()` returns `{ locale, direction }` (PRIMARY: react-aria.adobe.com/I18nProvider and /frameworks).
- RAC's framework guide says "ensure the locale on the server matches the client". It reads `accept-language` in the root layout and sets `<html lang dir>` (PRIMARY).

**Rules.**
1. **Determinism.** With no config, every formatter and every RAC part uses `'en-US'`. Nothing reads `navigator.language` during render, which keeps r8's rule.
2. **The adapter always provides RAC's locale.** Each RAC-backed root part (SelectRoot, MenuRoot, DialogRoot and so on) renders inside a provider fed by Nizivo's resolved locale. It costs one context provider per compound root.

   ```tsx
   // src/_engines/react-aria/locale.tsx — 'use client' (engine adapter, never public)
   'use client';
   import { I18nProvider } from 'react-aria-components/I18nProvider';
   import { useNizivoConfig } from '../../config/context';
   export function EngineLocale({ children }: { children: React.ReactNode }) {
     return <I18nProvider locale={useNizivoConfig().locale /* 'en-US' default */}>{children}</I18nProvider>;
   }
   ```
3. **Server-safe components take a `locale` prop** (default `'en-US'`). They cannot see `NizivoConfig`. For app-wide binding without prop drilling, the docs give a **userland** three-line wrapper. It is not library API, so the library stays framework-neutral:

   ```tsx
   // app/ui/number.tsx (Next + next-intl example)
   import { getLocale } from 'next-intl/server';
   import { NumberValue as Nz } from '@nizivo/ui/number';
   export async function NumberValue(p: React.ComponentProps<typeof Nz>) { return <Nz locale={await getLocale()} {...p} />; }
   ```
4. **Direction has a single source.**
   - CSS follows the app's `dir` attribute.
   - RAC follows the locale.
   - Nizivo's own T2 code (carousel, hotspots, segmented arrow keys, chart island) reads direction **from the DOM when a key event fires**: `getComputedStyle(el).direction`. It needs no config, cannot mismatch hydration, and always agrees with the CSS.
   - Docs: set `<html lang={l} dir={dirOf(l)}>` **and** pass the same `l` to `NizivoConfig`.
   - Helper (verified in Node 24 for ar, ar-EG, he, fa, ur, dv, ckb, ps, yi, ug, sd → `rtl`; ku → `ltr`):

   ```ts
   const RTL_SCRIPTS = new Set(['Arab', 'Hebr', 'Thaa', 'Syrc', 'Nkoo', 'Adlm', 'Rohg', 'Mand', 'Samr', 'Mend', 'Yezi']);
   export const dirOf = (locale: string): 'ltr' | 'rtl' =>
     RTL_SCRIPTS.has(new Intl.Locale(locale).maximize().script ?? '') ? 'rtl' : 'ltr';
   ```
   Do **not** use `Intl.Locale.prototype.getTextInfo()`. web-features 3.42.0 lists "Intl.Locale info" as Baseline *Newly* only since **2026-07-21** (Firefox 153), which is above the Firefox 128 floor. `maximize()` is Baseline Widely.
5. **Astro islands.** Each island is its own React root, so it needs its own `NizivoConfig` when the locale is not `en-US` (r1, r3).

## A4. Formatting numbers, money, percentages and dates with Intl

### Facts from this session

These are EMPIRICAL results from Node 24.16.0 (ICU 78.3, CLDR 48.0) unless noted. Invisible characters are shown as code points.

| Case | Output | Note |
|---|---|---|
| USD, en-US / en-GB / en-IN / de-DE | `$123,307.40` / `US$123,307.40` / `$1,23,307.40` / `123.307,40 $` (U+00A0) | en-GB disambiguates USD as **US$**. en-IN uses **lakh grouping**. |
| USD, fr-FR | `123 307,40 $US` (U+202F group separator) | Narrow no-break spaces |
| USD, ar-EG vs ar vs he-IL | `‏١٢٣٬٣٠٧٫٤٠ US$` vs `‏123,307.40 US$` vs `‏123,307.40 ‏$` (U+200F marks) | `ar-EG` uses **Arabic-Indic digits**; bare `ar` uses Latin digits. Intl inserts RLM marks. |
| compact 1,234,567: en-US / en-IN / de-DE / ja-JP / hi-IN | `1.2M` / `12.3L` / `1,2 Mio.` / `123.5万` / `12.3 लाख` | KPI compact values vary in **length** by locale |
| compact INR, en-IN, 12,345,678 | `₹1.2Cr` | |
| Delta (`percent`, `signDisplay: 'exceptZero'`, −0.124 / +0.124 / 0): en-US / sv-SE / ar-EG / he-IL | `-12.4% \| +12.4% \| 0%` / `−12,4 %` (U+2212) / `؜-١٢٫٤٪؜` (U+061C ALM) / `‎-12.4%` (U+200E) | Sign, minus glyph and bidi marks all come from the locale |
| JPY ja-JP | `￥1,235` | Zero-decimal currency is handled automatically. **Never hard-code fraction digits for money.** |
| `format('12345678901234567.89')` | `$12,345,678,901,234,567.89` | String input keeps precision, so money amounts stay decimal strings |
| `formatRange(10, 20)` USD | `$10 – $20` | |
| Dates, medium/short UTC: th-TH / fa-IR / ar-EG | `14 ต.ค. 2569 13:05` (Buddhist year) / `۲۲ مهر ۱۴۰۵، ۱۳:۰۵` (Persian calendar) / `١٤‏/١٠‏/٢٠٢٦، ١:٠٥ م` | **Default calendars are not always Gregorian** |
| Plural categories: en / fr / pl / ar / ja | `one,other` / `one,many,other` (**0 → one**) / `one,few,many,other` / `zero,one,two,few,many,other` / `other` | |
| `getWeekInfo()` en-US / en-GB / ar-EG | first day 7 / 1 / 6 | Above the browser floor (see A3); use RAC/`@internationalized/date` in pickers |
| `Temporal` | `undefined` in Node 24; web-features: **not Baseline** (no Safari) | Don't depend on it |

**Cross-engine check (EMPIRICAL, Playwright 1.64; Chromium 156.0.8078.4, WebKit 27.2).** Ten of eleven cases matched Node exactly. One did not:

```
en-US formatRange(Oct 1, Oct 30):  node = "Oct 1 – 30"  (U+2009 thin spaces around U+2013)
                                   chromium/webkit = "Oct 1 – 30"  (ASCII spaces)
```

So the same `Intl` call can return different strings on the server and in the browser. In a client component that is a hydration text mismatch.

### Rules

1. **Format once, where the value first renders.**
   - Server-safe components format on the server and emit the string.
   - Client islands receive **pre-formatted strings** (r6 already passes `{x, values, formatted}` to `ChartInteraction`).
   - Client components that format during render must use deterministic inputs: explicit `locale` **and** `timeZone`.
   - Ranges, relative times and anything using `formatRange` should render on one side only. Server-render them, or mount them client-only with `useSyncExternalStore` and a server snapshot.
2. **Explicit `timeZone` on every date formatter.** There is no default; a missing value is a dev warning (r1, r6).
3. **The `format` prop is serializable.** It takes `Intl.NumberFormatOptions` or `Intl.DateTimeFormatOptions` objects, or a **preset name**. Function formatters are accepted only by client parts (documented per part).
4. **Money is `{ amount: string; currency: string }`** (ISO 4217), as 05 proposed. Display uses `style: 'currency'`.
   - Use `currencyDisplay: 'narrowSymbol'` only when the currency is unambiguous in context. en-GB/en-CA show "US$" by default, which is correct for mixed-currency stores.
   - Zero and "Free" come from a label, not a number.
5. **Percent semantics.** Delta and percent values are ratios (0.124 → 12.4%). Trend comes from the sign, and the visible sign from `signDisplay: 'exceptZero'`. That removes 04's "no minus sign, so screen-reader text is required" issue for the visible text, though the SR phrase is still added (§A1).
6. **Bidi isolation.** Every formatted value renders as `<data value={raw} class="nz-number" data-slot="number">`, with `unicode-bidi: isolate` and `font-variant-numeric: tabular-nums` set in CSS.
   - Identifiers (order `#1042`, SKUs, phone numbers, the Mono IDs in 05) render as `<bdi dir="ltr" translate="no">`.
   - Wikimedia Codex: "Always use LTR for numbers … (phone numbers)" (PRIMARY).
   - **Do not force Latin digits.** Respect the locale's numbering system and pass through `numberingSystem` if the app wants `latn`.
7. **Calendars.** Pass through `calendar` and `numberingSystem` options. The chart time axis formats ticks with the same options, so `th-TH` gets Buddhist-era years consistently.
8. **Relative time** ("2 min ago") is client-only.
   - Core: a `<RelativeTime>` client leaf renders the absolute date on the server and in the server snapshot, then switches to relative after mount.
   - React 19.3's `browser()` would be cleaner, but core's floor is 19.2 (settled decision 9), so it is not used in core.
9. **Dates cross the RSC boundary as ISO strings.** `@internationalized/date` objects are class instances and do not serialize. Date components accept `'2026-10-14'` and parse inside the client adapter. This feeds into G13.

```ts
// @nizivo/ui/number — presets (server-safe)
export type NumberPreset =
  | 'integer' | 'decimal-1' | 'percent-0' | 'percent-1' | 'delta-percent'
  | 'compact' | 'currency' | 'currency-compact';
const PRESETS: Record<NumberPreset, Intl.NumberFormatOptions> = {
  integer: { maximumFractionDigits: 0 },
  'decimal-1': { maximumFractionDigits: 1 },
  'percent-0': { style: 'percent', maximumFractionDigits: 0 },
  'percent-1': { style: 'percent', maximumFractionDigits: 1 },
  'delta-percent': { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' },
  compact: { notation: 'compact', maximumFractionDigits: 1 },
  currency: { style: 'currency' },                                  // + currency from Money
  'currency-compact': { style: 'currency', notation: 'compact', maximumFractionDigits: 1 },
};
export type NumberFormat = NumberPreset | Intl.NumberFormatOptions;
```

```tsx
// Delta — server-safe, zero JS. render prop + nz classes + data-* + labels + locale.
export function Delta({
  value, locale = 'en-US', format = 'delta-percent', polarity = 'higher-is-better',
  comparison, labels, render, className, ...rest
}: DeltaProps) {
  const L = { ...deltaLabels, ...labels };
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const tone = trend === 'flat' ? 'neutral'
    : (trend === 'up') === (polarity === 'higher-is-better') ? 'success' : 'critical';
  return renderElement('span', render, { trend, tone }, {
    ...rest,
    className: cx('nz-delta', className),
    'data-slot': 'delta',
    'data-tone': tone,
    children: (
      <>
        <span className="nz-delta-icon" aria-hidden="true">{/* internal glyph; not mirrored (§A6) */}</span>
        <data className="nz-number nz-delta-value" value={String(value)} aria-hidden="true">
          {formatNumber(locale, value, format)}
        </data>
        <span className="nz-visually-hidden">
          {formatLabel(locale, L[trend], { value: formatNumber(locale, Math.abs(value), 'percent-1'), comparison: comparison ?? '' })}
        </span>
      </>
    ),
  });
}
```

**`nz-visually-hidden` is a class, not an inline style object.** This is deliberate (see §B1). RAC's `VisuallyHidden` uses an inline style, and that breaks under a strict CSP.

## A5. Plurals

- Never concatenate strings (`count + ' items'`). Built-in labels use plural objects (§A2). Storefront strings such as "Shop {count} items", "×{qty}" and "{used} of {limit}" (05, 10) are **pattern** strings and follow the same shape.
- The categories differ per locale (§A4 table):
  - French puts 0 in **one**.
  - Arabic needs all six categories.
  - Polish has `few` and `many`.
  - Japanese has only `other`.
- A catalogue lint checks that every plural object supplies every category of its locale (`new Intl.PluralRules(tag).resolvedOptions().pluralCategories`).
- Ordinals such as a "1st" rank use `new Intl.PluralRules(locale, { type: 'ordinal' })`, only if design asks for them. RankedList shows bare numbers.

## A6. RTL

### A6.1 Layout

1. **The app sets `dir` on `<html>`** (or on any subtree, since nested `dir` works). The library never sets `dir` except on `<bdi dir="ltr">` identifiers.
2. **Use logical properties only**, enforced by `stylelint-use-logical` 2.1.3. Its peer range is stylelint `>=11 <18`, which is compatible with stylelint 17.16.0 (registry). Logical properties are Baseline Widely (web-features), and so is `:dir()` (since **2026-06-07**: Chrome 120, Firefox 49, Safari 16.4).
3. **Physical leftovers the linter misses**, each fixed under `:dir(rtl)`:

| Physical construct | Where it bites in Nizivo | Fix |
|---|---|---|
| `transform: translateX()` and `translate` in enter/exit motion | Drawer slide-in, Toast swipe, Tooltip 4 px travel | `--_nz-travel-x: var(--nz-distance-reveal)` and `:dir(rtl) { --_nz-travel-x: calc(-1 * var(--nz-distance-reveal)) }` |
| `linear-gradient(to right …)` | Skeleton shimmer, paper-fade scrims (10) | `:dir(rtl)` flips the angle; shimmer keyframes use the flipped variable |
| `background-position`, `box-shadow` x-offset | Elevation tokens (x = 0 in Figma, so safe); a featured card highlight | Keep x-offsets at 0 by token rule |
| `clip-path: inset()` and `polygon()` | Chart draw-in via clip-path (r6) | Swap the inset sides under `:dir(rtl)` when `xDirection` is `auto`/`rtl` |
| `scrollLeft` | Carousel, PageIndicator, collections rail (10) | `scrollLeft` is ≤ 0 in RTL in all current engines. Use `scrollIntoView({ inline: 'nearest' })` / `scrollBy` with a direction factor |
| `text-align: left/right` | Money columns "totals right-aligned" (05) | `text-align: end` |
| Fixed-side props | Drawer `side="right"` (07), Toast `swipeDirection="right"`, placements | **Logical values in the API**: `side: 'start' \| 'end' \| 'top' \| 'bottom'`, `swipeDirection: 'start' \| 'end' \| 'down'`, `placement: 'start' \| 'end' \| …`. RAC already accepts `start`/`end` placements. |

### A6.2 Which icons mirror

Sources (PRIMARY):
- Material M1 bidirectionality: "Icons that communicate direction, like arrows, are mirrored".
  - Do not mirror: "Icons that do not communicate direction, such as a camera", "Numbers, such as the clock and phone numbers", "Charts and graphs", and "media playback buttons and the media progress indicator".
  - "Clocks still turn clockwise for RTL languages."
  - The search icon keeps its handle at bottom right.
  - "Most RTL countries do not mirror slashes".
- Wikimedia Codex adds: mirror icons "that contain lists".
  - Do **not** mirror icons representing time ("clocks or calendars"), icons "designed to be held with the right hand", "icons containing check symbols", or media icons.
- Android's `Icons.AutoMirrored` is the precedent for auto-mirroring a *subset* of icons.

| Mirror in RTL (auto, via the icons package) | Never mirror |
|---|---|
| chevron-left/right, chevrons-left/right, arrow-left/right, arrow-*-from/to-line, move-left/right | play, pause, skip, rewind, fast-forward, volume |
| corner-*-left/right, undo/redo (horizontal forms; M1 leaves the choice open, and the Amsterdam Design System mirrors both "to prioritise linear time"), reply, forward, send | clock, timer, history (circular), refresh/rotate (circular), calendar |
| log-in, log-out, external-link / arrow-up-right (forward motion) | check, circle-check, check-check |
| list, list-ordered, align-left/right, text-*, indent/outdent, message-square tail (text flow) | search (handle at bottom right), pencil/edit (held in the right hand) |
| panel-left/right, sidebar-open/close, chevron-first/last | **trending-up/down, chart icons, sparkline** (charts don't mirror, §A6.3), percent, slash, divide |
| shopping-cart (implied forward motion; UNVERIFIED, since neither source names it) | brand glyphs (Instagram), logos, camera, user, bell, info, x |

The final list is generated against the **74 Figma icons** once design restores the masters (G7). The icons generator keeps a `mirror.json` keyed by Lucide name. Any icon not in that file does not mirror.

### A6.3 Mechanism

```tsx
// @nizivo/icons — generated module for a directional icon (server-safe, no directive)
export function ChevronRight({ mirror = true, size = 20, title, ...rest }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={1.92} strokeLinecap="round" strokeLinejoin="round"
         className="nz-icon" data-slot="icon" data-mirror={mirror ? 'rtl' : undefined}
         aria-hidden={title ? undefined : true} role={title ? 'img' : undefined} {...rest}>
      {title && <title>{title}</title>}
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
```

```css
/* core CSS, in the layer that holds base element rules (exact layer order: settled decision 3) */
[data-mirror='rtl']:dir(rtl) { scale: -1 1; }
```

- The `scale` property (Baseline Widely) composes with any consumer `transform`, so it does not clobber it.
- The stroke width of **1.92** on a 24 viewBox follows settled decision 7.
- **No double flips.** A component puts `data-mirror="rtl"` only on its **own internal** glyphs: Pagination previous/next, the Breadcrumb separator, Carousel arrows and the Drawer close-to-side chevron. It never puts it on a wrapper around a consumer-supplied icon slot. Consumer icons mirror only if they carry the attribute themselves; generated directional icons do by default.
- **Literal directions opt out.** For example, a map's "east" arrow uses `<ArrowRight mirror={false} />`.
- Third-party icon sets passed as slots need `data-mirror="rtl"` added by the consumer. This is documented with a table.

### A6.4 Charts in RTL

**Evidence is split.**
- Material M1 lists "Charts and graphs" under do-not-mirror.
- Codex says don't mirror charts "if mirroring could impact data interpretation".
- An IEEE VIS 2024 study of 128 Arabic news visualisations found time-sequence line charts mirrored to follow the article direction (SECONDARY).
- Arabic and Hebrew textbooks keep x-axes left to right (Gorelik, SECONDARY).
- Chart libraries make direction an explicit setting (Syncfusion `isInversed`, AG Charts RTL option).

**Recommendation for a merchant dashboard:**
- Time and numeric axes **do not mirror by default**: `xDirection: 'ltr' | 'rtl' | 'auto'`, default `'ltr'`, where `'auto'` follows `:dir()`.
- Chart **chrome** follows `dir`: title and legend alignment, legend order, the tooltip flip side and the data-table view.
- **Keyboard follows the visual plot direction, not the document direction.** In an LTR plot inside an RTL page, ArrowRight still moves to the later point, because the island reads `data-x-direction` on the plot.
- **Categorical horizontal bars** (RankedList, Funnel, ProgressBar used as a meter) anchor to `inline-start`, which flips naturally. Bar length is not directional data.
- **Rings and donuts** keep clockwise from 12 o'clock in both directions ("clocks still turn clockwise").
- Because charts don't mirror, the **trend icons and the sparkline don't mirror either**, for consistency.

Percent-space SVG (r6) makes `'rtl'` a pure-CSS switch: `scale: -1 1` on the plot `<svg>`. HTML tick labels laid out with grid or flex reverse via `flex-direction` under `[data-x-direction='rtl']` (see §B1.4 for why labels must not use per-label inline styles).

### A6.5 Text expansion, truncation and translation-proofing

- **Budget for +30–40% length.** The pseudo-locale `en-XA` (accented plus expanded) runs in CI.
- 08 found tab-bar labels at 14 px in **75 px** columns, where "Customers" barely fits. Rule: tab labels use `text-overflow: ellipsis`, and the full label goes into `aria-label`/`title`. No 12 px fallback exists (S5).
- **Browser auto-translate resilience.** Google Translate swaps out bare text nodes that React still holds. When React later removes them it throws `NotFoundError: removeChild` (facebook/react#11538, cited by react-i18next and others; SECONDARY). Rules:
  - Components never render **toggling bare text next to elements**. Conditional text is wrapped in `<span>`, the same fix react-i18next ships as `transWrapTextNodes: 'span'`.
  - `Kbd`, identifiers and the brand wordmark get `translate="no"`.

## A7. Locales to test

| Locale | Why (verified behaviour) | Tier |
|---|---|---|
| `en-US` | Default; deterministic baseline | all |
| `en-GB` | Figma copy is British ("Colour", "Fulfilment", 05). Shows `US$` for USD. Date order and 24-hour time differ. | unit + SSR |
| `en-IN` / `hi-IN` | Neev's home market (UNVERIFIED as a product requirement). Lakh grouping `1,23,307.40`, compact `12.3L` / `₹1.2Cr` / `12.3 लाख`. Devanagari line height. | unit + SSR + 1 VRT story set |
| `de-DE` | Text expansion, `1,2 Mio.`, decimal comma, NBSP before `%`, "Strg" key | unit + pseudo/VRT spot checks |
| `fr-FR` | U+202F group separator; 0 is plural `one` | unit |
| `pl-PL` | `one/few/many/other` plurals | unit (catalogue lint) |
| `ja-JP` | CJK, `other`-only plurals, `123.5万`, zero-decimal JPY | unit + 1 VRT story set |
| `ar-EG` | RTL, Arabic-Indic digits, ALM marks, 6 plural categories, week starts Saturday | unit + **full RTL VRT** + manual AT |
| `he-IL` | RTL with Latin digits and LRM/RLM marks | unit + RTL spot VRT + manual AT |
| `th-TH` | Buddhist calendar year `2569` in default dates | unit (date/axis formatting) |
| `fa-IR` (optional) | RTL plus Persian digits plus Persian calendar together | unit |
| `en-XA` pseudo | Accented and expanded text (pseudo-localization 3.1.3 exists; an in-house transform of the en catalogue is ~30 lines) | VRT on text-bearing stories |
| `en-XB` pseudo-bidi | RTL with English-readable text, so devs can review RTL without reading Arabic | Storybook toolbar only |

**Unit tier.** Snapshot tests of `formatNumber`, `formatDate` and `formatLabel` per locale, run on Node, Chromium, Firefox and WebKit, so ICU drift between engines shows up (§A4). **SSR tier.** Every example is rendered with `renderToString` under each locale's catalogue, with zero hydration warnings.

## A8. RTL visual-regression matrix

r5's selective matrix is about 680 screenshots per full build. Add these modes, declared through `parameters.chromatic.modes`, which Argos reads (r5):

| Mode | Stories | Theme / viewport | Approx. shots |
|---|---|---|---|
| `rtl` (`dir=rtl`, `locale=ar-EG`) | Every component story tagged `layout:directional` (on by default; opt out with `layout:symmetric` for e.g. Avatar or Skeleton) | light / desktop | ~150 |
| `rtl-mobile` | Shell, nav, Drawer/Sheet, sticky bars, storefront patterns | light / 390 | ~20 |
| `rtl-dark` | 10 representative stories | dark / desktop | ~10 |
| `pseudo-long` (`en-XA`) | Text-bearing stories (tabs, nav, buttons, KPI, toasts, tables) | light / desktop | ~40 |

That adds about **220 shots per full build (+32%)**. At Argos Pro's 35k/month (r5) that is still about 38 full builds a month. Full builds stay on the merge queue only (r5).

**Cheaper guards run first:**
1. The stylelint logical-property rule.
2. A Playwright **mirror-geometry test** per compound. In RTL, the part that is `inline-start` must have `right ≈ container.right`. It is fast, has no pixels, and runs on PRs.
3. VRT.

```ts
// .storybook/preview.tsx — globals drive dir + locale; decorator sets attributes, not providers.
export const globalTypes = {
  locale: { toolbar: { items: ['en-US', 'de-DE', 'ar-EG', 'he-IL', 'ja-JP', 'en-XA', 'en-XB'] } },
};
export const decorators = [(Story, { globals }) => {
  const locale = globals.locale ?? 'en-US';
  const dir = locale === 'en-XB' ? 'rtl' : dirOf(locale);
  return <div lang={locale} dir={dir}><NizivoConfig locale={locale} labels={catalogs[locale]}><Story /></NizivoConfig></div>;
}];
```

## A9. React Aria as the engine: i18n implications

1. **36 built-in locales.** RAC's own strings, keyboard RTL behaviour, 13 calendars and locale-aware NumberField parsing come for free (r3).
2. **Locale strings cost bytes unless the consumer strips them (EMPIRICAL, esbuild min+gzip, React external, RAC 1.22.1).**

   | Set | All 36 locales | en-US only | en-US + ar-AE + de-DE |
   |---|---|---|---|
   | Dashboard (Dialog, Popover, Menu, Select, Tabs, Tooltip) | 65.9 KB | 61.1 KB (−4.8) | 61.4 KB |
   | NumberField | 25.8 KB | 24.3 KB (−1.5) | 24.4 KB |
   | DateRangePicker + RangeCalendar | 74.7 KB | 61.3 KB (**−13.4**) | 62.3 KB |

   Size budgets (settled decision 13) should be measured **with** all locales (the worst case a consumer gets with no plugin). Docs recommend `@react-aria/optimize-locales-plugin` 2.1.0 (Vite, webpack, Rollup, esbuild, and Turbopack for Next ≥ 15.4; PRIMARY). Nizivo cannot strip locales itself: it publishes unbundled ESM, so stripping happens in the consumer's build.
3. **Server-injected strings.** RAC can ship *no* strings to the client, with the server injecting them instead.
   - API: `getLocalizationScript(lang)` / `LocalizedStringProvider` from `react-aria-components/i18n`.
   - Source check (`react-aria/dist/private/i18n/server.mjs`): it renders an **inline `<script nonce dangerouslySetInnerHTML>`** setting `window[Symbol.for('react-aria.i18n.locale')]` and the string table. That same symbol also makes `useDefaultLocale` agree during hydration.
   - It is server-only (it logs and returns `null` in the browser), so Trusted Types don't apply, because the markup is parser-inserted. **CSP does apply**: it needs a nonce, or one hash per locale (§B1).
4. **The CSP nonce meta.** RAC reads `<meta property="csp-nonce">` (PRIMARY docs). The source (`getMetaValue.mjs`) reads `meta.nonce` **before** `meta.content`, so prefer `<meta property="csp-nonce" nonce={nonce}>`. That keeps the value out of a readable `content` attribute; nonce hiding applies to the `nonce` attribute (per the HTML spec; not tested here). The reason RAC needs a nonce is in §B1.3.
5. **Direction comes from the locale** (A3). An app with `lang="en"` and `dir="rtl"` gets LTR keyboard behaviour in RAC parts. Document "keep `lang` and `dir` consistent".
6. **Collation and filtering.** Combobox and Autocomplete filtering uses `Intl.Collator` for the locale (r3). Sorting in DataTable should too: `new Intl.Collator(locale).compare`. Verified: de sorts `apfel, Äpfel, Ölkanne, Zebra`.
7. **No RAC string API in Nizivo's public types** (r3 seam rule). Nizivo `labels` for parts Nizivo renders (for example the Dialog close button) win over RAC's built-ins for the same visible element.

---

# Part B. Security and supply chain

## B1. CSP compatibility

### B1.1 What was measured (EMPIRICAL)

**Setup.**
- Location: `scratchpad/gapb/csp-test`.
- React 19.3.0 `renderToString` plus `hydrateRoot`.
- Browsers: Playwright 1.64 with Chromium 156.0.8078.4 and WebKit 27.2. Firefox 157 could not launch inside this session's sandbox, so it is **UNVERIFIED** here. MDN marks `style-src-attr` as Baseline Widely since December 2022.

**Policies tested:**
- **none**
- **strict**: `default-src 'self'; style-src 'self'`
- **attr**: `strict` plus `style-src-attr 'unsafe-inline'`
- **nonce**: `style-src 'self' 'nonce-abc123'`

**Results.** Chromium and WebKit behaved identically.

| Probe | none | strict | attr | nonce |
|---|---|---|---|---|
| SSR `style="--v:40%"` driving `width: var(--v)` | applied | **blocked** | applied | **blocked** |
| SSR `style="width:50px"` | applied | **blocked** | applied | **blocked** |
| SSR RAC-style visually-hidden object on `<input>` (1 px) | 1 px | **153–156 px: visible** | 1 px | **visible** |
| …after `hydrateRoot` | same | **still blocked** | – | **still blocked** |
| …after a re-render with the **same** style value | same | **still blocked** | – | **still blocked** |
| …after a re-render with a **new** value (React writes via CSSOM) | applied | **applied** | applied | **applied** |
| SVG presentation attributes `<rect width="40%">`, `stroke-dasharray="40 100"` (`pathLength=100`) | applied | **applied** | applied | **applied** |
| Native `<progress value>` | 0.4 | **0.4** | 0.4 | 0.4 |
| JS `el.style.setProperty('--v', …)` (CSSOM) | applied | **applied** | applied | applied |
| JS `el.style.cssText = …` | applied | **applied** (MDN says this is blocked; not observed in Chromium 156 or WebKit 27.2) | applied | applied |
| JS `el.setAttribute('style', …)` | applied | **blocked** | applied | blocked |
| Injected `<style>` without nonce | applied | blocked | blocked | blocked |
| Injected `<style nonce>` | applied | blocked | blocked | **applied** |

**What this means.**
1. **Server-rendered `style` attributes fail silently under a strict CSP, and hydration never repairs them.** React does not patch attributes during hydration. After that it only writes **changed** style keys through CSSOM, which CSP allows. Any server-safe component that relies on a `style` attribute (a progress `--value`, a chart `--v`, an Image `aspect-ratio`, a visually hidden helper) renders wrong forever unless the value changes.
2. **CSSOM writes from client code are allowed.** This matches MDN: "styles properties that are set directly on the element's `style` property will not be blocked". Positioning engines that write after mount (RAC, Floating UI) therefore work under a strict CSP. Overlays are portalled and rendered only on the client, so their styles are never SSR attributes.
3. **SVG presentation attributes and native element values are CSP-proof.** These are how server-safe data geometry gets drawn.
4. **Nonces do not authorise `style` attributes.** Base UI's docs say the same: "`CSPProvider` doesn't cover inline style attributes … `style-src-attr` governs these in server pre-rendered HTML". So attributes need `'unsafe-inline'`, per-value `'unsafe-hashes'`, or must be avoided.

### B1.2 Engine behaviour (PRIMARY, source reads of `react-aria@3.53.1`)

- **`usePress` injects a `<style>`.** It contains `@layer { [data-react-aria-pressable] { touch-action: pan-x pan-y pinch-zoom } }`. The source comment explains that `touch-action: manipulation` breaks `onPointerCancel` in Safari. It is prepended to `<head>` and given `nonce = getNonce()`.
- **`usePreventScroll` injects `<style>@layer { * { overscroll-behavior: contain } }</style>`** on iOS while a modal is open. Source comment: "must be applied before the touchstart event as of iOS 26". It is also nonce-aware.
- **`getNonce()`** reads `<meta name|property="csp-nonce">` (`.nonce`, then `.content`) or `__webpack_nonce__`.
- **`VisuallyHidden` is an inline `style` object.** RAC modules using it include Checkbox, RadioGroup, Switch, Select (HiddenSelect), Slider, Table, GridList, DropZone and Calendar. Under `strict` or `nonce`, an SSR'd RAC Select would show its hidden native `<select>` permanently (the "visible input" row above).
- Both injected rules use **anonymous `@layer {}`** prepended to `<head>`. That layer is created before `nz.*`, so it has the lowest layer priority and does not disturb the canonical order (settled decision 3).

Base UI is comparable. Its `CSPProvider` (`nonce`, `disableStyleElements`) covers `<style>` injected by ScrollArea and Select, plus opt-in pre-hydration `<script>`s (PRIMARY). The issue is not specific to one engine. That supports keeping the engine choice reversible (C4).

### B1.3 Recommendation: two published CSP profiles, tested in CI

**Profile A ("full library").** Every component works under it. It is the documented default.

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{N}' 'strict-dynamic';
  style-src 'self' 'nonce-{N}';
  style-src-attr 'unsafe-inline';          /* client positioning, consumer style props, RAC VisuallyHidden */
  img-src 'self' data: blob: https://media.your-cdn.example;
  font-src 'self'; connect-src 'self';
  object-src 'none'; base-uri 'none'; frame-ancestors 'none';
  require-trusted-types-for 'script'       /* see B2; start in Report-Only */
```

Base UI's docs call `style-src-attr 'unsafe-inline'` a "lower-severity risk". Inline style attributes cannot run script or select other elements. The serious CSS-injection techniques (attribute-selector exfiltration) need an injected `<style>`, which Profile A still blocks.

**Profile B ("strict styles").** Same as A, but with `style-src-attr 'none'`. Guarantee: **all server-safe (T0) core components, tokens CSS and charts' static output render correctly.** Engine-backed (T1) parts are supported under B only when rendered client-only, or once the adapter replaces engine inline styles (tracked per component). This is Base UI's documented option 2, applied to RAC.

**Library rules that make this true:**
1. **Server-safe components emit no `style` attribute.** A lint rule bans the `style` JSX attribute in non-`'use client'` modules except for pass-through of the consumer's own `style` prop (the consumer's choice).
   - Data-driven geometry uses SVG presentation attributes (ProgressBar/Ring, sparkline, area, donut), native `<progress>`/`<meter>` where the visual allows, `data-*` plus classes for discrete values, and CSS grid/flex for evenly spaced labels.
   - **Change to r6 §8:** `Image` drops `style={{ aspectRatio }}`. Browsers derive the aspect ratio from the `width`/`height` attributes. Preset ratios become `data-ratio="1/1|4/5|16/9"` mapped to `--nz-ratio-*` tokens in CSS.
2. **Nizivo's own visually hidden helper is a class** (`.nz-visually-hidden`), never an inline style object.
3. **Nizivo injects no `<style>`.** CSS ships as static files (settled decision 9). To survive a blocked RAC injection, core CSS sets `touch-action: pan-x pan-y pinch-zoom` on Nizivo's pressable parts **by `nz-` class**, never on the engine attribute, so the engine rule is redundant. The iOS `overscroll-behavior` rule cannot be replicated statically without `:has()` on the open overlay; under a blocked injection, scroll-lock leakage on iOS is the documented degradation (UNVERIFIED in practice).
4. **Inline scripts are limited** to the optional `ThemeScript` (r1 D8) and RAC's optional localization script. Both are server-only and accept `nonce`.
   - **Next.js:** nonces "only work on dynamically rendered pages", generated in `proxy.ts` (Next 16), per the Next CSP guide (PRIMARY). Hash-based CSP fits static hosts (Astro static, Vite SPA, exported Next).
   - Publish the SHA-256 of the default `ThemeScript` per release and per option set. Its content is static, so a hash works without dynamic rendering.
5. **Layout wiring for Next:**

   ```tsx
   // app/layout.tsx (Server Component)
   const nonce = (await headers()).get('x-nonce') ?? undefined;
   return (
     <html lang={lang} dir={dirOf(lang)} suppressHydrationWarning>
       <head>
         <meta property="csp-nonce" nonce={nonce} />   {/* RAC reads meta.nonce first; value not exposed as content */}
         <ThemeScript nonce={nonce} />
       </head>
       <body>{children}</body>
     </html>
   );
   ```
6. **CI fixtures.** The Next and Vite fixtures (r5) each run once under Profile A and once under Profile B, with a `securitypolicyviolation` listener.
   - **A:** zero violations across the whole shared Playwright spec.
   - **B:** zero violations on the server-safe story set, plus a geometry assertion (for example, ProgressBar fill width equals value% of the track).

### B1.4 Charts and data components under Profile B

- Area/line geometry is SVG `d` attributes. Dots are SVG `cx`/`cy`. In percent space with `preserveAspectRatio=none`, circles distort. Use a zero-length `<path>` with `stroke-linecap: round` plus `vector-effect: non-scaling-stroke` (UNVERIFIED in Safari; r6 already flags non-scaling-stroke QA), or draw the end-dot in the client island via CSSOM.
- Bars (HTML/CSS in r6) need a per-bar size. Under Profile B they render as SVG `<rect height="…%">` instead. The adapter picks SVG for SSR output, so r6's HTML bars become an implementation detail behind `ChartFrame`.
- Tick labels for evenly spaced ticks use `display: grid` with N equal columns, or flex `space-between`, so no per-label inline style is needed. Data-dependent label positions (an annotation at x = 37%) are client-only (CSSOM) or require Profile A.
- The tooltip, crosshair and active dot already live in the client island and write CSSOM, which is fine under both profiles.

## B2. Trusted Types and DOM-XSS sinks

**Facts.**
- Trusted Types are Baseline **Newly since 2026-02-24** (Chrome 83, Firefox 148, Safari 26; web-features 3.42.0).
- React 19.3 passes Trusted Types objects to DOM sinks without coercing them to strings (#35816). `dangerouslySetInnerHTML.__html` accepts a `TrustedHTML` (react.dev common components; React 19.3 release notes).
- React warns when a `<script>` renders on the client (r1 §2.7).

**Rules.**
1. **No sinks in library code.** That means no `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string `setTimeout`, or `Range.createContextualFragment`. Enforce with oxlint (`react/no-danger`, `no-eval`, `no-implied-eval`, `no-new-func`) plus an ast-grep rule for DOM sinks. The **single exception** is `ThemeScript`, which is server-only.
2. **Strings stay strings.** Labels, toast messages, empty-state text and chart titles are `ReactNode`. Nothing accepts an HTML string. Rich text in catalogues (if ever needed) would use element interpolation, never HTML.
3. **Icons are JSX children** (`<path d=…>`). The generator must not emit SVG strings for `__html`. The optional `sprite.svg` uses `<use href="#id">` with a same-origin URL.
4. **URL hygiene in patterns.** Registry patterns that turn data into `href` (Instagram permalinks, product URLs) pass them through an `isSafeHref` check (`https:`, `http:`, `mailto:`, relative). Core components only forward consumer-supplied `href`.
5. **Fixture.** A Playwright run with `Content-Security-Policy: require-trusted-types-for 'script'` covers the full interaction suite and expects zero violations. Whether Next 16 itself needs a named TT policy is **UNVERIFIED**, so apps should start in `Report-Only` mode.

## B3. SBOM and provenance

- **Provenance:** this is already settled. npm provenance is generated automatically with trusted publishing from a public repo (r4, r5).
- **SBOM.** `pnpm sbom` has existed since pnpm 11.0.0 (PRIMARY: pnpm.io/cli/sbom).
  - Formats: CycloneDX 1.7 (JSON; `--sbom-spec-version` 1.5–1.7) and SPDX 2.3.
  - Flags: `--prod`, `--lockfile-only`, `--sbom-type library|application` (default `library`), `--out`.
  - In the **pack** job, per publishable package: `pnpm --filter <pkg> sbom --sbom-format cyclonedx --prod --sbom-type library --out sbom/<pkg>.cdx.json`.
  - Whether `pnpm sbom` includes licence fields is **UNVERIFIED**. Check the first output. If they are missing, merge in `pnpm licenses list --prod --json`, or use `@cyclonedx/cdxgen` 12.8.5 as the fallback.
- **Attestation.** Use `actions/attest@v4` (PRIMARY).
  - It replaces `attest-build-provenance` and `attest-sbom`, which are being deprecated.
  - Inputs: `subject-path: 'out/*.tgz'` (globs allowed, up to 1024 subjects) and `sbom-path: sbom/<pkg>.cdx.json`.
  - Permissions: `id-token: write`, `attestations: write`, `artifact-metadata: write`. These go **only on the publish job**, in line with r4's split-job rule.
- **Distribution.** Attach `*.cdx.json` to the GitHub Release created by Changesets. **Do not** put the SBOM inside the npm tarball: the SBOM describes the build environment's resolved tree, while consumers resolve their own.

## B4. Dependency policy

**Runtime dependency budget** (anything new needs an RFC, per r5's governance):

| Package | Runtime dependencies | Peers |
|---|---|---|
| tokens | none | – |
| core | `react-aria-components`, `react-aria` (hooks for T2), and their transitive deps (`@internationalized/date`, `client-only`, react-stately…) | react / react-dom `^19.2.0` |
| icons | none (`lucide-static` is a **build-time** dependency) | react |
| charts | `d3-shape`, `d3-array` | core |
| motion / lab | none | optional peers (motion, three, @paper-design/shaders-react) |

**Ranges.**
- **Engine runtime dependencies use caret ranges**, so consumer trees dedupe. Exact pins duplicate RAC copies and context (r3 risk).
- Tooling devDependencies are pinned exactly (r4 Renovate rules).
- The lockfile is committed, and CI installs with `--frozen-lockfile`.

**pnpm workspace settings** (r4's skeleton plus three):

```yaml
minimumReleaseAge: 4320        # 3 days (r4); identical to Renovate
trustPolicy: no-downgrade      # fail if a dep's trust evidence drops (e.g. lost trusted-publisher/provenance) — pnpm ≥10.21
blockExoticSubdeps: true       # only root deps may use git/tarball URLs — pnpm ≥10.26
allowBuilds: {}                # no install scripts unless allowlisted (r4)
```

- The settings above come from pnpm's settings and supply-chain pages (PRIMARY). r4 notes that pnpm 12 rejects unknown keys when the version is pinned, so verify each key against pnpm 12.11.2 on day one (UNVERIFIED for 12.x specifically).
- npm consumers get similar controls through `--allow-git` and `--allow-remote`. npm 12.0.0 defaults both to `none` per the npm CLI changelog (PRIMARY changelog; not otherwise verified).

**CI gates.**
- `actions/dependency-review-action` on PRs: `fail-on-severity: moderate`, plus an **`allow-licenses`** list. `allow` and `deny` are mutually exclusive, and `deny` is reportedly deprecated (SECONDARY).
- OpenSSF Scorecard (r5).
- The GSAP ban, through `no-restricted-imports` plus the licence allowlist (r6).
- **Tarball content guard.** `pnpm pack --dry-run` output must match a per-package allowlist (`dist/**`, `LICENSE*`, `THIRD_PARTY_NOTICES*`, `README.md`, `package.json`). It fails on any image, font, `.glb` or `.env*`.
- **No lifecycle scripts** in Nizivo's own published `package.json` (`preinstall`, `install`, `postinstall`).

## B5. Licence audit

### B5.1 The dependency mix

Licences were checked against the registry today. RAC's tarball was inspected for a `NOTICE` file and has none.

| Component | Licence | Obligation for Nizivo | Action |
|---|---|---|---|
| react-aria-components 1.22.1, react-aria 3.53.1, @internationalized/date 3.12.4 | Apache-2.0, **no NOTICE file** | Used as dependencies, not vendored, so there is nothing to propagate. Apache §4(d) NOTICE obligations do not arise. | Allowlist |
| client-only 0.0.1 | MIT | – | Allowlist |
| d3-shape, d3-array | ISC | – | Allowlist |
| lucide-static 1.56.0 (build-time; geometry **redistributed** in `@nizivo/icons`) | ISC, plus an MIT notice for Feather-derived icons (r6) | **Ship both notices** in `@nizivo/icons/LICENSE` or `THIRD_PARTY_NOTICES` | Generator copies them; CI checks they are present |
| simple-icons 16.35.0 (Instagram glyph) | CC0-1.0, but **trademark guidelines still apply** | No attribution needed. Follow Instagram's brand rules; Figma's own note says the glyph is "only for Connect / Follow on Instagram links". | Brand-icons entry carries a usage note |
| @react-aria/optimize-locales-plugin 2.1.0 (recommended consumer devDep) | Apache-2.0 LICENSE file, **but no `license` field in package.json** (verified) | Licence scanners will report "unknown" | Allowlist exception with a written reason |
| Geist / Geist Mono | OFL-1.1 | Not shipped (settled decision 15) | – |
| motion 14.2.0, three 0.186.1 (optional peers) | MIT | – | Allowlist |
| @paper-design/shaders-react 0.0.81 | Apache-2.0 now; it was PolyForm Shield at 0.0.47 (r6) | Licence has changed twice | **Re-check LICENSE on every upgrade.** Renovate approval required. |
| gsap | Standard "No Charge" licence, not OSI (r6) | Incompatible with an OSS redistribution posture | **Banned** |
| Nizivo itself | Apache-2.0 or MIT (C22, still open) | Every dependency above is compatible with either | Legal decision |
| Figma Community file (if published) | CC BY 4.0 by default (r5) | Attribution for derivative files | Applies to the *file*, not the code |

**Allowlist for `dependency-review-action`:** `MIT, ISC, Apache-2.0, BSD-2-Clause, BSD-3-Clause, 0BSD, CC0-1.0, BlueOak-1.0.0, Unlicense, Python-2.0`, plus per-package exceptions (the optimize-locales-plugin case). Anything else, including `LGPL-*`, `GPL-*`, `AGPL-*`, `SSPL`, `BUSL`, `PolyForm-*`, `CC-BY-NC-*`, `SEE LICENSE IN` and unknown, fails the PR.

### B5.2 Design assets from Figma

**Facts.** The file contains raster IMAGE fills: 6 3D renders, 8 product photos, 4 portraits (01 asset library), the "Live Render" stills (08), Insight/Banner/Empty State renders (04, 07) and storefront photography (10). Extraction recorded only image hashes. Provenance and licences are **unknown** (01, r6, G7).

**Rules.**
1. **Nothing raster from Figma ships** in any npm package, in Storybook, in the docs site, in registry items, in fixtures **or in a Figma Community copy** until it has a ledger entry. A Community publish is CC BY 4.0 *redistribution*, so unlicensed photos there are the highest-risk spot.
2. **`ASSETS.md` provenance ledger** (in the repo): file, source, author, licence, date, proof link, allowed uses. CI fails if a binary under `apps/docs/public/**`, `apps/storybook/public/**` or `registry/**` has no ledger entry.
3. **Replacements:**
   - 3D renders commissioned or made in-house, with licences assigned to Neev.
   - Product and portrait images: own photography, or CC0 sources recorded in the ledger.
   - Neutral generated placeholders (SVG gradients built from tokens) as the default in examples.
4. The **"Grove" brand strings** ("Powered by Grove", `grove.shop`, the Brand/Logo wordmark) are trademark material and stay out of shipped code (G21). Add a lint rule for `grove` (r8).

## B6. Registry items as a supply-chain vector

**What a registry item can do on install (PRIMARY: shadcn registry-item.json docs):**
- install npm `dependencies` and `devDependencies` (`name@version`)
- pull `registryDependencies` from any namespace, GitHub `owner/repo/item` or full URL
- write `files` to targets anywhere under the project root (`~` means the project root, for example `~/.env`)
- add **`envVars`** to `.env.local` or `.env`
- inject `css` and `cssVars`

The docs say to pin GitHub refs to "a tag or full commit SHA". I found **no content-hash or signature verification** in shadcn's docs or changelog: v4 adds `--dry-run`, `--diff` and `--view`, and May 2026 adds `registry validate`, but no integrity check. The absence is **UNVERIFIED**, since it was not found rather than confirmed. Ejected code also receives no `npm update` fixes (r8 E1–E7).

**Controls for the Nizivo registry** (hosted on the Fumadocs site, settled decision 14):
1. **Immutable versioned URLs.**
   - Serve `/r/v{major}.{minor}.{patch}/{name}.json` with `Cache-Control: public, max-age=31536000, immutable`.
   - `/r/{name}.json` is a moving alias with a short TTL.
   - Docs and copy buttons always show the versioned URL.
   - This extends r8's `/r/v{major}.{minor}/`: patch-level immutability is needed because a fix must never silently change bytes under an existing URL.
2. **Built and attested in CI only.** The registry JSON comes from the tagged release workflow with a pinned `shadcn build`, never from a developer machine. Publish `/r/v…/index.sha256.json` (SHA-256 per item) and attest it with `actions/attest@v4` (custom predicate or a subject of all item files). Consumers, or a future `@nizivo/init` check, can verify bytes against the manifest.
3. **Item policy linter**, run in CI on every item:
   - `dependencies`: only `@nizivo/*`, at **exactly** the release version, plus an explicit allowlist (`clsx` if ever needed). No `devDependencies`.
   - `registryDependencies`: only `@nizivo/*` items at the same version.
   - **No `envVars`.**
   - `files[].target` confined to the component, hook or lib alias directories. The **only** project-root write allowed is the universal `@nizivo/init` writing `components.json` (r8).
   - `css` and `cssVars`: tokens references only, with no `@import url(...)` to remote origins.
4. **Advisories** name affected **registry item versions** as well as npm versions. Docs teach `npx shadcn add <url> --diff` to check ejected copies.
5. **Hosting hygiene.**
   - Docs domain on HTTPS with HSTS; the registry path is served by the same deploy as the docs.
   - No user-generated content on that origin.
   - Vercel or other deploy tokens are never in the release workflow.

## B7. Third-party CDN privacy (Instagram media)

**Facts.**
1. The Instagram Media reference defines `media_url` as the published media's URL. It is **omitted** for copyrighted material, such as Reels audio (PRIMARY).
2. Signed CDN URLs expire. One measurement says about 105 h, readable from the `oe=` parameter (SECONDARY). Meta's own docs did not state a lifetime, so this is **UNVERIFIED**.
3. Guidance on storing media **conflicts**. A Meta messaging partner says media must not be stored and link expiry must not be circumvented; other guides say to cache copies (both SECONDARY). Meta Platform Terms were not checked: **UNVERIFIED, so legal review is required**.
4. Loading third-party resources directly sends the visitor's IP to that third party. LG München I (3 O 17493/20, 20 Jan 2022) found that a site loading Google Fonts from Google's CDN without consent breached GDPR and awarded €100. It is a first-instance decision (SECONDARY summaries).

**Library rules.**
- Components never fetch from or script Meta. Never load `embed.js` or oEmbed scripts.
- Social components take `MediaSource` (normalised data) and element slots (r6), so the **app** decides where bytes come from.
- `Image` forwards `referrerPolicy`, `crossOrigin` and `fetchPriority` without defaults that leak (it sets no `crossOrigin`).

**Storefront docs require one of these:**
- A server-side **media proxy or cache** keyed by media id, refreshing when `oe` passes, with `Cache-Control` matching the remaining life. The CSP `img-src` then lists only the app's own media origin (§B1.3).
- Storing copies **only if** the legal review of Meta's terms allows it.

The "We only read your posts. We never post for you." merchant copy (10) belongs in the pattern's docs as a data-minimisation statement, not a library guarantee.

---

# Part C. The loading, empty, error and Suspense contract

## C1. Principles

1. **The library never fetches and never suspends.** The one exception is `@nizivo/lab`, which uses `use(browser())` behind its own `<LabBoundary>` (r1). Data, Suspense boundaries and error boundaries belong to the app and its framework.
2. **The frame persists; only the content region swaps.** A KPI tile keeps its label, a chart its title and legend, a table its header and toolbar, across all four states. Users keep their bearings, and the geometry stays stable (CLS).
3. **One component renders its own skeleton.** The Suspense fallback is **the same component** with `status="loading"`, so the skeleton cannot drift from the real layout. That is 07's "mirror the final layout, never a spinner", made structural. Separate `KpiTile.Skeleton` exports are **rejected**: they duplicate layout and drift, as 07 itself warned about the Figma Skeleton shape variants.
4. **Zero JS for states in server-safe components.** States are props, mapped to `data-*`. CSS does the rest.

## C2. The contract

### C2.1 API, shared by every data-display component

The components are KpiTile, Metric, TrendCard, every chart, Table/DataTable, RankedList, List, Stat and Media.

```ts
export type DataStatus = 'ready' | 'loading' | 'empty' | 'error';

export interface DataStateProps {
  /** Data lifecycle. Default 'ready'. Collections derive 'empty' from data.length === 0 unless set. */
  status?: DataStatus;
  /** Content present but being refreshed (useTransition isPending, placeholderData). Keeps content, dims it. */
  pending?: boolean;
  /** Replaces the default empty region. `null` renders nothing. */
  empty?: React.ReactNode;
  /** Replaces the default error region (put a Retry button here; it is a client leaf). */
  error?: React.ReactNode;
}
```

**Precedence:** `error` > `loading` > `empty` > `ready`. `pending` combines only with `ready` or `empty`.

**Naming rule:** `status` is reserved for this lifecycle on data-display components. Domain states use domain names: `availability` (in stock / low / sold out), `publication` (active / draft / archived), `paymentStatus`, `fulfillmentStatus`. This changes the 05 sketches, where `ProductCard status` and `OrderRow status` become these names. It also matches 05's own finding that Product Card's Status axis "conflates publication with inventory".

### C2.2 Attributes added to the canonical vocabulary

| Attribute | Set when | Notes |
|---|---|---|
| `data-loading` | `status="loading"` | No content yet; the skeleton is shown |
| `data-pending` | `pending` (display components) or **Button `pending`** | Content or action in flight. Aligns with RAC Button's `data-pending` (source verified) and React's `isPending` |
| `data-empty` | Effective status is `empty` | Identity mapping with RAC ListBox's native `data-empty` (source verified) |
| `data-error` | `status="error"` | A *load* failure. Distinct from r3's `data-invalid` (validation) |
| `data-mirror` | `"rtl"` on directional glyphs (§A6.3) | – |
| `data-x-direction` | `"ltr" \| "rtl"` on a chart plot (§A6.4) | Chart-local: the resolved `xDirection`. The keyboard island reads it. |

All are presence attributes, matching r3's vocabulary style (`data-disabled`, `data-invalid`).

### C2.3 Accessibility

- **`aria-busy="true"`** goes on the component root while `loading` or `pending`. Screen-reader support is uneven: JAWS conveys `true`, while NVDA and VoiceOver reportedly don't (SECONDARY). So **`aria-busy` is never the only signal**.
- **The loading region contains static visually hidden text** ("Loading revenue"), **not** a live region. A user who reaches the tile hears its name and "loading".
  - **Change to 07's proposal:** a `role=status` inside every skeleton would announce N times on client-side transitions.
  - Live-region behaviour also varies by screen reader and browser (Roselli, Jan 2026, SECONDARY).
  - Page-level announcements ("Dashboard loaded") are the app's job, via `announce()` from `@nizivo/ui/announce` (client).
- **Skeleton blocks are `aria-hidden`.**
- **Widgets are named groups, not landmarks.** KpiTile, Metric, TrendCard and RankedList roots render `role="group"` with `aria-labelledby`, as 04 specified. A named `<section>` would turn every tile into a `region` landmark and flood the landmark list. Consumers who want a landmark pass `render={<section />}`.
- **Errors are not `role="alert"` by default.** A widget failing to load is not urgent. If an error follows a user action, the app announces it.
- **Empty states:**
  - The EmptyState title is a heading only at page level (`headingLevel` prop). Inside a card it renders as `<p>`, to avoid heading spam.
  - **Zero results after a query is not "empty".** DataTable and CommandMenu announce the result count politely ("No results for 'mug'", "{count} results") through `announce()`.
- **Button `pending`** follows RAC's semantics (source verified):
  - it stays focusable, with `aria-disabled="true"`
  - `type="submit"` becomes `button` while pending, which blocks implicit resubmission
  - `data-pending` is set
  - the visible label is unchanged, with a spinner in the leading-icon slot so width is preserved (02)

  Server-safe Button cannot announce. `SubmitButton` (client leaf, `@nizivo/ui/forms`) reads `useFormStatus().pending` and announces the state change **only when focused**, as RAC does.

### C2.4 Sketch: KpiTile (server-safe, zero JS)

`useId` is allowed in synchronous Server Components (S6, verified in the critique).

```tsx
export function KpiTile({
  label, value, format = 'compact', locale = 'en-US', delta, comparison, chart,
  status = 'ready', pending, empty, error, labels, render, className, ...rest
}: KpiTileProps) {
  const L = { ...kpiTileLabels, ...labels };
  const id = useId();
  const st: DataStatus = status === 'ready' && value == null ? 'empty' : status;
  // A named group, not a <section>: a <section> with a name becomes a region landmark, and a dashboard
  // would then expose a dozen of them. Use render={<section />} for page-level use.
  return renderElement('div', render, { status: st, pending: !!pending }, {
    ...rest,
    role: 'group',
    className: cx('nz-kpi-tile', className),
    'data-slot': 'kpi-tile',
    'data-loading': st === 'loading' ? '' : undefined,
    'data-empty': st === 'empty' ? '' : undefined,
    'data-error': st === 'error' ? '' : undefined,
    'data-pending': pending ? '' : undefined,
    'aria-busy': st === 'loading' || pending || undefined,
    'aria-labelledby': id,
    children: (
      <>
        <p id={id} className="nz-kpi-tile-label" data-slot="label">{label}</p>
        <div className="nz-kpi-tile-value-row" data-slot="value-row">
          {st === 'loading' ? (
            <>
              <span className="nz-skeleton nz-kpi-tile-value-skeleton" aria-hidden="true" />
              <span className="nz-visually-hidden">{formatLabel(locale, L.loading, { label: String(label) })}</span>
            </>
          ) : st === 'error' ? (
            error ?? <span className="nz-inline-error" data-slot="error">{formatLabel(locale, L.error, { label: String(label) })}</span>
          ) : st === 'empty' ? (
            empty ?? <span className="nz-kpi-tile-empty" data-slot="empty"><span aria-hidden="true">—</span><span className="nz-visually-hidden">{formatLabel(locale, L.noData)}</span></span>
          ) : (
            <>
              <NumberValue className="nz-kpi-tile-value" value={value!} format={format} locale={locale} />
              {chart /* element slot, e.g. <Sparkline …/>; core never imports charts (settled decision 6 / C13) */}
            </>
          )}
        </div>
        {st === 'ready' && delta != null && (
          <div className="nz-kpi-tile-footer" data-slot="footer">
            <Delta value={delta} locale={locale} comparison={comparison} />
          </div>
        )}
      </>
    ),
  });
}
```

```css
/* component layer; tokens per settled decision 5 */
.nz-kpi-tile-value-row { min-block-size: var(--nz-kpi-tile-value-min-block-size, 2.5rem); } /* identical box in every state */
.nz-kpi-tile-value-skeleton { inline-size: 8ch; block-size: var(--nz-line-height-numeric-kpi); font: var(--nz-font-numeric-kpi); } /* a token, not `1lh`, whose support was not checked against the floor */
.nz-kpi-tile[data-pending] .nz-kpi-tile-value-row { opacity: .6; transition: opacity var(--nz-duration-fast) var(--nz-easing-standard); }

.nz-skeleton {
  display: block; border-radius: var(--nz-radius-sm); background: var(--nz-bg-muted);
  animation: nz-skeleton-pulse var(--nz-duration-pulse, 1.6s) var(--nz-easing-standard) infinite alternate;
}
@media (prefers-reduced-motion: reduce) { .nz-skeleton { animation: none; } }
:root[data-nz-motion='reduce'] .nz-skeleton { animation: none; }          /* attribute name per C9 decision */
@media (forced-colors: active) { .nz-skeleton { background: GrayText; forced-color-adjust: none; } }
```

Notes on the CSS:
- The skeleton is sized by the component's own CSS (`1lh`, `ch`, tokens), never by inline style (§B1).
- `bg/muted` on `bg/surface` is only 1.15:1 (07), which is acceptable for a decorative block. The forced-colors rule keeps it visible.
- A shimmer variant, if design adds one, must flip its gradient under `:dir(rtl)` (§A6.1).

### C2.5 Coverage by component

| Component | loading | empty | error | pending |
|---|---|---|---|---|
| KpiTile / Metric / Stat | value-row skeleton; label stays | "—" plus SR "No data" | inline error in the value row | dims the value row |
| TrendCard (Revenue) | headline skeleton plus chart-shaped skeleton (axes and a flat path) | chart empty slot "No data for this period" | error slot; the period Select stays usable | dims the chart; period control keeps focus |
| Charts (`ChartFrame`) | gridlines plus a skeleton path or bars | derived from `data.length === 0` | error slot; the data-table toggle is hidden | dims; the client island stays mounted |
| Table / DataTable | N skeleton rows (`aria-hidden`) in `<tbody>`; the header stays real | one full-width `<td colspan>` row holding EmptyState. **No-results** is a separate message plus a "Clear filters" action slot | error row with the action slot | dims rows; pagination stays usable |
| RankedList / List | 5 skeleton rows | EmptyState (compact) | inline error | dims |
| Media / Image / ProductCard media | CSS placeholder background (`--nz-bg-muted`) with intrinsic size from `width`/`height` | – | **Server:** a broken image shows the box plus alt text, with no JS detection. **Client `Media`:** `onError` sets `data-error` and shows a `fallback` slot | – |
| Select / Combobox options | engine `loadingState`, mapped to `data-loading` on the list | `data-empty` plus `renderEmptyState` via the adapter | error item | – |
| CommandMenu | `data-loading` on results; announces "{count} results" | no-results message | error item | – |
| Upload | per-file progress (`<progress>`) | – | per-file error with retry action | – |
| Toast | `toast.promise(p, { loading, success, error })` updates one toast (07) | – | – | – |
| Button | – | – | – | `pending` |

### C2.6 Error and empty presentation

Figma has an Empty State but **no error component** (G9/G20). Add two core parts:

```tsx
<InlineError action={<RetryButton/>}>Couldn't load revenue</InlineError>   // server-safe; action is an element slot
<EmptyState media={<img …/>} title="No orders yet" headingLevel={2} actions={<Button>Share your store</Button>} />
```

`onRetry` function props are **rejected** in server-safe parts: they don't serialize. The retry control is the app's client element. In Next, it is the `reset()` from `error.tsx`.

## C3. Streaming SSR and Suspense: who owns what

| Concern | Library provides | App or framework provides |
|---|---|---|
| Fallback UI | `<X status="loading" …static props/>`, a zero-JS server render with identical geometry | `<Suspense fallback={…}>` placement |
| Boundary granularity | Docs guidance (below) | The boundaries themselves (`loading.tsx` = route level; component boundaries for dashboards) |
| Error UI | `InlineError`, `EmptyState`, the `error` slot | Error boundaries: Next `error.tsx` (client, `reset`), React Router 8 `ErrorBoundary` export, TanStack Start `errorComponent`, or `react-error-boundary` 6.1.6 in SPAs |
| Pending UI | `pending` plus `data-pending` | `useTransition` / `useDeferredValue` / query `placeholderData` |
| Island resilience | **Enhancement islands fail closed** (below) | – |
| Reveal timing | Nothing; never fight React's batching | React 19.2+ batches SSR Suspense reveals |

**React 19.2 reveal batching (PRIMARY).** "Starting in 19.2, React will batch reveals of server-rendered Suspense boundaries for a short time." React also stops batching "if the total page load time is approaching 2.5s" so that LCP is not hurt. So the library must **not** add its own minimum skeleton display time or artificial delays. On client fetches without Suspense, use `pending` (stale-while-revalidate) rather than flashing back to the skeleton.

**Boundary guidance (docs):**
- One boundary per **independently fetched** widget. Group widgets that share a query (a KPI row) behind one boundary, with a row of `status="loading"` tiles.
- Don't nest boundaries in a way that creates fetch waterfalls. Start fetches in parallel in the parent server component and pass promises down.
- Astro: `server:defer` islands with a `fallback` slot use the same `status="loading"` element.

```tsx
// Next 16 RSC — the fallback IS the component.
export default function Overview() {
  return (
    <DashboardGrid>
      <Suspense fallback={<KpiRow labels={['Revenue', 'Orders', 'AOV', 'Conversion']} status="loading" />}>
        <Kpis />                       {/* async server component → <KpiTile … value={…}/> ×4 */}
      </Suspense>
      <Suspense fallback={<TrendCard title="Total sales" status="loading" />}>
        <Sales range={range} />
      </Suspense>
    </DashboardGrid>
  );
}
```

```tsx
// Client fetching without Suspense (e.g. TanStack Query): status + pending, same component.
'use client';
const q = useQuery({ queryKey: ['revenue', range], queryFn, placeholderData: keepPreviousData });
<KpiTile
  label="Revenue"
  status={q.isPending ? 'loading' : q.isError ? 'error' : 'ready'}
  pending={q.isPlaceholderData}
  value={q.data?.value}
  error={<InlineError action={<Button onClick={() => q.refetch()}>Retry</Button>}>Couldn't load revenue</InlineError>}
/>
```

**Islands fail closed.** Enhancement-only islands, such as the chart crosshair (r6's 0.6 KB island), wrap themselves in a tiny internal boundary. If the island throws, it renders `null` and the server SVG stays.

```tsx
'use client';
class IslandBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: unknown) { if (process.env.NODE_ENV !== 'production') console.error('[nizivo] island failed', e); }
  render() { return this.state.failed ? null : this.props.children; }
}
```

## C4. Pending, transitions and optimistic UI

**React facts (PRIMARY, react.dev `useOptimistic`):**
- "The `set` function must be called inside an Action". Outside one, React warns and the state "will briefly render".
- "If the Action throws an error, the Transition still ends, and React renders with whatever `value` currently is." So a failure reverts implicitly, with no explicit rollback.

**Library obligations:**
1. **Every stateful part is controllable** (`value`/`checked`/`open` plus `on*Change(value, details)`, r8 §6.8) and renders purely from props in controlled mode. No internal state shadows the controlled value, because that would fight the optimistic value.
2. **Never disable controls during a transition.** Disabling drops focus, and screen-reader users lose their place. Use `pending` or `data-pending` for feedback.
3. **Optimistic collection items** (an added row or tag) render with `data-pending` on the row part, styled at reduced opacity and announced by the app.
4. **Forms.** `useActionState` errors flow to Field error slots (G11, separate research). `SubmitButton` reads `useFormStatus` as above.

```tsx
'use client';
function PublishedSwitch({ id, published }: { id: string; published: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(published);
  const [isPending, startTransition] = useTransition();
  return (
    <Switch
      checked={optimistic}
      data-pending={isPending ? '' : undefined}
      onCheckedChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          const r = await setPublished(id, next);          // server action
          if (!r.ok) toast.critical('Couldn't update product', { description: r.message });
        })}
    />
  );
}
```

```tsx
// Range switch keeps the old chart visible while the new range streams.
'use client';
const [isPending, startTransition] = useTransition();
<SegmentedControl value={range} onValueChange={(r) => startTransition(() => router.push(`?range=${r}`))} />
<TrendCard pending={isPending} … />
```

## C5. Tests for this contract

1. **The skeleton matches the layout (G20).** For each data-display story, render `status="loading"`, `"ready"` (fixture data), `"empty"` and `"error"` at three container widths (container queries). Assert the root's bounding box is equal within ±1 px across states. Assert the header and label parts are equal too. This runs in Vitest browser mode on PRs.
2. **CLS in the Next fixture.** The streamed overview page with artificially delayed boundaries has a layout-shift total of **0** (budget < 0.01), measured with `PerformanceObserver('layout-shift')`.
3. **A11y.** axe on all four states. The `aria-busy` root is present during loading and pending. There are no live regions inside skeletons. Empty-to-no-results announces exactly once.
4. **Motion.** Reduced motion means no skeleton animation (both the media query and the attribute). Forced colors keep skeleton blocks visible.
5. **RTL.** A shimmer (if added) runs in the inline direction. The empty-state layout mirrors.
6. **CSP.** All four states render violation-free under Profile B (§B1.3).

## C6. Asks for design

These extend G9 and go into the consolidated design backlog:
- An error state for KPI tile, chart, table and card, plus an `InlineError` component.
- The skeleton animation spec, and whether it is pulse or shimmer.
- A no-results variant distinct from Empty State.
- A pending (dimmed) treatment.
- A Toast loading/promise state.
- A Media failure fallback.
- An RTL review pass of the nav, drawer, tracker and charts with an Arabic-reading reviewer.
- Confirmation of the "charts don't mirror" default.

---

## D. Risks

1. **Engine inline styles under strict CSP.** RAC SSRs `VisuallyHidden` inline styles in Select, Checkbox, Switch, Slider and other parts. Under Profile B those parts are broken, not just degraded, unless they are rendered client-only. Mitigation: Profile A is the default, and B is guaranteed only for server-safe components. Track engine inline styles per release with a grep in CI (`style:` objects in engine modules the adapter imports).
2. **Hidden ICU drift.** Node and browsers disagree on some `Intl` output (reproduced for `formatRange`), and engines update ICU and CLDR on their own schedules. Mitigation: "format once", cross-engine snapshot tests, explicit `timeZone`.
3. **The RAC locale switch after hydration** if any RAC part escapes the adapter's `EngineLocale` wrapper. Mitigation: a conformance test that renders every RAC-backed root with `navigator.language = 'de-DE'` and asserts no post-hydration text change.
4. **Locale strings inflate consumer bundles by 4.8–13.4 KB gz** without `optimize-locales-plugin`. Mitigation: per-framework recipes, budgets measured with all locales, and the server-injected-strings recipe for Next and React Router.
5. **Direction disagreement** between `lang`, `dir` and RAC's locale-derived direction. Mitigation: docs plus a dev-only warning when `document.dir` and `dirOf(config.locale)` differ (checked once in an effect).
6. **The chart RTL default is contested.** Evidence is mixed (Material vs an Arabic newsroom study). Mitigation: the `xDirection` prop, and design and user confirmation with Arabic and Hebrew merchants.
7. **Trusted Types inside frameworks** (Next's own scripts) are UNVERIFIED. Mitigation: Report-Only first, with the fixture limited to Nizivo surfaces.
8. **Registry integrity** relies on Nizivo-side manifests. The shadcn CLI does not verify them (as far as found).
9. **Instagram terms.** Proxy versus store versus hotlink is a legal question. The library's neutrality keeps the risk with the app, but the storefront patterns (registry) must ship with a compliant default.
10. **`status` naming churn** in the commerce patterns (05) and the Button `loading`→`pending` rename. Both are cheap now and costly after 1.0.
11. **pnpm 12 key validation.** `trustPolicy` and `blockExoticSubdeps` are documented for 10.x/11.x. If 12.x rejects them, keep them in Renovate and CI scripts instead (UNVERIFIED).

## E. Open questions

1. Which locales does Neev's product actually need at launch? This decides which catalogues ship in v1 and the `optimize-locales` examples. **Is RTL a v1 requirement?** The plan works either way, but VRT cost applies only if it is.
2. Which licence wins, Apache-2.0 or MIT (C22)? Nothing in this report depends on it.
3. Do Meta's Platform Terms allow storing Instagram media? This needs legal review (§B7).
4. Profile B scope: do any Neev products require `style-src-attr 'none'`? If not, Profile B can stay "best effort" for v1.
5. Design confirmation is needed for the chart RTL default, the shopping-cart mirroring, and the tab-label truncation rule.
6. Does `pnpm sbom` emit licence fields? Do `trustPolicy` and `blockExoticSubdeps` validate under pnpm 12.11.2? Both are day-1 checks.
7. Firefox 157 results for §B1.1 still need a run outside this sandbox. The CSP Level 3 spec and MDN predict the same behaviour.

## F. Evidence produced in this session

All paths are under `scratchpad/gapb/`.

| Artifact | What it shows |
|---|---|
| `csp-test/` (`server.mjs`, `src/App.jsx`, `src/client.jsx`, `run.mjs`, `results.json`, `results2.json`) | §B1.1 matrix, with React 19.3 SSR plus hydration under 4 CSPs in Chromium 156 and WebKit 27.2 |
| `csp-test/intl-cmp.mjs` | Node vs Chromium vs WebKit `Intl` output (the `formatRange` mismatch) |
| `scripts/intl.mjs` | §A4 table (Node 24.16, ICU 78.3, CLDR 48.0) and the direction helper check |
| `scripts/locmeasure.mjs` | RAC locale-string cost (§A9) |
| `scripts/msgsize.mjs` | FormatJS 9.65 vs MF2 7.42 vs the mini formatter 0.21 KB gz |
| `scripts/wf.mjs` + `dl-wf/` (web-features 3.42.0) | Baseline status for `:dir()`, logical properties, Trusted Types, Intl.Locale info, Temporal, typed `attr()` and others |
| Source reads in `bench/deps/node_modules/react-aria/dist/private/` | `utils/getNonce.mjs`, `utils/getMetaValue.mjs`, `interactions/usePress.mjs`, `overlays/usePreventScroll.mjs`, `visually-hidden/VisuallyHidden.mjs`, `i18n/useDefaultLocale.mjs`, `i18n/server.mjs`; also `react-aria-components/dist/private/{Button,ListBox}.mjs` |
| `dl-olp/` | `@react-aria/optimize-locales-plugin` 2.1.0: Apache-2.0 LICENSE, no `license` field |

## G. Sources

**React and frameworks**
- React 19.3 release: https://react.dev/blog/2026/09/09/react-19-3
- React releases on GitHub: https://github.com/react/react/releases
- React DOM common components (`dangerouslySetInnerHTML` and TrustedHTML): https://react.dev/reference/react-dom/components/common
- React 19.2 release (SSR Suspense batching): https://react.dev/blog/2025/10/01/react-19-2
- `useOptimistic`: https://react.dev/reference/react/useOptimistic
- Next.js CSP guide: https://nextjs.org/docs/app/guides/content-security-policy

**React Aria and Base UI**
- React Aria frameworks guide (locale matching, optimize-locales, CSP nonce meta): https://react-aria.adobe.com/frameworks
- React Aria `I18nProvider`: https://react-aria.adobe.com/I18nProvider
- Base UI `CSPProvider`: https://base-ui.com/react/utils/csp-provider

**CSP**
- MDN `style-src`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src
- MDN `style-src-attr`: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/style-src-attr

**Baseline data**
- web-features 3.42.0: https://www.npmjs.com/package/web-features

**RTL and bidirectionality**
- Material M1 bidirectionality: https://m1.material.io/usability/bidirectionality.html
- Material M2 bidirectionality: https://m2.material.io/design/usability/bidirectionality.html
- Wikimedia Codex bidirectionality: https://doc.wikimedia.org/codex/main/style-guide/bidirectionality.html
- Amsterdam Design System assets (undo/redo mirroring note): https://cdn.jsdelivr.net/npm/@amsterdam/design-system-assets@2.5.0/CONTRIBUTING.md
- Android `Icons.AutoMirrored`: https://developer.android.com/reference/kotlin/androidx/compose/material/icons/Icons.AutoMirrored
- IEEE VIS 2024, design patterns in RTL visualisations: https://aa.ieeevis.org/year/2024/program/paper_v-short-1078.html
- Gorelik, x-axis direction in RTL languages: https://gorelik.net/2019/05/19/x-axis-direction-in-right-to-left-languages-part-two
- Syncfusion RTL charts: https://help.syncfusion.com/flutter/cartesian-charts/right-to-left
- AG Charts RTL: https://ag-grid.com/charts/react/rtl/

**Screen-reader support**
- aria-busy support: https://digitala11y.com/?p=1809
- Adrian Roselli, live region support (Jan 2026): https://adrianroselli.com/2026/01/live-region-support.html

**Message formats**
- Unicode MF2 stable (CLDR 47): http://blog.unicode.org/2025/03/unicode-cldr-47-release-messageformat-2.html
- TC39 `Intl.MessageFormat` proposal: https://github.com/tc39/proposal-intl-messageformat
- Locize on MF2 (May 2026): https://www.locize.com/blog/messageformat-2-i18next/

**Browser auto-translate**
- react-i18next `transWrapTextNodes`: https://react.i18next.com/latest/trans-component
- Handling Google Translate in React: https://dev.to/ivanturashov/preventing-react-crashes-handling-google-translate-5bi0

**shadcn registry**
- registry-item.json: https://ui.shadcn.com/docs/registry/registry-item-json
- Registry include and validate (May 2026): https://ui.shadcn.com/docs/changelog/2026-05-registry-include
- CLI v4 (March 2026): https://ui.shadcn.com/docs/changelog/2026-03-cli-v4

**pnpm and npm**
- `pnpm sbom`: https://pnpm.io/cli/sbom
- `pnpm licenses`: https://pnpm.io/cli/licenses
- pnpm settings: https://pnpm.io/settings
- pnpm supply-chain security: https://pnpm.io/supply-chain-security
- `npm sbom`: https://docs.npmjs.com/cli/v9/commands/npm-sbom/
- Staged publishing and install-time controls (May 2026): https://github.blog/changelog/2026-05-22-staged-publishing-and-new-install-time-controls-for-npm/
- npm CLI changelog: https://github.com/npm/cli/blob/latest/CHANGELOG.md

**GitHub Actions**
- `actions/attest`: https://github.com/actions/attest
- `dependency-review-action`: https://github.com/actions/dependency-review-action

**Instagram and privacy**
- Instagram Media reference: https://developers.facebook.com/docs/instagram-platform/reference/instagram-media
- CM.com Instagram messaging (storage guidance): https://developers.cm.com/messaging/docs/instagram-messaging-inbound
- Signed-URL expiry measurement: https://github.com/denchen/instagram-download-browser-extension/pull/34
- LG München Google Fonts ruling: https://www.activemind.legal/guides/ruling-google-fonts/

**Registry metadata (queried 2026-10-14)**
- https://registry.npmjs.org/ for: intl-messageformat 12.1.3, messageformat 4.1.0, @formatjs/intl 6.1.3, react-intl 12.1.4, next-intl 4.14.9, @lingui/core 6.9.1, @inlang/paraglide-js 2.27.0, i18next 26.4.4, stylelint 17.16.0, stylelint-use-logical 2.1.3, @cyclonedx/cdxgen 12.8.5, @cyclonedx/cyclonedx-npm 6.0.1, react-error-boundary 6.1.6, pseudo-localization 3.1.3, @react-aria/optimize-locales-plugin 2.1.0, @internationalized/date 3.12.4, client-only 0.0.1, lucide-static 1.56.0, simple-icons 16.35.0
