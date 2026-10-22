# Releasing

While GitHub Actions is off, the maintainer publishes by hand from their own machine, with npm 2FA, through the local release script `packages/tooling/release/release.ts` (`pnpm release`; ARCHITECTURE.md §19.2, decision M14). These releases have **no npm provenance**, which needs a CI provider's identity; the release notes say so.

## Versioning

- [Changesets](https://github.com/changesets/changesets) with one **fixed** group: `@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons`. `@nizivo/charts` joins the group when v0.2 adds the package (Changesets reports a group entry that matches no package as a config error, so it is not listed before then). They always release together at the same version, so the CSS contract between tokens and components never skews. See [`.changeset/config.json`](.changeset/config.json).
- 0.x semantics: a breaking change is a minor bump with a `BREAKING:` note. `unstable/*` entries are outside semver.
- 0.x goes to the **`next`** dist-tag (`npm publish --tag next`). After the first publish of each package, check with `npm dist-tag ls @nizivo/tokens` whether npm also pointed `latest` at it; if it did, record it here.

## Publishing by hand

Before the first run on a machine: Node 24.16 or later, pnpm 12.11.2 through corepack, Playwright's Chromium, WebKit and Firefox (`pnpm --filter @nizivo/docs exec playwright install chromium webkit firefox`), and ports 3417 to 3419 free for the fixtures.

`pnpm release` is a **dry run** unless you pass `--publish`. A dry run does everything except the publish and the tags (it runs `npm publish --dry-run` on each tarball), and it lists every blocker instead of stopping at the first. The script never pushes, never runs `npm login` and never creates or stores a token.

1. **Rehearse.** On a clean checkout of `main` that equals `origin/main`, run `pnpm release`. It runs, in order: the preflight (branch, clean tree, `git fetch` then HEAD equal to `origin/main`, Node and pnpm versions, npm's working folder and login file (see "The npm login" below), the npm account and its 2FA mode); the version check; the full gate (`pnpm check` with `TURBO_FORCE=true`); the slow lanes (the `pnpm check:full` list: the browser lane in Chromium and Firefox, overlay conformance in Chromium, WebKit and Firefox, the node suite, browser lane and overlay conformance on React 19.2, the `@nizivo/charts` browser specs in all three engines and the charts-only fixture, the Next, Vite, Vite SSR and Astro fixtures, visual regression for react and charts); pack and `check:release` on the tarballs, plus the licence gate of the shipped runtime; `npm view` for each version. It takes about 8 to 10 minutes (449 s in week 5; in week 6 the lanes alone took 384 s, with the two Firefox lanes). Fix every BLOCKER it prints. The Firefox lanes can block a release: if `overlay-firefox` fails only on O-03 (the second Escape closes the Dialog), re-run it once before treating it as a regression (one failure in five runs under load was seen in week 6, none in four later runs). The lanes leave the tree as they found it (the fixtures write their results to a temporary folder unless run with `--record`); if anything the gate or a lane runs changes a file, the script reports it as a blocker.
2. **Version.** If changesets are pending, run `pnpm release --publish`. It runs `pnpm changeset version`, shows the diff and asks to confirm. On `y` it commits `chore(release): version packages` locally and stops; on anything else it reverts the files. Push `main` (or merge it through a pull request), pull, and start again from step 1.
3. **Log in once, with the project's login file.** If the dry run reports no npm login, log in as `neevtechnologies`, with 2FA set to "authorization and writes", into the project's own file (see "The npm login" below). The script prints the command; for the default file it is:

   ```sh
   mkdir -p ~/.config/nizivo && cd ~/.config/nizivo && npm login --registry https://registry.npmjs.org/ --userconfig ~/.config/nizivo/npmrc
   ```

4. **Dry run again.** `pnpm release` must finish with no blockers.
5. **Publish.** Run `pnpm release --publish` in a terminal. Type `publish` to confirm, then enter a fresh npm one-time password when asked, once per package, in the order `@nizivo/tokens`, `@nizivo/icons`, `@nizivo/react`. The password is passed to npm through its environment only, never on the command line or in a log. Pressing Enter on an empty prompt lets npm ask for it itself. Before each publish the script checks that the tarball is byte-for-byte the one it checked.
6. **Tags.** The script creates annotated local tags `@nizivo/<package>@<version>` on HEAD and prints the `git push origin refs/tags/…` command. Run it yourself.
7. **If a publish fails part-way**, fix the cause **outside the repo** (the network, the npm account, a one-time password) and run `pnpm release --publish` again from the same commit: versions already on the registry are skipped, so it carries on where it stopped. Do not commit a fix to a package that is already partly published before the rest is out: the script compares each published version's bytes with the tarball it just packed, and when they differ (HEAD is no longer what was published) it stops before publishing or tagging anything. A fix to the packages themselves goes out as the next version, through a changeset.

`--skip-gate` and `--skip-lanes` exist for a quick rehearsal and are refused with `--publish`. A full dry run runs `pnpm check` and every slow lane in this tree, so run it alone: not beside another lane, fixture or `vitest` run in the same checkout, since they share ports and the Vite cache. `pnpm release --skip-gate --skip-lanes </dev/null` is the quick rehearsal (packs, tarball checks, `npm view` and `npm publish --dry-run`).

## The npm login

The release uses its own npm login file, never `~/.npmrc` (on the maintainer's machine that file holds an unrelated old token). The file is `~/.config/nizivo/npmrc`, or the absolute path in `NIZIVO_NPM_USERCONFIG` (a leading `~/` is expanded). The script refuses `~/.npmrc`, a file inside the repo (a token there could be committed) and a file directly in the home folder.

- **Every npm call carries `--userconfig <file>`:** `npm whoami`, `npm profile get`, `npm view` and `npm publish`. If the file is missing, the preflight blocks and prints the login command above.
- **npm runs in an empty temporary folder of its own**, never in the repo and never in the home folder, and the preflight checks it: in the repo, npm 11 refuses to run because the root `package.json` pins pnpm in `devEngines` (`EBADDEVENGINES`); for the home folder, see the gotcha below. If the folder is not safe, the script runs no npm command at all; set `TMPDIR` to a folder outside the repo and the home folder.
- **Check the login yourself** from a neutral folder: `cd "$(mktemp -d)" && npm whoami --registry https://registry.npmjs.org/ --userconfig ~/.config/nizivo/npmrc` prints `neevtechnologies`.
- **Log out** the same way, from the file's folder:

  ```sh
  cd ~/.config/nizivo && npm logout --registry https://registry.npmjs.org/ --userconfig ~/.config/nizivo/npmrc
  ```

- **The home-folder gotcha.** Besides the user config, npm reads a _project_ config: the `.npmrc` of the nearest folder at or above its working folder that has a `package.json` or a `node_modules`, or else of the working folder itself. Run from `~`, that is `~/.npmrc`. npm skips it only while it is also the user config, so once `--userconfig` names another file, `~/.npmrc` is read as project config, which outranks the user config: its old token wins and npm answers 401. So never run these npm commands from `~`, nor from a folder below one that has a `package.json` or a `node_modules`.

## Release gates

The script runs them all. No stable release ships with an accessibility (AA) failure, an open "sync needed" token issue, or generator or exports drift.

## When GitHub Actions is back on

Then packages are published by `.github/workflows/release.yml` with **npm trusted publishing (OIDC)**, and provenance is generated automatically (ARCHITECTURE.md §19.2):

- There is **no `NPM_TOKEN`** anywhere: not in repository secrets, not on anyone's machine for this project.
- Only the publish job gets `id-token: write`, and it runs in the protected GitHub environment `npm` with required reviewers.
- Each package's trusted-publisher configuration (repository `theneev/nizivo`, workflow `release.yml`, environment `npm`) is added on npmjs.com by the owner of the `neevtechnologies` npm account, with 2FA. The packages already exist after the hand-published 0.1.0, so each configuration is validated by the first OIDC publish that follows; an unvalidated configuration expires after 48 hours.
- pnpm 12.11.2 publishing over OIDC through Changesets is unverified until a rehearsal on a throwaway package; pnpm 11.28.x is the fallback.
- The ordering, registry-skip and licence rules in `packages/tooling/release/plan.ts` can be reused there.
