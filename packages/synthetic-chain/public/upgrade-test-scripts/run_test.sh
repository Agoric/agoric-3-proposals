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

source ./env_setup.sh

cd /usr/src/proposals/"$PROPOSAL/" || fail "Proposal $PROPOSAL does not exist"

if test -f setup-test.sh
then
  echo "[$PROPOSAL] Running setup-test.sh"
  ./setup-test.sh
fi

echo "[$PROPOSAL] Starting agd"

startAgd

echo "[$PROPOSAL] Running test.sh."
./test.sh

echo "[$PROPOSAL] Testing completed."

killAgd

if test -f teardown-test.sh
then
  echo "[$PROPOSAL] Running teardown-test.sh"
  ./teardown-test.sh
fi
