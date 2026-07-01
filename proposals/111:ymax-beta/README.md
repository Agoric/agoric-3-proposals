# 111: Ymax Portfolio Contract Beta Deployment

Mainnet governance proposal
[111](https://main.api.agoric.net/cosmos/gov/v1/proposals/111), passed
2025-10-06. A `/agoric.swingset.CoreEvalProposal` with four core-evals.

YMax Beta does not deploy a new ymax contract; it delegates upgrade/control of
the ymax contracts to an Agoric Opco smart wallet (via a contract control that
is delivered through the postal service), and updates the existing ymax0 (alpha)
control instance. The four evals under `submission/` are, in order:

0. `getManifestForDeliverContractControl` — deliver a ContractControl invitation
1. `get-upgrade-kit`
2. `portfolio-control` for `ymax0`
3. `portfolio-control` for `ymax1`

## Provenance

The draft was tested pre-vote in agoric-sdk at
`a3p-integration/proposals/g:ymax1`. The `submission/` core-eval scripts,
permits, and referenced `b1-*` bundles here were recovered directly from the
executed on-chain proposal via `scripts/add-proposal.ts` (which reads the
CoreEvalProposal content and installed bundles from the archive node), so they
match exactly what BLD stakers approved.

Release notes:
https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.2.0-beta
