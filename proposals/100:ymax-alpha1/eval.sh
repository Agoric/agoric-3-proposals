#!/bin/bash
set -e

echo "[$PROPOSAL] Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js

# we will test deployment after 101 passes
