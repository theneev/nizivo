# Nizivo UI: notes for Claude Code

Claude Code builds this library; the maintainer (Aman) reviews, decides and does the human-account
steps (GitHub settings, npm, Figma, DNS). Dayitava owns design and accessibility review.

## Where things are

- `docs/ARCHITECTURE.md` is the source of truth. The latest work is §21.3 (the newest "Week N
  status" paragraph and its "Open" list); decisions are §23.3 (M-rows, the maintainer's words quoted
  verbatim) and §23.4 (D-rows, builder defaults the maintainer can override).
- Each week's results and open questions: `packages/*/WNN-RESULTS.md` ("For the maintainer").
- Commands and what each lane covers: `CONTRIBUTING.md`. Releasing: `RELEASING.md`.
- Figma notes with node ids: `docs/figma/*.md`. Issue tracker: Linear (team NIZ).

## Hard rules

- **No attribution anywhere.** No `Co-Authored-By`, `Generated with`, `Signed-off-by` or
  `Claude-Session` lines in commits, PR descriptions or generated files; `.claude/settings.json`
  turns them off.
- **GitHub Actions is off.** Never change `.github/`, trigger a workflow, or re-enable one.
- **Zero spend.** No paid services, seats, hosting or upgrades.
- **Never publish.** Never run `npm publish` for real, `changeset publish`, `changeset version` on
  `main`, `npm login` or `npm logout`; never create or push tags. `pnpm release` only as a dry run
  with stdin from `/dev/null`. The maintainer publishes by hand. Never read or print an npm token.
- **Figma is read-only** (file `BIzJFf1wm8KP0YG2AVI1tP`).
- **Never rewrite pushed history** (no amend, reset or force-push of anything on `origin/main`).
- Existing size limits (§17) move only by a labelled maintainer decision; new entries start at
  measured + 10 %.
- No absolute local paths in committed files.

## Commands

- pnpm through corepack: `COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 <args>`, with
  `TURBO_TELEMETRY_DISABLED=1`. Node 24.16 or later.
- `pnpm check` is the per-change gate; `TURBO_FORCE=true` runs it from clean.
- Cache inputs (§18.1, M39): a turbo task that starts reading a new file needs it in `turbo.json`'s
  inputs. After a `turbo.json` or task-script change, or a new cross-package read, run
  `pnpm cache:audit` and fix what it reports.
- Every commit must pass its own check: `pnpm gate <commit>…` checks each one out in a clean
  worktree and runs its `check` steps from the cache plus `cache:audit`, the last one forced and run
  first (`--in-order` runs them oldest first).
- The docs read `apps/docs/lib/plan.json`, not the plan: after editing a numbered heading, §18.2 or
  §23.4, run `pnpm nz gen` (`gen:check` fails until you do).
- Lanes that share the vitest/`.vite` cache run one after another, never in parallel.

## Known flakes on the maintainer's Mac

Report them; never re-record baselines to make them pass.

- `fixture-vite`: Node's `setTypeOfService EINVAL` socket error: fixed on 2026-10-24 (the fixture runner's
  own requests use `node:http`, not `fetch`: `fixtures/runner/http.ts`); report it if it returns.
- Charts visual: the `area-chart/rtl` baselines flipped between two system Arabic fonts: fixed on 2026-10-24
  (the visual harness pins Arabic to Geeza Pro: `packages/react/scripts/visual/run.ts`); report it if it returns.
- Firefox overlay conformance O-03 (Tooltip in Dialog, Escape), NIZ-126: fixed on 2026-10-22 (the pointer is parked before each nesting case); report it if it returns.
- WebKit on macOS: 10 known Tab-order failures in the browser specs (IconButton 2, SegmentedControl 3,
  Tabs 1, TabNav 1, ChipGroup 2, ChoiceCard 1): WebKit does not Tab to buttons, links or radios by default.
- React visual: `toast/stack--focus-8-toast-action` and `stack--focus-9-toast-close`, about one run in
  four, 30 px on the upper toasts' rounded corners in one mode (week 14).
- React visual: `drawer/sheet--focus-4-drawer-body--light`, now and then 4 px on the focus halo.
- React visual: `combobox/states--open-key-combobox-trigger-0--forced` (18 px) and
  `states--open-combobox-trigger-0--forced` (7 px), about one run in two or three: the input's
  blinking text caret (2026-10-28).
- Firefox overlay: Tooltip's "enters through data-entering with a running transition" found no running
  opacity transition under load: fixed on 2026-10-24 (the check records `transitionrun` events instead of
  polling `getAnimations()`: `watchTransitions` in `test/overlay/harness.tsx`); report it if it returns.
- `cache:audit`'s isolated docs smoke: now and then a 30 s `page.goto` timeout on
  `/docs/charts/chart-frame/` (week 18; the page loads normally on its own, and a rerun passes).

## Cloud sessions

A cloud session (claude.ai/code) runs on Ubuntu, not the maintainer's Mac. Its environment runs
`.claude/cloud-setup.sh` (Node 24, the Playwright browsers and their system packages), and
`.claude/hooks/cloud-install.sh` installs dependencies when the lockfile changes.

- **Push only to a `claude/…` branch, never to `main`.** The maintainer's Mac gates the branch
  with `pnpm gate`, runs the Mac-only lanes and fast-forwards `main`.
- **Mac-only lanes; do not run or re-record them in the cloud:** the react and charts visual
  baselines (`pnpm test:visual` and `pnpm --filter @nizivo/charts test:visual`, recorded on macOS;
  Linux renders fonts differently), the Safari/iOS 17.5 floor lane (`pnpm floor`, the iOS Simulator)
  and `pnpm release`. Everything else runs, including the
  browser specs in Chromium, Firefox and WebKit; WebKit on Linux may differ from the Mac's known
  failures, so report any difference.
- The user's own `~/.claude` files and Claude's memory do not reach the cloud: anything a later
  session must know goes in this file, the plan or a results file.
