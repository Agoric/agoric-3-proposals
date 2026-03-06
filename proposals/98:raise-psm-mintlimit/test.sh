#!/bin/bash

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

pair="IST.USDC"
NOBLE_USDC_DENOM="ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9"

echo DEBUG test mint limit was adjusted
agd query vstorage data published.psm.${pair}.governance

# there are two instances in governance vstorage path, use latest
test_val $(agd query vstorage data published.psm.${pair}.governance | sed "s/^value: '//" | sed "s/'$//" | tr -d '\n' | jq -r '.values[-1] | fromjson | .body | sub("^#";"") | fromjson | .current.MintLimit.value.value | ltrimstr("+")') "$(node -p 'String(BigInt(1e6) * BigInt(1e6))')" "PSM MintLimit was reset to 1M"
