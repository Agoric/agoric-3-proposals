#!/bin/bash
# Starts agd in the background and runs action.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -e

ID=$1
if [ -z "$ID" ]; then
    echo "Must specify what proposal to use"
    exit 1
fi
PROPOSAL_PATH="/usr/src/proposals/$ID/"

if [ ! -d "$PROPOSAL_PATH" ]; then
    echo "Proposal $ID does not exist"
    exit 1
fi

if [ ! -f "$PROPOSAL_PATH/use.sh" ]; then
    echo "Proposal $ID does not have a use.sh. Skipping."
    exit 0
fi

source ./env_setup.sh

echo "Starting agd in the background."
startAgd

echo "Agd started. Running use.sh."
cd "$PROPOSAL_PATH"
./use.sh

echo "Actions completed. Running for a few blocks and exiting."
waitForBlock 5
