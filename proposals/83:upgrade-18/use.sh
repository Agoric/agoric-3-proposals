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

# Econ Committee accept invitations for Committee and Charter
./acceptInvites.js

# "oracles" accept their invitations and provide prices to priceFeeds
./verifyPushedPrice.js 'ATOM' 12.01
./verifyPushedPrice.js 'stATOM' 12.01

./openVault.js
