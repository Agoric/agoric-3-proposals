# Publishing to NPM

`@agoric/synthetic-chain` is published to NPM automatically by the [`Release` workflow](./.github/workflows/release.yml), driven by [changesets](https://github.com/changesets/changesets).

## Normal flow

1. Land PRs that include a changeset (`yarn changeset`) describing the change.
2. The `Release` workflow opens/updates a "Version Packages" PR that bumps the version and updates the changelog.
3. Merging that PR triggers the workflow to publish the new version to NPM.

## Authentication: OIDC trusted publishing

Publishing uses npm [trusted publishing](https://docs.npmjs.com/trusted-publishers) (tokenless OIDC). The `release` job grants
`id-token: write`, so `changesets/action` skips writing an auth token and lets `npm publish` authenticate through OIDC. npm generates provenance automatically

Trusted publishing requires npm >= 11.5.1, which the [`setup-publish` action](./.github/actions/setup-publish/action.yml) installs for both publishing jobs (Node 22 ships npm 10.x)

## Manual fallback

Because npm enforces trusted publishing, a local `npm publish` is rejected even with 2FA. Publishing has to happen in this workflow. So if the changesets flow can't do the publish (e.g. the version was bumped without a changeset, or it needs to go out under a non-`latest` dist-tag), trigger it manually from the
[`Release` workflow](https://github.com/Agoric/agoric-3-proposals/actions/workflows/release.yml):

1. Make sure the version you want published is committed on some branch, and that its `packages/synthetic-chain/package.json` version is not already on the registry
2. Select "Run workflow".
3. Leave "Use workflow from" on `main`. That ref only supplies the workflow definition
4. Set `branch` to the branch (or tag/SHA) whose committed version should be published
5. Set `tag` to the npm [dist-tag](https://docs.npmjs.com/cli/commands/npm-dist-tag) to publish under, normally `latest`
6. Approve the `npm-publish-release` environment deployment when prompted

The `manual-publish` job checks out `branch` and runs
`yarn changeset publish --tag <tag>` which publishes each workspace
package whose committed version is not yet on the registry. If it fails part way through, re-running is safe as already-published versions are skipped

Unlike the changesets flow, this job doesn't create the git tag or the GitHub release, so add those by hand if the publish was a real release
