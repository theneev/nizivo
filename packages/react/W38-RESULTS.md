# Week 38 results (v0.5's docs parts, v0.6: marketing)

Recorded on 2026-10-28, overnight, under M77 (ARCHITECTURE.md §21.3 "Week 38 status", §21.4a,
§23.4 D-do, D-dp). Every number below comes from a command run on the maintainer's Mac. Everything
is under `@nizivo/react/unstable/<name>` and unreviewed.

## What was built

| Batch   | Parts                                                                   | Tier          | Changeset              |
| ------- | ----------------------------------------------------------------------- | ------------- | ---------------------- |
| v0.5, 4 | Link, DocsCard, CopyButton, CodeBlock                                   | server/client | `docs-site-parts.md`   |
| v0.6, 1 | AnnouncementBar, SectionHeader, FeatureCard, StatBlock, TestimonialCard | server        | `marketing-parts.md`   |
| v0.6, 2 | CtaBand, SiteFooter, NewsletterSignup                                   | server/client | `marketing-parts-2.md` |
| v0.6, 3 | BentoTile, SiteNavbar                                                   | server        | `marketing-parts-3.md` |

- **Link:** underlined in text/brand, never colour alone; `external` opens a new tab, shows the
  arrow and reads "(opens in a new tab)".
- **CopyButton:** copies, reads "Copied" for 2 seconds in a polite region, its name staying "Copy";
  a refused clipboard claims nothing (`onCopyFailed`).
- **CodeBlock:** versions are the kit's Tabs, drawn as pills on the dark code surface; Copy copies
  the shown one, never the "$"; code never wraps, and takes focus so a keyboard can scroll it.
- **AnnouncementBar** is a named region with a named close button; **SectionHeader** an h2 and a
  line; **FeatureCard** an h3, plain, tinted or inverse; **StatBlock** a `<dt>` and `<dd>` for a
  `<dl>`; **TestimonialCard** a figure with a blockquote and caption.
- **CtaBand** is dark in both themes (bg/code with text/on-dark); **SiteFooter**'s columns are navs
  named by their headings; **NewsletterSignup** is a real form with a visible label, the browser's
  validation shown inline by Field and an announced success; **BentoTile** keeps text on a frosted
  card (opaque without blur or with reduced transparency); **SiteNavbar** folds its links into a
  native `<details>` menu below 768 px, so it needs no script.
- **Shaders:** the CTA Band's Aurora Dark and the Bento Tile's Aurora are CSS gradients, with a
  `background` slot, until `@nizivo/lab` (§14.5), as VoiceOrb and ProfileCard do.
- **Glyphs:** copy, quote, menu (Lucide), arrow-up-right (Feather-derived). THIRD_PARTY_NOTICES
  lists 38.
- **Not built:** the Docs Header (16), which is the docs app's own; the AI assistant panel (week 36);
  page 12's shaders, which wait for `@nizivo/lab`.

## Then: page 12's CSS motion parts (D-dq)

Ticker, CaretHeadline and LivePulse (server) and WordRotator (client), changeset `motion-parts.md`.
D-dq splits page 12: its shaders stay with `@nizivo/lab`, its plain-CSS loops come here. Every loop
runs on `--nz-duration-pulse` (0 under Reduced motion) and stops under the media query or
`data-nz-motion="reduce"`; the Ticker pauses under the pointer or focus and hides its copy from
assistive technology; WordRotator gives a screen reader every word once, as a list. Skeleton
Shimmer and Toast Enter already exist as Skeleton and Toast. `motion-parts.spec.tsx` (5 cases)
passes in the three engines; 16 new baselines, stable on three reruns.

## Where they differ from Figma

- The SiteFooter's legal row is text/secondary, where Figma draws text/tertiary (under AA).
- CtaBand's example puts its primary action in an Accent Button, as Figma's CTA Band asks; Figma's
  Button page reserves Accent for AI. One of the two needs changing (see the lime question).

## Sizes

New entries at measured + 10 %. `./locales/en-US` rose again, to 1.8 KiB (M77): every unstable part
with strings adds to it. Worth deciding: keep unstable parts' strings in the main catalogue, or give
them their own (`./locales/en-US/unstable`), so stable apps do not carry them.

## Checks

- `pnpm check` passes after each batch; `pnpm gate` passed on each, the last still running when
  this was written (see the hand-back).
- Browser specs: `docs-parts.spec.tsx` (4) and `marketing.spec.tsx` (6), passing in Chromium,
  Firefox and WebKit.
- The visual lane: 356 new baselines, stable on reruns of their own parts; no existing baseline
  moved.
- **Fixed: the full visual lane failed on CodeBlock and CopyButton.** 32 shots (dark and forced
  modes, about 850 px each) differed whenever they ran after BentoTile in the same page, as the full
  lane runs them. The cause was not BentoTile: any shot taller than the 720 px viewport (BentoTile,
  FeatureCard, VoiceOrb, Image) went through Playwright's full-page capture, and after one of those
  the page drew CodeBlock's code text without macOS font smoothing, thinner, for the rest of the
  run (`--only feature-card,code-block` failed the same way). Setting the viewport back did not undo
  it. The harness now grows the viewport to hold a tall shot, takes an ordinary screenshot and
  shrinks it again (`shot` in `scripts/visual/run.ts`). The full lane then passes: 4,888 shots, 4,706
  identical and 182 within the tolerance; charts 204, 196 and 8. No baseline was re-recorded.
- **Flake seen:** Combobox `states--open-key-combobox-trigger-0--forced` (18 px) and
  `states--open-combobox-trigger-0--forced` (7 px), the input's blinking text caret, about one run
  in two or three; an existing baseline, not re-recorded.
