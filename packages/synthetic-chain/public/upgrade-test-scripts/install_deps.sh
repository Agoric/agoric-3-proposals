#!/bin/bash

set -e

PROPOSAL_PATH=$1

if [ -z "$PROPOSAL_PATH" ]; then
    echo "Must specify what proposal to install"
    exit 1
fi

# The base image is Node 16.9, which supports Corepack.
# Yarn v4 requires Node 18+ but so far it's working with 16.19.
export YARN_IGNORE_NODE=1

corepack enable

# Run where this script is
cd "$(dirname "$(realpath -- "$0")")"

# TODO consider yarn workspaces to install all in one command
cd "../proposals/$PROPOSAL_PATH"

if test -f "yarn.lock"; then
    yarn --version # only Berry supported, so next commands will fail on classic
    yarn config set --home enableTelemetry 0
    yarn install --immutable
fi
