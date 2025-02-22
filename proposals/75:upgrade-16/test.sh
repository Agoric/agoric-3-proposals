#! /bin/bash

set -o errexit

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

source "/usr/src/upgrade-test-scripts/source.sh"

sed "$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib/index.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

sed "$SDK_SRC/packages/agoric-cli/src/lib/rpc.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

GLOBIGNORE=initial.test.js

# test the state right after upgrade
yarn ava initial.test.js

# test more, in ways that changes system state
yarn ava ./*.test.js
