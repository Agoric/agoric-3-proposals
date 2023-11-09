#!/bin/bash
# Starts agd in the background and runs eval.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -e

source ./env_setup.sh

PROPOSAL_PATH=$1

startAgd

echo "Agd started. Running eval.sh."
cd /usr/src/proposals/"$PROPOSAL_PATH/" || exit
./eval.sh

echo "Eval completed. Running 10 blocks and exiting."
waitForBlock 10
