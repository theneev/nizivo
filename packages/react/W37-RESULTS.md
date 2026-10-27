# Week 37 results (v0.5: data display and product patterns)

Recorded on 2026-10-28, overnight, under M77 (ARCHITECTURE.md §21.3 "Week 37 status", §21.4a,
§23.4 D-do). Every number below comes from a command run on the maintainer's Mac. Everything is
under `@nizivo/react/unstable/<name>` and unreviewed.

## What was built

The unbuilt parts of Figma's 11 Data Display and 14 Product Patterns pages, in three batches:

| Batch | Parts                                   | Tier   | Changeset                |
| ----- | --------------------------------------- | ------ | ------------------------ |
| 1     | Tag, Rating, NotificationItem, FileItem | server | `product-parts.md`       |
| 2     | Comment, EventCard, ProfileCard         | server | `product-parts-2.md`     |
| 3     | Slider, MediaPlayer                     | client | `slider-media-player.md` |

- **Tag:** a toggle with `aria-pressed` and a check, and a sibling remove button named "Remove
  Ceramics". A disabled tag keeps its name in text/secondary: Figma's text/disabled on
  bg/disabled is under AA, and a label is not a control, so axe does not exempt it.
- **Rating:** one image named "Rated 4.8 out of 5 from 1,208 reviews"; a star fills per whole
  point, as Figma draws 4.8.
- **NotificationItem:** one link whose name starts "Unread" when it is.
- **FileItem:** a native `<progress>` named "Uploading autumn-lookbook.pdf"; cancel and retry are
  named after the file.
- **Comment:** Like is a toggle named with its count ("Like, 12"); replies nest as articles.
- **EventCard:** the date block is presentational; the full date is a `<time datetime>`. Pass
  `timeZone`, so the server's date and the browser's agree.
- **ProfileCard:** the name is the heading; the counts are a description list. Figma's Aurora
  cover is a shader, drawn here with CSS gradients (`cover` replaces it), as VoiceOrb's orb is.
- **Slider:** a native `<input type="range">`, so its role, keys and form value are the browser's.
  The fill comes from a custom property set through the CSSOM after hydration (no style attribute,
  for a strict CSP), and Firefox's `::-moz-range-progress`. `keyStep` moves the arrows further
  than one step. The CSS floor check now allows the range input's vendor pseudo-elements.
- **MediaPlayer:** controls only; the app wires its `<audio>` or `<video>`, so it never autoplays.
  The scrubber steps 1 second (any time shows as it is) and seeks 5 with the arrows, read as "1
  minute 12 seconds of 3 minutes 48 seconds".
- **Glyphs:** star, heart, message-circle, play, pause, skip-back, skip-forward (Lucide), clock
  (Feather-derived). THIRD_PARTY_NOTICES lists 34.

## Where they differ from Figma

- The disabled Tag's name and the Comment's time use text/secondary (AA), as above.
- MediaPlayer's play button names its action ("Play", "Pause") without `aria-pressed`: Figma asks
  for both, which says the state twice.
- ProfileCard and the Slider keep Figma's 320 px (MediaPlayer 360 px) unless their container is
  narrower; they still stretch in a grid.

## Checks

- `pnpm check` passes after each batch; `pnpm gate` passed on batches 1 and 2.
- `test/browser/product-parts.spec.tsx` (8 cases) and `media.spec.tsx` (3): all passing in
  Chromium, Firefox and WebKit.
- The visual lane: 236 new baselines for the nine parts, identical on two reruns.

## For the maintainer

1. Nothing is pushed; all of it is on `v04-ai`.
2. Still to build from §21.4a: 13 Marketing (10 parts), 16 Docs Site (Copy Button, Code Block,
   Docs Card, Docs Header), Link (page 02); 12 Shaders & Motion stays with `@nizivo/lab`.
