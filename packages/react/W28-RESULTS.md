# Week 28 results (v0.3 week 6: hotkeys and the unstable CommandMenu)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 28 status", §23.3 M72, §23.4 D-dh and D-di).
The CommandMenu follows Figma's Command Menu 755:889 (`docs/figma/15-v03-weeks-3-6.md`). Every number
below comes from a command run on the maintainer's Mac.

## What was built

- **Hotkeys (D-dh)**, `@nizivo/react/hotkeys`, stable (M72): `registerHotkey`, `useHotkey`,
  `useHotkeys` and `toTinykeys`. One page-wide registry with no provider, over tinykeys 4.0.1 (MIT,
  no dependencies), a new runtime dependency. Shortcuts are written as Kbd takes them (`"mod+k"`).
  Nothing fires during an IME composition or while typing in a field (unless `allowInInputs`); a
  single printable key warns in development (WCAG 2.1.4). Changeset: `.changeset/hotkeys.md`.
- **CommandMenu (D-di)**, `@nizivo/react/unstable/command-menu`: the Dialog holding React Aria's
  Autocomplete, a search field over groups of rows filtered as the reader types (case and accents
  ignored); ⌘K (Ctrl+K elsewhere) or `CommandMenu.Trigger` opens it; the arrow keys move the active
  row with focus kept in the field; Enter runs it and closes; Escape clears the search, then closes.
  Rows are links or actions with an icon, a kind and a shortcut. Changeset:
  `.changeset/command-menu.md`.
- **Not yet (unstable):** async sources, a cap per group, virtualisation, a spoken result count,
  the lazy chunk (M72).
- **Tooling:** the five app fixtures' lockfiles take tinykeys; the visual lane shoots a component
  that composes the Dialog open; the locale drift test groups `src/unstable/<name>` as its own
  folder; the docs smoke allows the menu's page its Dialog.
- **Docs:** the CommandMenu page; `./hotkeys` as a utility page from its API; 78 rows in the Static
  or interactive guide.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                          |   Before |    After | Limit   |
| ------------------------------ | -------: | -------: | ------- |
| `./hotkeys`                    |        — |  1,572 B | 1.7 KiB |
| own: `hotkeys.client`          |        — |    748 B | 0.9 KiB |
| `./unstable/command-menu`      |        — | 58,773 B | 64 KiB  |
| own: `command-menu.client`     |        — |  1,526 B | 1.7 KiB |
| own: `_engines/…/command-menu` |        — |    616 B | 0.7 KiB |
| `css/command-menu.css`         |        — |    860 B | 1 KiB   |
| `./locales/en-US`              |    873 B |    918 B | 1 KiB   |
| `styles.css`                   | 25,835 B | 25,856 B | 26 KiB  |

`./hotkeys` meets §17.2's ≤ 2 KB. The menu's subpath includes the Dialog and React Aria's
Autocomplete; the plan's lazy chunk (+4.7 KB over the dashboard set) waits until it leaves
`unstable/` (M72).

## Lanes (the maintainer's Mac)

All 25 release lanes passed on the first run of the week's code, the five app fixtures with
tinykeys in their refreshed lockfiles. Visual regression: react 3,764 shots (3,612 identical, 152
within the tolerance), with the 24 new baselines; charts 204 (196 and 8). No existing baseline
moved.

- The CommandMenu and hotkeys browser spec: 9 of 9 in Chromium, Firefox and WebKit.
- The docs smoke: 140 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **For Dayitava:** the open renders are the new baselines (`command-menu/*--open-*`). Figma draws
   no group headings, so they are Select's group label; the row radius is 10 px (`radius/sm` ×
   1.25, no token). Kbd hints read Ctrl in the renders because the lane sets no Apple platform.
2. **Where it opens:** in the middle of the page, as the Dialog does; command palettes often sit
   higher. Figma does not place it.
3. **Unstable until:** async sources, a per-group cap, a spoken result count and the lazy chunk.

## Unverified

- Screen readers: React Aria's virtual focus announcements were not heard.
- IME composition was checked with a synthetic `isComposing` event, not a real input method.
