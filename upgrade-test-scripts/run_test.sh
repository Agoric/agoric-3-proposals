#!/bin/bash
# Starts agd in the background and runs test.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -e

source ./env_setup.sh

PROPOSAL_PATH=$1

startAgd

echo "Agd started. Running test.sh."
cd /usr/src/proposals/"$PROPOSAL_PATH/" || exit
./test.sh

echo "Testing completed."
