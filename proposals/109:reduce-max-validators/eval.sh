#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# shellcheck disable=SC2086
agd tx gov submit-proposal reduce-max-validators.json \
	${SIGN_BROADCAST_OPTS="--missing-env-setup"}

voteLatestProposalAndWait
