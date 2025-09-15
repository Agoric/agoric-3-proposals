#!/bin/bash
set -e

expected=30

params="$(agd query staking params -o json)"
maxv="$(echo $params | jq -r ".max_validators")"

# fail if cost is not expected
if [ "$maxv" != "$expected" ]; then
    echo "Expected max_validators $expected, got $maxv"
    exit 1
else
    echo "max_validators is $maxv"
fi
