#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

if [ -z "$SIGN_BROADCAST_OPTS" ]; then
  echo >&2 'Missing SIGN_BROADCAST_OPTS!'
  exit 1
fi

# Fund the proposer for the deposit and fees.
agd tx bank send validator "$GOV1ADDR" 10000000000ubld $SIGN_BROADCAST_OPTS

# On-chain proposal 116 was a gov v1 /cosmos.mint.v1beta1.MsgUpdateParams. The
# synthetic-chain build only routes the three legacy proposal types through a
# stage, so this directory is typed as a ParameterChangeProposal to reach the
# EVAL stage, and this eval.sh submits the real gov v1 message from
# mint-params.json.
# shellcheck disable=SC2086
agd tx gov submit-proposal mint-params.json $SIGN_BROADCAST_OPTS

voteLatestProposalAndWait
