# Week 25 results (v0.3 week 3: DataView, Surface glass, PointerFx)

Recorded on 2026-10-27 (ARCHITECTURE.md §21.3 "Week 25 status", §23.3 M67 to M69, §23.4 D-db to
D-dd). Before building, every remaining v0.3 component was looked up in Figma; the read is in
`docs/figma/15-v03-weeks-3-6.md`. Every number below comes from a command run on the maintainer's
Mac.

## What was built

- **DataView (D-db).** The same records as a table and as a list; a container query on the root
  shows the table from 40rem of its own width and the list below, the other `display: none`. List
  rows follow Figma's Order List Item 764:3483; `interactive` rows have a stretched
  `DataView.ItemLink`, as `Table.Row`. Server parts. Changeset: `.changeset/data-view.md`.
- **Surface (D-dc).** A bg/surface panel; `material="glass"` is Figma's Surface/Glass: bg/surface at
  72 % over a 24 px backdrop blur with Elevation/3's shadow, opaque without `backdrop-filter`
  (Safari before 18), under `prefers-reduced-transparency: reduce` and in forced colours. Server
  part. Changeset: `.changeset/surface.md`.
- **PointerFx and usePointerFx (D-dd).** At `./pointer-fx` (M69): a tilt toward a mouse pointer with a lift,
  or a magnetic lean, from `--nz-pointer-x` and `--nz-pointer-y` written once per frame. Touch, pen
  and reduced motion leave the element still; the server renders only `data-pointer-fx`.
  Changeset: `.changeset/pointer-fx.md`.
- **Contracts:** two runtime variables (`--nz-pointer-x`, `--nz-pointer-y`) and two vocabulary
  attributes (`data-material`, `data-pointer-fx`).
- **Docs:** three pages (DataView, Surface, PointerFx), 76 rows in the Static or interactive guide.

## Sizes

gzip, size-limit (`packages/react/SIZES.md`). New entries start at measured + 10 %.

| Entry                         |    Before |     After | Limit   |
| ----------------------------- | --------: | --------: | ------- |
| `@nizivo/react` (root barrel) | 133,977 B | 134,591 B | 143 KiB |
| `styles.css`                  |  25,295 B |  25,805 B | 26 KiB  |
| `css/base.css`                |   1,296 B |   1,307 B | 1.4 KiB |
| `./data-view`                 |         — |     980 B | 1.1 KiB |
| `./surface`                   |         — |     714 B | 0.8 KiB |
| `./pointer-fx`                |         — |   1,107 B | 1.2 KiB |
| own: `pointer-fx.client`      |         — |     586 B | 0.7 KiB |
| `css/data-view.css`           |         — |     570 B | 0.7 KiB |
| `css/surface.css`             |         — |     384 B | 0.5 KiB |
| `css/pointer-fx.css`          |         — |     299 B | 0.4 KiB |

No limit moved; `./motion` and `css/motion.css` are unchanged (1,573 B and 192 B). `styles.css` has
819 B left under 26 KiB; the next sheet past it resets under M66.

## Lanes (the maintainer's Mac)

All 25 release lanes on the week's code. On the first run `fixture-next` failed in its two webpack
builds: with PointerFx in `./motion`, the `/count-up` page shipped `motion/pointer-fx.client`, so the
hook moved to its own subpath (M69) and the rerun passed every lane. Visual regression: react 3,648
shots (3,496 identical, 152 within the tolerance), with the 72 new baselines; charts 164 (160 and
4). No existing baseline moved.

- DataView's browser spec: 5 of 5 in Chromium and Firefox; WebKit 4 and the Tab case skipped (the
  known macOS Tab order). Surface's: 2 of 2 in each engine; PointerFx's: 4 of 4 in each.
- The docs smoke: 135 pages, axe clean in light and in dark at 375 px.

## For the maintainer

1. **M69 changed.** I first put the hook in `./motion` on the claim that a CountUp-only page
   tree-shakes it away. The Next fixture's webpack builds showed it does not (a CountUp page
   shipped `pointer-fx.client`); you then chose its own subpath, `@nizivo/react/pointer-fx`.
2. **For Dayitava:** the three components have no Figma component; their renders are the 72 new
   baselines. Glass follows the floating navbar's bg/surface at 72 %, not the Lab card's white at
   42 % (which does not follow dark).
3. **Two literals with no token:** the 24 px glass blur and the 6 degree tilt. Design could add
   `blur/glass` and a tilt angle to the variables.

## Unverified

- Glass on Safari 18 and on the Safari 17.5 floor (opaque there by design): the floor lane renders
  the sheet but was not looked at for this.
- PointerFx with a real mouse and a trackpad: the specs dispatch pointer events.
