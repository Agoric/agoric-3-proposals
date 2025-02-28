# agoric-3-proposals

This is a special branch which generates an a3p image for a test chain (currently configured for emerynet)

To use this, first merge master in this branch so that any new proposals can be incorporated in the image

Then run the workflow (it should automatically trigger on a new commit)

The workflow will upload the files (data, config and keyring folder) to the configured cloud storage path

Those files can then be used to boot a fresh emerynet chain

Though the approach used is generic and an image for any chain can be generated by just changing the `CHAIN_ID` inside `packages/synthetic-chain/public/upgrade-test-scripts/source.sh`. The `MONIKER` can also be configured to your liking (inside the same file) though it can always be changes later when initializing the chain by a simple replace in the `config.toml`
