---
'@agoric/synthetic-chain': patch
---

feat(synthetic-chain): set `$PUBLISHED_RPC_ENDPOINT` for `test.sh`

Allow `before-test-run.sh` and `after-test-run.sh` not to hardcode the chain's
`<host>:<port>` RPC endpoint.
