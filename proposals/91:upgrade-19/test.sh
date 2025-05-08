#!/bin/bash

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# segregate so changing these does not invalidate the proposal image
# à la https://github.com/Agoric/agoric-3-proposals/pull/213
cd test

GLOBIGNORE=initial.test.js
yarn ava initial.test.js
yarn ava *.test.js

pair="IST.USDC"
NOBLE_USDC_DENOM="ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9"


echo DEBUG test mint limit was adjusted
agd query vstorage data published.psm.${pair}.governance

# u19 reset the mint limit to default
test_val $(agd query vstorage data published.psm.${pair}.governance | sed "s/^value: '//" | sed "s/'$//" | tr -d '\n' | jq -r '.values[] | fromjson | .body | sub("^#";"") | fromjson | .current.MintLimit.value.value | ltrimstr("+")') "1000000000" "PSM MintLimit was reset to default"

agd tx --keyring-backend=test bank send validator $GOV1ADDR "3000000000${NOBLE_USDC_DENOM}" --from=provision --chain-id=agoriclocal --yes
waitForBlock 3

agd q bank balances $GOV1ADDR --output=json
echo DEBUG execute PSM swap
SWAP_OFFER=$(mktemp -t agops.XXX)
agops psm swap --pair ${pair} --wantMinted 1001.00 --feePct 0.10 >|"$SWAP_OFFER"
OUTPUT=$(agops perf satisfaction --from $GOV1ADDR --executeOffer "$SWAP_OFFER" --keyring-backend=test 2>&1 || true)
echo "$OUTPUT" | grep "Request would exceed mint limit"
