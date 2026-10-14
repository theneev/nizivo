# Releasing

> **Draft.** This runbook becomes final after the publish rehearsal on a throwaway package (ARCHITECTURE.md §19.2). `release.yml` does not exist yet.

## Versioning

- [Changesets](https://github.com/changesets/changesets) with one **fixed** group: `@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons` (and `@nizivo/charts` from v0.2). They always release together at the same version, so the CSS contract between tokens and components never skews. See [`.changeset/config.json`](.changeset/config.json).
- 0.x semantics: a breaking change is a minor bump with a `BREAKING:` note. `unstable/*` entries are outside semver.

## Prereleases

0.x prereleases are published to the **`next`** dist-tag through Changesets pre mode:

```sh
pnpm changeset pre enter next
pnpm changeset version
```

Leave pre mode with `pnpm changeset pre exit` when a stable release is due.

## Publishing

- Packages are published **only** by `.github/workflows/release.yml`, using **npm trusted publishing (OIDC)**. Provenance is generated automatically.
- There is **no `NPM_TOKEN`** anywhere: not in repository secrets, not on anyone's machine for this project.
- Only the publish job gets `id-token: write`, and it runs in the protected GitHub environment `npm` with required reviewers.
- Each package's trusted-publisher configuration (repository `theneev/nizivo`, workflow `release.yml`, environment `npm`) is created on npmjs.com by the owner of the `neevtechnologies` npm account, with 2FA, at that package's first release. An unvalidated configuration expires after 48 hours.
- pnpm 12.11.2 publishing over OIDC through Changesets is unverified until the rehearsal; pnpm 11.28.x is the fallback.

## Release gates

No stable release ships with an accessibility (AA) failure, an open "sync needed" token issue, or generator or exports drift.
