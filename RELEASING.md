# Releasing

While GitHub Actions is off, the maintainer publishes by hand from their own machine, with npm 2FA, through the local release script `packages/tooling/release/release.ts` (`pnpm release`; ARCHITECTURE.md §19.2, decision M14). These releases have **no npm provenance**, which needs a CI provider's identity; the release notes say so.

## Versioning

- [Changesets](https://github.com/changesets/changesets) with one **fixed** group: `@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons`. `@nizivo/charts` joins the group when v0.2 adds the package (Changesets reports a group entry that matches no package as a config error, so it is not listed before then). They always release together at the same version, so the CSS contract between tokens and components never skews. See [`.changeset/config.json`](.changeset/config.json).
- 0.x semantics: a breaking change is a minor bump with a `BREAKING:` note. `unstable/*` entries are outside semver.
- 0.x goes to the **`next`** dist-tag (`npm publish --tag next`). After the first publish of each package, check with `npm dist-tag ls @nizivo/tokens` whether npm also pointed `latest` at it; if it did, record it here.

## Publishing by hand

Before the first run on a machine: Node 24.16 or later, pnpm 12.11.2 through corepack, Playwright's Chromium, WebKit and Firefox (`pnpm --filter @nizivo/docs exec playwright install chromium webkit firefox`), and ports 3417 to 3419 free for the fixtures.

`pnpm release` is a **dry run** unless you pass `--publish`. A dry run does everything except the publish and the tags (it runs `npm publish --dry-run` on each tarball), and it lists every blocker instead of stopping at the first. The script never pushes, never runs `npm login` and never creates or stores a token.

1. **Rehearse.** On a clean checkout of `main` that equals `origin/main`, run `pnpm release`. It runs, in order: the preflight (branch, clean tree, `git fetch` then HEAD equal to `origin/main`, Node and pnpm versions, the npm account and its 2FA mode); the version check; the full gate (`pnpm check` with `TURBO_FORCE=true`); the slow lanes (the `pnpm check:full` list: the browser lane in Chromium and Firefox, overlay conformance in Chromium, WebKit and Firefox, the Next, Vite and Astro fixtures, visual regression); pack and `check:release` on the tarballs, plus the licence gate of the shipped runtime; `npm view` for each version. It takes about 8 to 10 minutes (449 s in week 5; in week 6 the lanes alone took 384 s, with the two Firefox lanes). Fix every BLOCKER it prints. The Firefox lanes can block a release: if `overlay-firefox` fails only on O-03 (the second Escape closes the Dialog), re-run it once before treating it as a regression (one failure in five runs under load was seen in week 6, none in four later runs). The lanes leave the tree as they found it (the fixtures write their results to a temporary folder unless run with `--record`); if anything the gate or a lane runs changes a file, the script reports it as a blocker.
2. **Version.** If changesets are pending, run `pnpm release --publish`. It runs `pnpm changeset version`, shows the diff and asks to confirm. On `y` it commits `chore(release): version packages` locally and stops; on anything else it reverts the files. Push `main` (or merge it through a pull request), pull, and start again from step 1.
3. **Log in once, outside the repo.** npm 11 refuses to run inside the repo, because the root `package.json` pins pnpm in `devEngines`. Run `cd ~ && npm login --registry https://registry.npmjs.org/` as `neevtechnologies`, with 2FA set to "authorization and writes".
4. **Dry run again.** `pnpm release` must finish with no blockers.
5. **Publish.** Run `pnpm release --publish` in a terminal. Type `publish` to confirm, then enter a fresh npm one-time password when asked, once per package, in the order `@nizivo/tokens`, `@nizivo/icons`, `@nizivo/react`. The password is passed to npm through its environment only, never on the command line or in a log. Pressing Enter on an empty prompt lets npm ask for it itself. Before each publish the script checks that the tarball is byte-for-byte the one it checked.
6. **Tags.** The script creates annotated local tags `@nizivo/<package>@<version>` on HEAD and prints the `git push origin refs/tags/…` command. Run it yourself.
7. **If a publish fails part-way**, fix the cause **outside the repo** (the network, the npm account, a one-time password) and run `pnpm release --publish` again from the same commit: versions already on the registry are skipped, so it carries on where it stopped. Do not commit a fix to a package that is already partly published before the rest is out: the script compares each published version's bytes with the tarball it just packed, and when they differ (HEAD is no longer what was published) it stops before publishing or tagging anything. A fix to the packages themselves goes out as the next version, through a changeset.

`--skip-gate` and `--skip-lanes` exist for a quick rehearsal and are refused with `--publish`.

## Release gates

The script runs them all. No stable release ships with an accessibility (AA) failure, an open "sync needed" token issue, or generator or exports drift.

## When GitHub Actions is back on

Then packages are published by `.github/workflows/release.yml` with **npm trusted publishing (OIDC)**, and provenance is generated automatically (ARCHITECTURE.md §19.2):

- There is **no `NPM_TOKEN`** anywhere: not in repository secrets, not on anyone's machine for this project.
- Only the publish job gets `id-token: write`, and it runs in the protected GitHub environment `npm` with required reviewers.
- Each package's trusted-publisher configuration (repository `theneev/nizivo`, workflow `release.yml`, environment `npm`) is added on npmjs.com by the owner of the `neevtechnologies` npm account, with 2FA. The packages already exist after the hand-published 0.1.0, so each configuration is validated by the first OIDC publish that follows; an unvalidated configuration expires after 48 hours.
- pnpm 12.11.2 publishing over OIDC through Changesets is unverified until a rehearsal on a throwaway package; pnpm 11.28.x is the fallback.
- The ordering, registry-skip and licence rules in `packages/tooling/release/plan.ts` can be reused there.
