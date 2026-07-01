# 112: [Inter Protocol Sunset] Liquidate the reserve module account

Passed governance proposal [#112](https://main.api.agoric.net/cosmos/gov/v1/proposals/112)
on agoric-3 (submitted 2025-10-10, passed 2025-10-13).

- Type: `/agoric.swingset.CoreEvalProposal` (1 core-eval)
- Transfers the remaining reserve module account BLD and IST balances to DCF,
  for paying outstanding oracle network fees in service of the
  [Inter Protocol Wind-Down Process](https://community.agoric.com/t/sunset-inter-protocol-and-begin-wind-down-process/787).

## Submission

`submission/reserve-liquidate.js` and `submission/reserve-liquidate-permit.json`
are the core-eval script and permit exactly as executed on-chain (extracted
verbatim from the proposal's `evals` field). This eval is self-contained: it
looks up the BLD and IST brands and moves the vbank/reserve balances to the
beneficiary address, and references no installed bundles, so no `b1-<hash>.json`
files are required.
