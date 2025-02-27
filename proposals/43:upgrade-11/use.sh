#! /bin/bash

set -o errexit

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# shellcheck source=../../packages/synthetic-chain/public/upgrade-test-scripts/source.sh
source "/usr/src/upgrade-test-scripts/source.sh"

sed "$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib/index.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

sed "$SDK_SRC/packages/agoric-cli/src/lib/rpc.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

# shellcheck source=../../packages/synthetic-chain/public/upgrade-test-scripts/env_setup.sh
source /usr/src/upgrade-test-scripts/env_setup.sh

yarn ava pre.test.js

./performActions.js

./restore-pruned-artifacts.sh
