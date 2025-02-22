#! /bin/bash

set -o errexit

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

source "/usr/src/upgrade-test-scripts/source.sh"

sed "$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib/index.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

sed "$SDK_SRC/packages/client-utils/src/network-config.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

echo "[$PROPOSAL] Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js

echo "[$PROPOSAL] Waiting for contract instance to start"
source /usr/src/upgrade-test-scripts/env_setup.sh
# XXX found experimentally; some waiting was necessary; would be better to poll with timeout
waitForBlock 5
test_not_val "$(agd q vstorage data published.fastUsdc -o json | jq -r .value)" "" "ensure contract started"
