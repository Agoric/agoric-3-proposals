#!/bin/bash

# Exit when any command fails
set -e

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PATCH_PATH="$DIRECTORY_PATH/agops.patch"

source /usr/src/upgrade-test-scripts/env_setup.sh

patch_files "/usr/src/agoric-sdk/packages/agoric-cli/src/lib" "$PATCH_PATH"

ls -al

yarn ava pre.test.js

./performActions.js

./restore-pruned-artifacts.sh
