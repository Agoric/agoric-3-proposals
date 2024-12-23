#!/bin/bash

set -o errexit

SNAPSHOT_INTERVAL="$(($(cat "$HOME/.agoric/last_observed_block_height") + 2))"
sed "/^\[state-sync]/,/^\[/{s/^snapshot-interval[[:space:]]*=.*/snapshot-interval = $SNAPSHOT_INTERVAL/}" \
 "$HOME/.agoric/config/app.toml" \
 --in-place

cat "$HOME/.agoric/last_observed_block_height"
cat "$HOME/.agoric/config/app.toml"
