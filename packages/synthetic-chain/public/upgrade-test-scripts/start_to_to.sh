#!/bin/bash
# Prepare or execute an upgrade
# XXX retained for backwards compatibility

echo "DEPRECATED start_to_to; migrate start to @agoric/synthetic-chain 0.0.5 or later"

grep -qF 'env_setup.sh' /root/.bashrc || echo "source /usr/src/upgrade-test-scripts/env_setup.sh" >>/root/.bashrc
grep -qF 'printKeys' /root/.bashrc || echo "printKeys" >>/root/.bashrc

source ./env_setup.sh

startAgd

if [[ -z "${UPGRADE_TO}" ]]; then
  echo "no upgrade set.  running for a few blocks and exiting"
  waitForBlock 5
  exit 0
fi

voting_period_s=10
latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
height=$((latest_height + voting_period_s + 10))
info=${UPGRADE_INFO-"{}"}
if echo "$info" | jq .; then
  echo "upgrade-info: $info"
else
  status=$?
  echo "Upgrade info is not valid JSON: $info"
  exit $status
fi
# shellcheck disable=SC2086
agd tx gov submit-proposal software-upgrade "$UPGRADE_TO" \
  --upgrade-height="$height" --upgrade-info="$info" \
  --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" \
  ${SUBMIT_PROPOSAL_OPTS="--missing-env-setup"}
waitForBlock

voteLatestProposalAndWait

echo "Chain in to-be-upgraded state for $UPGRADE_TO"

while true; do
  latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
  if [ "$latest_height" != "$height" ]; then
    echo "Waiting for upgrade height for $UPGRADE_TO to be reached (need $height, have $latest_height)"
    sleep 1
  else
    echo "Upgrade height for $UPGRADE_TO reached. Killing agd"
    echo "(CONSENSUS FAILURE above for height $height is expected)"
    break
  fi
done

sleep 2
killAgd
echo "state directory $HOME/.agoric ready for upgrade to $UPGRADE_TO"
