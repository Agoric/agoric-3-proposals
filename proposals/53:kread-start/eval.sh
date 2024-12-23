#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# ls -al

# echo "Starting KREAD mn2-start in eval.sh"

# # XXX using Ava serial to script the core-eval
yarn ava mn2-start.test.js
