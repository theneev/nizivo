# @nizivo/react

Accessible React components for the Nizivo design system. Server Components by default: only the interactive leaves are `'use client'`, so a page that renders a Button, a Card or a Field with a native control ships no Nizivo JavaScript. The styling is plain CSS that reads the tokens of [`@nizivo/tokens`](https://www.npmjs.com/package/@nizivo/tokens).

**Pre-release.** 0.x versions go to the `next` dist-tag, and a minor release may break (with a `BREAKING` note in the changelog).

## Install

```sh
pnpm add @nizivo/react@next @nizivo/tokens@next
```

- Peers: `react` and `react-dom` `^19.2.0` (`@types/react` `^19.2.0` is optional).
- ESM only, no CommonJS build. Node `>=22.12` can still `require()` it.
- Install `@nizivo/tokens` as a direct dependency too: your CSS imports its `tokens.css`. The two always release at the same version.
- Browser support floor: Chrome and Edge 123, Firefox 129, Safari and iOS 17.5.

## Import the CSS once

The JavaScript never imports CSS. In your root layout (or global stylesheet), import, in this order:

1. `@nizivo/tokens/tokens.css`, the only source of token CSS;
2. `@nizivo/react/css/base.css`, the shared accessibility floor (the focus ring and forced-colours rules of every control);
3. one `@nizivo/react/css/<name>.css` per component you use.

```tsx
// app/layout.tsx
import '@nizivo/tokens/tokens.css';
import '@nizivo/react/css/base.css';
import '@nizivo/react/css/button.css';
import '@nizivo/react/css/field.css';
import '@nizivo/react/css/input.css';
```

Every stylesheet starts with the same `@layer` statement, so the order a bundler emits them in never changes which rule wins. A single `@nizivo/react/styles.css` with everything is planned but not in the package yet; once it ships, import **either** it **or** the files above, never both. With Tailwind CSS v4, import the same files inside `layer(components)` and add `@nizivo/tokens/tailwind.css`.

Keep `light-dark()` intact, or nested theme scopes and inverse surfaces stop following their own theme:

- **Next.js with Turbopack:** set your browser targets to the support floor (a `browserslist` of `chrome >= 123`, `edge >= 123`, `firefox >= 129`, `safari >= 17.5`, `ios_saf >= 17.5`).
- **Vite 8:** set `build.cssTarget` to `['chrome123', 'edge123', 'firefox129', 'safari17.5', 'ios17.5']`. A `browserslist` is not enough; without `cssTarget` a plain build lowers every `light-dark()` value.
- **Astro 7.3:** nothing to set.

## Use

```tsx
import { Button } from '@nizivo/react/button';
import { Field } from '@nizivo/react/field';
import { Input } from '@nizivo/react/input';

export default function NewProduct() {
  return (
    <form>
      <Field label="Product title" description="Shown on product pages and checkout." required>
        <Input name="title" placeholder="e.g. Stoneware mug" />
      </Field>
      <Button variant="primary" type="submit">
        Save
      </Button>
    </form>
  );
}
```

Each component has its own subpath (`@nizivo/react/<name>`, kebab-case) and its own stylesheet (`@nizivo/react/css/<name>.css`). The root `@nizivo/react` barrel exports the same components.

Compound components are namespaces, and the interactive ones (Select, Dialog, Tooltip, Menu, Tabs) run on React Aria. A Server Component can render them as they are:

```tsx
import { Select } from '@nizivo/react/select';

<Select.Root defaultValue="30d" name="period" aria-label="Period">
  <Select.Trigger />
  <Select.Popup>
    <Select.Item value="7d">Last 7 days</Select.Item>
    <Select.Item value="30d">Last 30 days</Select.Item>
  </Select.Popup>
</Select.Root>;
```

## Theme

Light by default. Set `data-nz-theme` on `<html>` to `system` (follows the operating system, no script, no flash), `light` or `dark`. Any element with `data-nz-theme` starts a nested scope.

## Components in 0.1

Text, Heading, Stack, Inline, Grid, Container, Separator; Button, IconButton; Badge, Card, Delta, ProgressBar, ProgressRing, Meter, Skeleton, EmptyState, InlineError, Alert, Kbd, Image; Field, Fieldset, Input, Textarea, Checkbox, RadioGroup, Switch, SegmentedControl, Select, NativeSelect; Tooltip, Dialog, Menu, Tabs, TabNav; ThemeScript and NizivoConfig.

## Documentation

The docs site is coming. Until then:

- [Getting started for Next.js, Vite and Astro, and the Tailwind recipe](https://github.com/theneev/nizivo/tree/main/apps/docs/content/docs/getting-started) (the docs site's source).
- [The plan](https://github.com/theneev/nizivo/blob/main/docs/ARCHITECTURE.md): §5 (packages, exports and the CSS import rule), §11 (framework setup), §12 (overlays), §16.4 (RTL).

## Licence

Apache-2.0. Copyright 2026 Neev Technologies. The icon drawings inlined into some components come from Lucide (ISC): see `THIRD_PARTY_NOTICES`.
