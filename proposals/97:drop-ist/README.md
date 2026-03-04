# Proposal to denominate swingset fees in BLD

[drop-ist.json](./drop-ist.json) contains a parameter change proposal for
setting the following values while preserving others from mainnet:

- `fee_unit_price` to 1e6 ubld (i.e., 1 BLD)
- `beans_per_unit` "feeUnit" to 1.5e11 (making each fee "bean" equal
  1e6 ubld ÷ 1.5e11 ≈ 7 picoBLD, each approximating 0.1 picoUSD under a
  [May 2025 exchange rate of $0.018 per BLD](https://web.archive.org/web/20250513143420/https://coinmarketcap.com/currencies/agoric/) such that 1e12 beans ≈ $0.10). Future adjustments are expected to instead
  have 1e12 beans ≈ $1 and 1e10 beans ≈ 1¢.
- `beans_per_unit` "smartWalletProvision" to 1.5e12 (setting the fee for smart
  wallet provisioning at 1.5e12 beans = 10 BLD)

Those same changes can be applied to any chain parameters JSON with a custom
USD_PER_BLD value using [`jq`](https://jqlang.org/) script
[change-params.jq](./change-params.jq):

```sh
export PROPOSAL_TITLE='Denominate swingset fees in BLD'
export PROPOSAL_DESC='...'
agd --node https://main.rpc.agoric.net:443 query -o json swingset params |
  USD_PER_BLD=1.00 jq -f change-params.jq
```

[eval.sh](./eval.sh) submits and approves drop-ist.json as a param-change
proposal and updates node app.toml `minimum-gas-prices` to "0ubld" (i.e., not
including "ist").

[test.sh](./test.sh) verifies that the new values are reflected in CLI reads of
chain parameters.
