# Adding a proposal

Each proposal to Mainnet (agoric-3) should be contributed to this repo before being proposed to the chain.

1. Prepare the proposal and verify it by creating a proposal in
   agoric-sdk/a3p-integration. See the
   [README](https://github.com/Agoric/agoric-sdk/blob/master/a3p-integration/README.md) for more details

2. Submit a PR to this repo in which the proposal has a _pending_ name (e.g. `a:my-contract`)

3. Get review and merge to main

4. When the proposal has been further qualified with higher fidelity to Mainnet, submit to Mainnet

5. When the proposal passes, submit a PR here converting the pending proposal to a passed one (by
   changing the letter to the submission number)

6. clean up a3p-integration
  a. Move generally useful tools to the `@agoric/synthetic-chain` package.
  b. Move tests that should continue to pass afterwards into a3p-integration/z:acceptance
  c. Remove the proposal from a3p-integration.

