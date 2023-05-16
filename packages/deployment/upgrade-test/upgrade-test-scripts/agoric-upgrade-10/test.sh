#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# provision pool has right balance 
test_val $(agd query bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | first | .amount ') "19250000"


if [[ "$BOOTSTRAP_MODE" == "test" ]]; then

    test_val $(agd q vstorage children published.vaultFactory.managers.manager0.vaults -o json | jq -r '.children | length') 2 "we only have two vaults"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.numActiveVaults') 1 "only one vault is active"

    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalDebt.value') "6030000" "totalDebt is correct"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalCollateral.value') "8000000" "totalCollateral is correct"

    # gov1 vault0
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.vaultState') "active" "vault0 is open"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.locked.value') "8000000" "vault0 contains 8 ATOM collateral"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.debtSnapshot.debt.value') "6030000" "vault0 debt is 6.03 IST"

    # gov1 vault1
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.vaultState') "closed" "vault1 is closed"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.locked.value') "0" "vault1 contains no collateral"
    test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault1 has no debt"

fi