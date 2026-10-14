# Week 2 results

Recorded on 2026-10-14 at week 2 integration and re-measured after the review fixes (ARCHITECTURE.md §21.1 W2; exit criteria 3 and 7, §17.2 budgets). Not packed: `files` is `dist` and `THIRD_PARTY_NOTICES`.

## Contrast matrix

Source: `packages/tokens/CONTRAST.md`, generated from the built `tokens.css` by `pnpm tokens:contrast`. `pnpm build` of `@nizivo/tokens` fails when a pair misses its threshold.

- **29 checked pairs per theme, 58 in all, pass** (per theme: 13 text at 4.5:1, 15 non-text at 3:1 and 1 focus at 3:1). No failures.
- The review pass added the backgrounds week 2 components paint on: every progress fill on `chart-track` (`chart-primary`, `icon-success`, `chart-warning`, `chart-critical`, and `icon-secondary` for the neutral tone), Alert's text, icons and focus outline on the four `bg-*-subtle` tints, and `text-primary` on `bg-pressed`. `chart-neutral` measured 1.36:1 (light) and 1.41:1 (dark) on the track, so the neutral fill of ProgressBar, Meter and ProgressRing now reads `icon-secondary` (3.75:1 and 5.32:1). The lowest new ratio is dark `chart-critical` on `chart-track`, 3.10.
- 4 rows per theme are reported only: `border-default`, `border-subtle` and `border-strong` (decorative) and `text-disabled`.
- Lowest checked ratios: light `border-control` 3.10 on `bg-muted`; dark `chart-critical` 3.10 on `chart-track` and `border-control` 3.12 on `bg-hover`; dark `text-critical` 4.61 and `text-info` 4.64 on `bg-hover` and `bg-muted`.
- **14 overrides** (4 light, 10 dark) and **19 proposals**, all expiring 2027-01-31. Without the overrides the §15.2 failures return (a test checks this). Exit criterion 7 also needs each override on the Deviations page (W5).

## Emitted CSS against the real tokens

`scripts/build-css.ts` compiles 24 stylesheets (23 components and `base.css`) with Lightning CSS and checks what it writes against `@nizivo/tokens/dist/tokens.css`. Every `var(--nz-*)` read is a token (425 reads), a runtime variable or a hook of the file's own component read with a fallback (95 hooks). No read names a missing token, and no shipped file declares a public `--nz-*` name. Text, Heading and Grid read token families (`--nz-text-*`, `--nz-grid-*`) and have no hooks.

## Stylesheet sizes

Bytes of the integration build's `dist/`. Raw is `wc -c`; gzip is `gzip -c <file> | wc -c` (Apple gzip 487.0.1, default level). The §17.2 target is ≤ 2 KB gzip per leaf file; budgets are set at first build + 10% when `size-limit` lands (W5).

| File                              |    Raw |  Gzip |
| --------------------------------- | -----: | ----: |
| `@nizivo/tokens/tokens.css`       | 22,624 | 3,958 |
| `@nizivo/tokens/tailwind.css`     |  4,465 |   782 |
| `@nizivo/tokens/custom-media.css` |    209 |   184 |
| `css/base.css`                    |  2,170 |   759 |
| `css/alert.css`                   |  2,336 |   746 |
| `css/badge.css`                   |  1,719 |   527 |
| `css/button.css`                  |  4,168 | 1,013 |
| `css/card.css`                    |  1,611 |   603 |
| `css/container.css`               |    316 |   198 |
| `css/delta.css`                   |  1,135 |   466 |
| `css/dialog.css`                  |  1,437 |   577 |
| `css/empty-state.css`             |  1,076 |   493 |
| `css/grid.css`                    |  3,486 |   543 |
| `css/heading.css`                 |  2,030 |   410 |
| `css/image.css`                   |    450 |   250 |
| `css/inline-error.css`            |    585 |   289 |
| `css/inline.css`                  |  1,155 |   285 |
| `css/kbd.css`                     |    819 |   386 |
| `css/meter.css`                   |  2,447 |   678 |
| `css/progress-bar.css`            |  2,708 |   837 |
| `css/progress-ring.css`           |  1,586 |   545 |
| `css/select.css`                  |  2,244 |   791 |
| `css/separator.css`               |    484 |   276 |
| `css/skeleton.css`                |    854 |   377 |
| `css/stack.css`                   |  1,109 |   280 |
| `css/text.css`                    |  3,814 |   598 |
| `css/tooltip.css`                 |    751 |   379 |

Every leaf file is under the 2 KB gzip target; the largest is `button.css` at 1,013 bytes. The 24 `@nizivo/react` stylesheets total 40,490 bytes raw and 6,236 bytes gzip when concatenated.
