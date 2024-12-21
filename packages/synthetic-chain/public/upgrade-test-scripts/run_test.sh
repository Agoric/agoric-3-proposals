#!/bin/bash
# Starts agd in the background and runs test.sh against it in the foreground
# Note that STDOUT mixes the two. TODO separate them cleanly with log output.

set -eo pipefail

PROPOSAL=$1
if [ -z "$PROPOSAL" ]; then
  fail "Must specify what proposal to use"
fi

# figlet -f cyberlarge Test proposal outcome
echo '
 _______ _______ _______ _______
    |    |______ |______    |
    |    |______ ______|    |

  _____   ______  _____   _____   _____  _______ _______
 |_____] |_____/ |     | |_____] |     | |______ |_____| |
 |       |    \_ |_____| |       |_____| ______| |     | |_____

  _____  _     _ _______ _______  _____  _______ _______
 |     | |     |    |    |       |     | |  |  | |______
 |_____| |_____|    |    |_____  |_____| |  |  | |______
'

echo "[$PROPOSAL] Starting agd"

source ./env_setup.sh
startAgd

echo "[$PROPOSAL] Running test.sh."
cd /usr/src/proposals/"$PROPOSAL/" || fail "Proposal $PROPOSAL does not exist"
./test.sh

echo "[$PROPOSAL] Testing completed."

PID_FILE="$HOME/.agoric/agd.pid"

if test -f "$PID_FILE"
then
  PID="$(cat "$PID_FILE")"
  if ps --pid "$PID" > /dev/null
  then
    echo "Running chain process: $PID"
    echo "Block Height: $(agd status | jq --raw-output '.SyncInfo.latest_block_height')"
  else
    echo "Chain process not running"
  fi
else
  echo "No pid file found"
fi
