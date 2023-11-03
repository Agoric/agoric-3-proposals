#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

yarn install --frozen-lockfile

yarn ava pre.test.js

yarn global add tsx
./performActions.ts

./legacy.sh
