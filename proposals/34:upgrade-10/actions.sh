#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/agoric-sdk/upgrade-test-scripts/env_setup.sh

yarn install

yarn ava 34:upgrade-10/pre.test.js

./performActions.js

./legacy.sh
