# Changesets

Every pull request that changes a published package (`@nizivo/tokens`, `@nizivo/react`, `@nizivo/icons`, `@nizivo/charts`) adds a changeset:

```sh
pnpm changeset
```

The published packages are one **fixed** group, so they always release together at the same version. See [RELEASING.md](../RELEASING.md).
