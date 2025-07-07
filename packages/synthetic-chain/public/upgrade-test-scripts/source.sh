#! /bin/bash

export AGORIC_HOME="$HOME/.agoric"
export BLD_DENOM="ubld"
export CHAIN_ID="agoriclocal"
export MAX_RUNNING_VATS="5"
export MONIKER="localnet"
export VOTING_PERIOD="10"

export APP_CONFIG_FILE_PATH="$AGORIC_HOME/config/app.toml"
# Backward compatibility
export CHAINID="$CHAIN_ID"
export CONFIG_FILE_PATH="$AGORIC_HOME/config/config.toml"
export GENESIS_FILE_PATH="$AGORIC_HOME/config/genesis.json"
