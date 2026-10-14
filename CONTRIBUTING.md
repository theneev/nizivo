# Contributing to Nizivo

Thank you for helping. This guide covers setup, the rules CI enforces, commit conventions, the DCO sign-off and changesets. By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Report security issues privately, as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Setup

You need **Node 24** (24.16 or later; see [`.node-version`](.node-version)) and **pnpm 12.11.2**, run through corepack, which ships with Node 24.

```sh
corepack enable    # once per machine: puts corepack's pnpm shim on your PATH
pnpm --version     # prints 12.11.2, read from package.json
pnpm install
```

If `pnpm --version` prints another version (a global pnpm can shadow the shim), run pnpm through corepack explicitly:

```sh
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 corepack pnpm@12.11.2 install
```

## Everyday commands

| Command              | What it does                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm build`         | Builds every package (Turborepo, local cache only): tsdown everywhere; then for `@nizivo/tokens` the Terrazzo build and the contrast check, and for `@nizivo/react` the Lightning CSS build with its guard and the emitted-CSS check |
| `pnpm typecheck`     | `tsc --noEmit` with TypeScript 7 in every package                                                                                                                                                                                    |
| `pnpm lint`          | oxlint, the oxfmt check, then stylelint on component CSS                                                                                                                                                                             |
| `pnpm test`          | Vitest in every package                                                                                                                                                                                                              |
| `pnpm format`        | Formats the repo with oxfmt                                                                                                                                                                                                          |
| `pnpm changeset`     | Adds a changeset (see below)                                                                                                                                                                                                         |
| `pnpm nz gen`        | Regenerates barrels, `engine.ts`, exports, the component map and the a11y floor in `packages/react/styles/base.css` from `component.json` files                                                                                      |
| `pnpm check:a11y`    | After a build: the token contrast matrix and the override and proposal checks, never cached, so expiry is checked against today's date                                                                                               |
| `pnpm check:release` | After a build: packs `@nizivo/tokens` and `@nizivo/react`, then runs the tarball allowlist, publint, attw and the directive guard on the tarballs                                                                                    |
| `pnpm check`         | Everything CI runs, in CI's order: frozen install, typecheck, lint, `nz gen --check`, test, build, `check:a11y`, then the built-output checks                                                                                        |

CI runs the same steps as `pnpm check` on every pull request. GitHub Actions is switched off for now, so run `pnpm check` before you push.

## Rules CI and review enforce

The plan in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) is the source of truth. The ones you will meet first:

- **Dependencies.** Shared versions live in the `catalog:` in [`pnpm-workspace.yaml`](pnpm-workspace.yaml). Tooling is pinned exactly; the React Aria engine uses caret ranges. Any new runtime dependency of a published package needs an RFC (§19.3).
- **Supply chain.** pnpm refuses versions younger than 3 days (`minimumReleaseAge`), trust downgrades (`trustPolicy: no-downgrade`) and git or tarball sub-dependencies (`blockExoticSubdeps`). No dependency runs install scripts: pnpm stops an install on any unreviewed script, and `allowBuilds` only lists scripts that were reviewed and denied, each at an exact version (`'esbuild@0.28.2': false`), so a new version stops the install again.
- **Server-first.** `'use client'` goes only in `*.client.tsx` files and `src/_engines/**` (§8.2). Barrels and `*.parts.ts` files carry no directive.
- **The engine seam.** Only `packages/react/src/_engines/**` may import `react-aria`, `react-aria-components`, `@react-aria/*` or `@react-stately/*`. oxlint fails anything else (§9.2).
- **CSS.** Classes are `nz-<component>[-<part>]`, custom properties are `--nz-*` or `--_nz-*`, and only logical properties are allowed (§8.2).

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): summary`, in the imperative mood.

- Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- Scopes: the package (`tokens`, `react`, `icons`, `tooling`, `testkit`) or the area (`deps`, `ci`, `docs`).
- Mark a breaking change with `!` after the type or scope (`feat(react)!: …`) and explain it in the body.

## Developer Certificate of Origin (DCO)

Every commit in a pull request from outside Neev Technologies must be signed off under the [Developer Certificate of Origin 1.1](https://developercertificate.org/). The sign-off certifies that you wrote the change, or otherwise have the right to submit it under the project's licence.

Sign off with `-s`:

```sh
git commit -s -m "fix(react): keep focus on the trigger after Escape"
```

This adds a trailer that must match the commit author:

```
Signed-off-by: Your Name <you@example.com>
```

To sign off commits you already made, run `git commit --amend -s` for the last one, or `git rebase --signoff main` for the whole branch, then force-push your branch.

Contributions are licensed under the [Apache License 2.0](LICENSE) (section 5 of the licence), except anything under [`patterns/`](patterns), which is [MIT](patterns/LICENSE).

## Changesets

Add a changeset to every pull request that changes a published package (`@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons`):

```sh
pnpm changeset
```

- The published packages are one **fixed** group, so they always share a version.
- While Nizivo is 0.x, a breaking change is a **minor** bump, and its changeset starts with `BREAKING:`.
- Changes to docs, tests, CI or private tooling need no changeset.

## Pull requests

Keep each pull request to one topic, make sure CI is green, and link the issue or the section of the plan it implements.
