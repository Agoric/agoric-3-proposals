#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

ls -al

npm install --global tsx

agops inter bid by-price --price 1 --give 1.0IST --from $GOV1ADDR \
      --keyring-backend test --offer-id perpetual-open-bid-wf2

./performActions.ts

# let CORE_EVAL settle
waitForBlock 5
