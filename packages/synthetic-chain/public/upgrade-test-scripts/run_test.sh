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

OTEL_CONFIG="otel-config.yaml"

if test -f setup-test.sh
then
  echo "[$PROPOSAL] Running setup-test.sh"
  ./setup-test.sh
fi

if test -f "$OTEL_CONFIG"
then
  export OTEL_EXPORTER_PROMETHEUS_PORT="26661"
  DIRECTORY="/root/$PROPOSAL_NAME"
  LOG_FILE="$DIRECTORY/otel.logs"
  echo "[$PROPOSAL] Starting otel server with prometheus server on $OTEL_EXPORTER_PROMETHEUS_PORT port"

  touch $LOG_FILE

  sed \
   --expression "s|\$EXPORT_DIRECTORY|$DIRECTORY|" \
   --expression "s|\$OTEL_EXPORTER_PROMETHEUS_PORT|$OTEL_EXPORTER_PROMETHEUS_PORT|" \
   "$OTEL_CONFIG"
  otelcol-contrib --config "$OTEL_CONFIG" > "$LOG_FILE" 2>&1 &
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

if test -f "$OTEL_CONFIG"
then
  echo "[$PROPOSAL] Killing otel server"

  # shellcheck disable=SC2009
  PID="$(ps aux | grep -v grep | grep /root/otelcol-contrib | awk '{printf "%s", $2}')"
  test -z "$PID" || kill -SIGTERM "$PID"
fi
