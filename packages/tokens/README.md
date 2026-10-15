# @nizivo/tokens

The design tokens of the Nizivo design system, framework-neutral: CSS custom properties with light and dark themes, plus the same values as JSON and as typed references for JavaScript. No runtime dependencies. [`@nizivo/react`](https://www.npmjs.com/package/@nizivo/react) is styled entirely by these tokens, and the two always release at the same version.

**Pre-release.** 0.x versions go to the `next` dist-tag, and a minor release may break (with a `BREAKING` note in the changelog).

## Install

```sh
pnpm add @nizivo/tokens@next
```

ESM only. Browser support floor: Chrome and Edge 123, Firefox 129, Safari and iOS 17.5 (the themes use `light-dark()`).

## What is in it

| Import                            | What it is                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `@nizivo/tokens/tokens.css`       | Every token as a `--nz-*` custom property, the theme scopes and the accessibility overrides. Import it once                  |
| `@nizivo/tokens/custom-media.css` | The breakpoints as `@custom-media` rules, for a build that supports them (Lightning CSS, PostCSS)                            |
| `@nizivo/tokens/tailwind.css`     | Tailwind CSS v4 `@theme inline` adapter: utilities such as `bg-nz-bg-surface` and `rounded-nz-lg`, each a `var()` of a token |
| `@nizivo/tokens/tokens.json`      | Every token's literal value per theme and mode, for charts, canvas, email or native renderers                                |
| `@nizivo/tokens/contract.json`    | The CSS contract: the layer order, the breakpoints, and every variable with its token id and type                            |
| `@nizivo/tokens`                  | Typed `var()` references (`color`, `space`, `radius`, `font`, …), plus `breakpoints` and `springs`                           |

## Use

Import the CSS once, at the root of your app, before any component stylesheet:

```ts
import '@nizivo/tokens/tokens.css';
```

With `@nizivo/react`, follow its CSS import rule: `tokens.css`, then `@nizivo/react/css/base.css`, then one stylesheet per component. `tokens.css` is the only source of token CSS.

Then read the tokens from CSS, or through the typed references:

```css
.panel {
  background: var(--nz-bg-surface);
  color: var(--nz-text-primary);
  border-radius: var(--nz-radius-lg);
}
```

```tsx
import { color, space } from '@nizivo/tokens';

<div style={{ background: color.bgSurface, padding: space['4'] }} />; // "var(--nz-bg-surface)", …
```

## Theme

Light by default. Set `data-nz-theme` on `<html>` (or any element, for a nested scope) to `system` (follows the operating system, with no script and no flash), `light` or `dark`. Write theme-aware colours as custom properties, as above, so nested scopes resolve correctly.

## Documentation

The docs site is coming. Until then:

- [The plan](https://github.com/theneev/nizivo/blob/main/docs/ARCHITECTURE.md): §7 (tokens, naming, the theme mechanism and the Tailwind adapter).
- [`tokens.json` and the typed references](https://github.com/theneev/nizivo/blob/main/packages/tokens/TOKENS-JSON.md).

## Licence

Apache-2.0. Copyright 2026 Neev Technologies.
