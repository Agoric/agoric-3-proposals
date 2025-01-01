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

echo "[$PROPOSAL] Agd started. Running CoreEval submission."
cd /usr/src/proposals/"$PROPOSAL/" || fail "Proposal $PROPOSAL does not exist"

if [ -f "eval.sh" ]; then
    # this is what the script used to do. Also allows a proposal to override how they are eval-ed
    echo "[$PROPOSAL] Running eval.sh"
    ./eval.sh
else
    # newer proposals declare a submission
    echo "[$PROPOSAL] Running proposal declared in package.json"
    # copy to run in the proposal package so the dependencies can be resolved
    cp /usr/src/upgrade-test-scripts/eval_submission.js .
    ./eval_submission.js
fi

echo "[$PROPOSAL] Eval completed. Running 10 blocks and exiting."
waitForBlock 10

killAgd
