# 112: [Inter Protocol Sunset] Liquidate the reserve module account

Mainnet governance proposal
[112](https://main.api.agoric.net/cosmos/gov/v1/proposals/112), passed
2025-10-13. A `/agoric.swingset.CoreEvalProposal` with a single core-eval.

As part of the Inter Protocol sunset, this core-eval empties the vbank
**reserve** module account by transferring its entire BLD and IST balances to a
beneficiary address:

- reserve module account: `agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl`
- beneficiary: `agoric18lfz3w97u72p4jq58gdn05ftdcv9rwz0ft5l2m`

The eval looks up the BLD and IST brands via `agoricNames`, gets both banks via
`bankManager`, withdraws the reserve's current balances, and deposits them into
the beneficiary's purses. It installs no bundles (an inline core-eval using only
`agoricNames` and `bankManager` powers).

## Provenance

The `submission/` core-eval script and permit were recovered directly from the
executed on-chain proposal via `scripts/add-proposal.ts` (which reads the
CoreEvalProposal content from the archive node), so they match exactly what BLD
stakers approved.
