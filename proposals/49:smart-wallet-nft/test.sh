#!/bin/bash

set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

testMinChildren() {
    path=$1
    min=$2
    line="$(agd query vstorage children $path -o jsonlines)"
    ok=$(echo $line | jq ".children | length | . > $min")
    test_val "$ok" "true" "$path: more than $min children"
}

# Check brand aux data for more than just vbank assets
testMinChildren published.boardAux 3

# TODO trade game asset

# Check that gov1's bid from upgrade-10 use is still live
ADDR=$(agd keys show --address gov1 --keyring-backend=test)
agd query vstorage data published.wallet.$ADDR.current --output=json | jq -r ".value|fromjson.values[0]|fromjson.body" | tr "#" " " | jq .liveOffers >liveOffers.json
echo Live offers:
jq <liveOffers.json
grep "bid-1701709689406" liveOffers.json
# bid-1701709689406 from upgrade-10 and a closeVault that hasn't completed
test_val $(jq '.|length' <liveOffers.json) 2 "gov1 live offers"
