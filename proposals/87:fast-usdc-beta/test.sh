#! /bin/bash

set -o errexit -o nounset -o pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

source "/usr/src/upgrade-test-scripts/source.sh"

sed "$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib/index.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

sed "$SDK_SRC/packages/client-utils/src/network-config.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

# segregate so changing these does not invalidate the proposal image
# à la https://github.com/Agoric/agoric-3-proposals/pull/213
cd test

yarn ava
