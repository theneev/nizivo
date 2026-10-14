# @nizivo/icons

Every [Lucide](https://lucide.dev) icon as a React component, drawn at the Nizivo stroke, plus brand glyphs. No runtime dependency, no `'use client'`: icons render in Server Components with zero client JavaScript.

```tsx
import { Calendar } from '@nizivo/icons/calendar'; // one module
import { Bell, Search } from '@nizivo/icons'; // the root barrel tree-shakes to the same bytes
import { Instagram } from '@nizivo/icons/brands/instagram';

<Button leadingIcon={<Calendar />}>Period</Button>   // fills the slot: size is 1em
<Bell size={20} />                                   // a standalone 20 px icon
<Search label="Search" />                            // role="img", aria-label="Search"
```

| Prop                  | Default |                                                                                    |
| --------------------- | ------- | ---------------------------------------------------------------------------------- |
| `size`                | `'1em'` | Width and height; any CSS length or a number of pixels.                            |
| `strokeWidth`         | `1.92`  | On the 24 viewBox: 1.6 px at 20 px, 1.28 px at 16 px, as Figma draws.              |
| `absoluteStrokeWidth` | `false` | Keep `strokeWidth` in CSS pixels at every size (`vector-effect`).                  |
| `label`               | none    | The accessible name. Without it the icon is `aria-hidden`.                         |
| `mirror`              | `true`  | Directional icons (`mirror.json`) carry `data-mirror="rtl"`; `false` opts one out. |

Every other SVG prop, `className` and `ref` pass through to the `<svg>`; consumer props win. Colour is `currentColor`.

An empty or blank `label` names nothing, so the icon stays `aria-hidden`; a `<title>` child is not a name either. In running text an icon sits on the baseline, like an image; centre it on the text with `vertical-align: -0.125em` or place it in a flex row. The Nizivo icon slots (Button, IconButton, Select, Menu, Tabs) are flex rows already.

The right-to-left flip of a directional icon is CSS: `@nizivo/react/css/base.css` carries `:dir(rtl) [data-mirror='rtl'] { scale: -1 1; }`. Without `@nizivo/react`, add that rule yourself.

Subpaths are the Lucide names in kebab-case (`@nizivo/icons/arrow-left`); exports are their PascalCase forms (`ArrowLeft`). Brand glyphs are only at `@nizivo/icons/brands/<name>`. The Instagram glyph is for "Connect" or "Follow on Instagram" links only, per Instagram's brand guidelines.

Icons are generated from pinned `lucide-static` and `simple-icons` by `scripts/generate.ts` (see `docs/ARCHITECTURE.md` §14.2). Licences of the drawings: `THIRD_PARTY_NOTICES`.
