# 116: Adjust Mint Inflation Bounds to 2-3% Annual Range

Passed governance proposal [#116](https://main.api.agoric.net/cosmos/gov/v1/proposals/116)
on agoric-3 (submitted 2026-03-02, passed 2026-03-05).

On-chain this proposal was a single gov v1 `/cosmos.mint.v1beta1.MsgUpdateParams`
message that set the mint module parameters:

- `inflation_min` to `0.02`
- `inflation_max` to `0.03`
- `inflation_rate_change` unchanged at `0.13`
- `goal_bonded` unchanged at `0.67`
- `mint_denom` `ubld`, `blocks_per_year` `6311520`

## How it is modeled here

`packages/synthetic-chain` only routes three proposal types through a build
stage (`Software Upgrade Proposal`, `/agoric.swingset.CoreEvalProposal`, and
`/cosmos.params.v1beta1.ParameterChangeProposal`); an unrecognized type makes
`dockerfileGen` throw. There is no dedicated type for a gov v1
`MsgUpdateParams`, so this directory is typed as a `ParameterChangeProposal` to
reach the EVAL stage, and [eval.sh](./eval.sh) submits the real gov v1 message.

- [mint-params.json](./mint-params.json) is the gov v1 proposal, carrying the
  `MsgUpdateParams` with the exact parameters and authority (the gov module
  account) from on-chain proposal 116.
- [eval.sh](./eval.sh) funds the proposer, submits `mint-params.json` via
  `agd tx gov submit-proposal`, and votes it through.
- [test.sh](./test.sh) verifies the resulting mint `inflation_min` and
  `inflation_max` on-chain.
