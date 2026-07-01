# 111: Ymax Portfolio Contract Beta Deployment

Passed governance proposal [#111](https://main.api.agoric.net/cosmos/gov/v1/proposals/111)
on agoric-3 (submitted 2025-10-03, passed 2025-10-06).

- Type: `/agoric.swingset.CoreEvalProposal` (4 core-evals)
- Executes code corresponding to commit
  [cecba0a](https://github.com/Agoric/agoric-sdk/releases/tag/ymax-v0.2.0-beta).
- Background: [YMax Beta Deployment forum thread](https://community.agoric.com/t/ymax-portfolio-contract-beta-deployment/898).

This is the beta successor to the ymax-alpha series (proposals 100, 101, 103,
104, 106).

## Submission

`submission/` holds the four core-eval scripts and their permits exactly as they
were executed on-chain (extracted verbatim from the proposal's `evals` field):

- `ymax-beta-eval1.js` / `ymax-beta-eval1-permit.json`
- `ymax-beta-eval2.js` / `ymax-beta-eval2-permit.json`
- `ymax-beta-eval3.js` / `ymax-beta-eval3-permit.json`
- `ymax-beta-eval4.js` / `ymax-beta-eval4-permit.json`

### Referenced bundles

The generated eval scripts reference these installed bundles by id, and the
matching `b1-<hash>.json` files are included in `submission/` so the default
EVAL stage can install them:

- `b1-100de156dfb74aac9354005dc059ecd80e7d22bb16791e3c0b20c4695d66b910220ed6a8011153f2bd943ceb969521d06eea82fe0f4d7790a21cea367ac87e00`
- `b1-29d800ca88d5721809c1a3ccc3ade32f537e69551f35bb6af517c0e4ab3a03abe02dd124ea213d7c91255464f296211ea4f00908dfd0699db4066f30e4788c74`
- `b1-b55aec6fcfa8b08c7682ea5f8fd287cc1cae37b06a1c86cf8072ab9be24f13382a844e8ff5d0c98000652ae8ede5672998e76d0b621c447eb5294b7c81ee4470`

They were recovered from the mainnet `MsgInstallBundle` transactions via
`scripts/fetch-all-bundles.ts`; each file's `endoZipBase64Sha512` matches the
`b1-` hash above.
