#!/bin/bash

source /usr/src/upgrade-test-scripts/env_setup.sh

echo check for USDC in psm pairs
agd query vstorage children published.psm.IST | grep USDC

echo DEBUG print mint limit
pair="IST.USDC"
agops psm info --pair ${pair}

# test mint limit was adjusted
echo DEBUG test mint limit was adjusted
agd query vstorage data published.psm.${pair}.governance

test_val $(agd query vstorage data published.psm.${pair}.governance | sed "s/^value: '//" | sed "s/'$//" | tr -d '\n' | jq -r '.values[] | fromjson | .body | sub("^#";"") | fromjson | .current.MintLimit.value.value | ltrimstr("+")') "133345000000" "PSM MintLimit set correctly"
