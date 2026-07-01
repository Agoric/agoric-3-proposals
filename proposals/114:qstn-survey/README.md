# 114: Deploy QSTN Survey Funding & Reward Claim Contracts to Agoric Mainnet

Mainnet governance proposal
[114](https://main.api.agoric.net/cosmos/gov/v1/proposals/114), passed
2025-12-23. A `/agoric.swingset.CoreEvalProposal` with two core-evals.

Deploys the QSTN Survey Funding & Reward Claim contracts. The two evals under
`submission/` are, in order:

0. `getManifestForChainInfo` — registers the chain/asset info the deployment needs
1. `getManifestForQstn` — installs and starts the QSTN contracts

They reference three installed bundles (`b1-*.json`), all included in
`submission/`.

Note: proposal [115](https://main.api.agoric.net/cosmos/gov/v1/proposals/115)
(`115:qstn-survey-2`, passed 2025-12-26) shares this same title and is a
subsequent QSTN deployment.

## Provenance

The `submission/` core-eval scripts, permits, and referenced bundles were
recovered directly from the executed on-chain proposal via
`scripts/add-proposal.ts` (which reads the CoreEvalProposal content and the
installed bundles from the archive node), so they match exactly what BLD stakers
approved.
