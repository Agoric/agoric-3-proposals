#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# Expect the mint module inflation bounds to match proposal 116.
params="$(agd query mint params -o json)"
test_val \
  "$(echo "$params" | jq -r '.inflation_min')" \
  "0.020000000000000000" \
  'mint inflation_min'
test_val \
  "$(echo "$params" | jq -r '.inflation_max')" \
  "0.030000000000000000" \
  'mint inflation_max'
