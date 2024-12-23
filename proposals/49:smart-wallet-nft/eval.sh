#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# ls -al

# # XXX using Ava serial to script the core-eval
yarn ava upgrade-wf.test.js
