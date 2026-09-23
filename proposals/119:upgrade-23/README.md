# Proposal to upgrade the chain software

This reflects agoric-upgrade-23, which was adopted on mainnet by [governance
proposal 119](https://ping.pub/agoric/gov/119) at block height 26581000 and
block time 2026-07-27T12:58:24.520396854Z.

## `vatOptionUpdates` — promoting ymax vat to `critical`

This proposal's `upgradeInfo` carries a `vatOptionUpdates` that marks the ymax
vat as critical.

This replicates the `upgradeDetails.vatOptionUpdates` that the chain's
`golang/cosmos/app/upgrade.go` provides for devnet and mainnet, but targeting
a ymax instance deployed in the a3p image.

Because the vatID must be pinned statically in this package.json,
`test/critical-vat.test.js` cross-checks it against the live vat before
asserting the promotion took effect.
