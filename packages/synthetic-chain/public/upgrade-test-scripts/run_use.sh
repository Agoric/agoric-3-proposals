#!/bin/bash
# Starts agd in the background and runs action.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -eo pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# shellcheck source=./source.sh
source "$DIRECTORY_PATH/source.sh"

# shellcheck source=./env_setup.sh
source "$DIRECTORY_PATH/env_setup.sh"

PROPOSAL=$1
if [ -z "$PROPOSAL" ]; then
    fail "Must specify what proposal to use"
fi
PROPOSAL_DIR="/usr/src/proposals/$PROPOSAL/"

if [ ! -d "$PROPOSAL_DIR" ]; then
    fail "Proposal $PROPOSAL does not exist"
fi

if [ ! -f "$PROPOSAL_DIR/use.sh" ]; then
    echo "Proposal $PROPOSAL does not have a use.sh. Skipping."
    exit 0
fi

# figlet -f cyberlarge Use proposal
echo '
 _     _ _______ _______
 |     | |______ |______
 |_____| ______| |______

  _____   ______  _____   _____   _____  _______ _______
 |_____] |_____/ |     | |_____] |     | |______ |_____| |
 |       |    \_ |_____| |       |_____| ______| |     | |_____
'

echo "[$PROPOSAL] Starting agd in the background."
startAgd

echo "[$PROPOSAL] Agd started. Running use.sh."
cd "$PROPOSAL_DIR"
./use.sh

echo "[$PROPOSAL] Actions completed. Running for a few blocks and exiting."
waitForBlock 5

killAgd
