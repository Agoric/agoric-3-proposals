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

source /usr/src/upgrade-test-scripts/env_setup.sh

yarn ava post.test.js
