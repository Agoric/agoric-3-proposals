# Publishing to NPM

`@agoric/synthetic-chain` is published to NPM automatically by the [`Release` workflow](./.github/workflows/release.yml), driven by [changesets](https://github.com/changesets/changesets).

## Normal flow

1. Land PRs that include a changeset (`yarn changeset`) describing the change.
2. The `Release` workflow opens/updates a "Version Packages" PR that bumps the version and updates the changelog.
3. Merging that PR triggers the workflow to publish the new version to NPM.

## Authentication: OIDC trusted publishing

Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (tokenless OIDC). The `release` job grants
`id-token: write`, so `changesets/action` skips writing an auth token and lets `npm publish` authenticate through OIDC. npm generates provenance automatically

Trusted publishing requires npm >= 11.5.1, which the workflow installs (Node 22 ships npm 10.x).

## Manual fallback

If you must publish by hand:

1. Bump the version number in `packages/synthetic-chain/package.json`.
2. PR to get it approved.
3. When approved, run `npm publish` in the branch and merge.

You may need credentials to publish. Contact IT.
