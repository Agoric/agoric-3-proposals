# 115: Deploy QSTN Survey Funding & Reward Claim Contracts to Agoric Mainnet

Passed governance proposal [#115](https://main.api.agoric.net/cosmos/gov/v1/proposals/115)
on agoric-3 (submitted 2025-12-23, passed 2025-12-26).

- Type: `/agoric.swingset.CoreEvalProposal` (1 core-eval)
- A follow-on to proposal 114 (`114:qstn-survey`) carrying the same
  `QstnContract` reward-claim core-eval. Its single eval is identical to the
  second eval of proposal 114.

## Submission

`submission/qstn-survey-2.js` and `submission/qstn-survey-2-permit.json` are the
core-eval script and permit exactly as executed on-chain (extracted verbatim
from the proposal's `evals` field).

### Referenced bundles

The generated eval script references these installed bundles by id (a subset of
proposal 114's bundles), and the matching `b1-<hash>.json` files are included in
`submission/` so the default EVAL stage can install them:

- `b1-5e0baf43feff03d1e560ee98b246d560ee8504237895d91cd4e5b75f315b190591a03b13173ccec7397ed252e48f078173185f8826d536a1c980eb2851d810fa`
- `b1-76bb2f3788b6dfdb5db2f62df733128f3feb45ad77736e5c89bfb776bb955c0d0a094ccfaeac8361d24827252a5abedbf9646903b879c4d8d76b1269dd914d73`

They were recovered from the mainnet `MsgInstallBundle` transactions via
`scripts/fetch-all-bundles.ts` (see `114:qstn-survey`); each file's
`endoZipBase64Sha512` matches the `b1-` hash above.
