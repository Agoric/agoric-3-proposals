# 114: Deploy QSTN Survey Funding & Reward Claim Contracts to Agoric Mainnet

Passed governance proposal [#114](https://main.api.agoric.net/cosmos/gov/v1/proposals/114)
on agoric-3 (submitted 2025-12-20, passed 2025-12-23).

- Type: `/agoric.swingset.CoreEvalProposal` (2 core-evals)
- Deploys QSTN's survey-funding and reward-claim contracts (`QstnContract`),
  using Agoric Orchestration as the coordination layer for cross-chain funding
  and "Claim All" flows across Osmosis, Neutron, and Avalanche.
- Forum discussion: https://community.agoric.com/t/deploy-qstn-survey-funding-claim-contracts-to-mainnet-agoric-sdk/906
- Release: https://github.com/QSTN-US/qstn-agoric-contracts/releases/tag/qstn-v1.0.0

Proposal 115 re-runs one of these evals; see `115:qstn-survey-2`.

## Submission

`submission/` holds the two core-eval scripts and their permits exactly as
executed on-chain (extracted verbatim from the proposal's `evals` field):

- `qstn-survey-eval1.js` / `qstn-survey-eval1-permit.json`
- `qstn-survey-eval2.js` / `qstn-survey-eval2-permit.json`

### Referenced bundles

The generated eval scripts reference these installed bundles by id, and the
matching `b1-<hash>.json` files are included in `submission/` so the default
EVAL stage can install them:

- `b1-5e0baf43feff03d1e560ee98b246d560ee8504237895d91cd4e5b75f315b190591a03b13173ccec7397ed252e48f078173185f8826d536a1c980eb2851d810fa`
- `b1-76bb2f3788b6dfdb5db2f62df733128f3feb45ad77736e5c89bfb776bb955c0d0a094ccfaeac8361d24827252a5abedbf9646903b879c4d8d76b1269dd914d73`
- `b1-d72e98ce63ab98a191129963d4736ef5178ae98ecb52f230fe6d53cd50bb7e6169a3ad3b1089737e927b9b090d13b80e21085fdcb5bf3a57e0de2a9c28ed9460`

They were recovered from the mainnet `MsgInstallBundle` transactions via
`scripts/fetch-all-bundles.ts`; each file's `endoZipBase64Sha512` matches the
`b1-` hash above.
