#!/bin/bash
# Starts agd in the background and runs eval.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -eo pipefail

source ./env_setup.sh

PROPOSAL=$1
if [ -z "$PROPOSAL" ]; then
    fail "Must specify what proposal to use"
fi

startAgd

echo "[$PROPOSAL] Agd started. Submitting proposal."
cd /usr/src/proposals/"$PROPOSAL/" || fail "Proposal $PROPOSAL does not exist"

if [ -f "eval.sh" ]; then
    # Allows a proposal to control its evaluation; used in particular for
    # param-change proposals but also valid for other types such as core-eval.
    echo "[$PROPOSAL] Running eval.sh"
    ./eval.sh
else
    # Straightforward core-eval proposals can be specified directly in a "submission" directory
    # containing $name.js scripts, $name-permit.json permits, and b1-$hash.json bundles.
    echo "[$PROPOSAL] Running core-evals from submission/"
    # copy to run in the proposal package so the dependencies can be resolved
    cp /usr/src/upgrade-test-scripts/eval_submission.js .
    ./eval_submission.js
fi

echo "[$PROPOSAL] Proposal eval completed. Running 10 blocks and exiting."
waitForBlock 10

killAgd
