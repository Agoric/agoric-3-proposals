#! /bin/bash

export ATOM_DENOM="ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA"
export CHAIN_ID="agoric-emerynet-9"
export GAS_ADJUSTMENT="1.2"
export GOV1_MNEMONIC="such field health riot cost kitten silly tube flash wrap festival portion imitate this make question host bitter puppy wait area glide soldier knee"
export GOV2_MNEMONIC="physical immune cargo feel crawl style fox require inhale law local glory cheese bring swear royal spy buyer diesel field when task spin alley"
export GOV3_MNEMONIC="tackle hen gap lady bike explain erode midnight marriage wide upset culture model select dial trial swim wood step scan intact what card symptom"
export MONIKER="validator-primary-0"
export PID_FILE="$HOME/.agoric/agd.pid"
export PSM_PAIR="IST.USDC_axl"
export SDK_SRC="${AGORIC_SDK:-"/usr/src/agoric-sdk"}"
export STATUS_FILE="$HOME/.agoric/last_observed_status"
export USDC_DENOM="ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F"

# Backward compatibility
export CHAINID="$CHAIN_ID"
# gas=200000 is the default but gas used may be higher or lower. Setting it to "auto" makes the proposal executions less brittle.
export SIGN_BROADCAST_OPTS="\
--broadcast-mode block \
--chain-id $CHAIN_ID \
--from validator \
--gas-adjustment $GAS_ADJUSTMENT \
--gas auto \
--keyring-backend test \
--yes \
"
