#!/bin/bash
set -e

echo "[$PROPOSAL] Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js

echo "[$PROPOSAL] Waiting for contract instance to start"
source /usr/src/upgrade-test-scripts/env_setup.sh
# XXX found experimentally; some waiting was necessary; would be better to poll with timeout
waitForBlock 5
