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
