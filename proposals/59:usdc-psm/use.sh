#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

govaccounts=("$GOV1ADDR" "$GOV2ADDR" "$GOV3ADDR")
pair="IST.USDC"

source "$HOME/.agoric/envs"
waitForBlock 2

# Proposing this parameter change in USE layer to make it a part of history
echo DEBUG Propose a vote to raise the mint limit
# Propose a vote to raise the mint limit
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
oid=$(echo "$(agd q vstorage data published.wallet.$GOV1ADDR.current -o json | jq -r .value)" | sed "s/^value: '//" | sed "s/'$//" | tr -d '\n' | jq -r '.values[] | fromjson | .body | sub("^#";"") | fromjson | .offerToUsedInvitation[][] | select(type == "string" and startswith("ecCharter-"))' | head -n 1)
agops psm proposeChangeMintLimit --pair ${pair} --limit 133345 --previousOfferId "${oid}" >|"$PROPOSAL_OFFER"
jq '.body | ltrimstr("#") | fromjson' <"$PROPOSAL_OFFER"
agops perf satisfaction --from $GOV1ADDR --executeOffer $PROPOSAL_OFFER --keyring-backend=test

waitForBlock 3
num_accounts=${#govaccounts[@]}

# only need majority votes
for ((idx = 0; idx < num_accounts - 1; idx++)); do
    currentAccount="${govaccounts[idx]}"
    currentOfferId=$(agops ec find-continuing-ids --from "$currentAccount" | jq -r 'select(.offerId | startswith("gov-committee")) | .offerId')
    echo "DEBUG vote on the question that was made"
    echo "$currentAccount using offer ID ${currentOfferId}"
    agops ec vote --send-from "$currentAccount" --forPosition 0 --offerId "${currentOfferId}"
done

# wait for election to be resolved
sleep 60
