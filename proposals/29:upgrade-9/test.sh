#!/bin/bash
source /usr/src/upgrade-test-scripts/env_setup.sh

test_val $(agd q vstorage children published.psm.IST -o json | jq -r '.children | length') 4
test_val $(agd q vstorage children published.psm.IST -o json | jq -r '.children | first') ${PSM_PAIR//IST./}

test_wallet_state() {
    addr=$1
    want=$2
    desc=$3
    body="$(timeout 3 agoric follow -l ":published.wallet.$addr" -o text | jq -r '.body')"
    case $body in
    *'"@qclass":'*) state=old ;;
    '#{}') state=upgraded ;;
    '#'*) state=revived ;;
    *) state=$body ;;
    esac
    test_val "$state" "$want" "$desc"
}

test_wallet_state "$USER1ADDR" old "user1 wallet is old"
test_wallet_state "$GOV1ADDR" old "gov1 wallet is old"
test_wallet_state "$GOV2ADDR" old "gov2 wallet is old"
test_wallet_state "$GOV3ADDR" old "gov3 wallet is old"

YARN_IGNORE_NODE=1 yarn ava
