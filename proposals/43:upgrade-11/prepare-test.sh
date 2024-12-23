#!/bin/bash

set -o errexit -o xtrace

cat "$HOME/.agoric/last_observed_block_height"
cat "$HOME/.agoric/config/app.toml"
