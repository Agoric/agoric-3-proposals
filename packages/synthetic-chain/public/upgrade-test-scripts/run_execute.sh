#!/bin/bash

set -eo pipefail

# figlet -f cyberlarge Execute upgrade
echo -e '
 _______ _     _ _______ _______ _     _ _______ _______
 |______  \___/  |______ |       |     |    |    |______
 |______ _/   \_ |______ |_____  |_____|    |    |______

 _     _  _____   ______  ______ _______ ______  _______
 |     | |_____] |  ____ |_____/ |_____| |     \ |______
 |_____| |       |_____| |    \_ |     | |_____/ |______
'
echo "Execute the upgrade in consensus"

source ./env_setup.sh

PLAN_NAME=$1
if [ -z "$PLAN_NAME" ]; then
  fail "Must specify the plan name of the upgrade"
fi

FOUND_PLAN_NAME="$(jq -r .name $HOME/.agoric/data/upgrade-info.json)"

[ "$PLAN_NAME" = "$FOUND_PLAN_NAME" ] || fail "Upgrade plan name $FOUND_PLAN_NAME does not match the expected value $PLAN_NAME" 

startAgd

echo "Run several blocks for the upgrade to settle, then exit"
waitForBlock 5
killAgd
