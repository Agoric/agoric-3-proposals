#! /bin/bash

export AGORIC_HOME="$HOME/.agoric"
export CHAIN_ID="agoriclocal"
export MAX_RUNNING_VATS="10"

export APP_CONFIG_FILE_PATH="$AGORIC_HOME/config/app.toml"
# Backward compatibility
export CHAINID="$CHAIN_ID"
