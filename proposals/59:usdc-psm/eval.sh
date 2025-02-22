#! /bin/bash

set -o errexit

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
PATCH_DIRECTORY_PATH="$DIRECTORY_PATH/node_modules/@agoric/synthetic-chain/dist/lib"
PATCH_PATH="$DIRECTORY_PATH/synthetic-chain.patch"

source /usr/src/upgrade-test-scripts/env_setup.sh

patch_files "$PATCH_DIRECTORY_PATH" "$PATCH_PATH"

cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js
