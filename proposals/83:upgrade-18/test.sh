#! /bin/bash

set -o errexit -o nounset -o pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

source "/usr/src/upgrade-test-scripts/source.sh"

sed "$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib/index.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

sed "$SDK_SRC/packages/agoric-cli/src/lib/rpc.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

source /usr/src/upgrade-test-scripts/env_setup.sh

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

test_val \
  "$(agd q swingset params -o json | jq -Sc .vat_cleanup_budget)" \
  '[{"key":"default","value":"5"},{"key":"kv","value":"50"}]' \
  'vat cleanup budget'

# suppress file names from glob that run earlier
GLOBIGNORE=initial.test.js

# test the state right after upgrade
yarn ava initial.test.js

# test more, in ways that change system state
yarn ava ./*.test.js
