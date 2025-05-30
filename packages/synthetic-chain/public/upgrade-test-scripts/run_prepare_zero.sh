#!/bin/bash
# Prepare an upgrade from ag0

set -eo pipefail

# The name of the binary is an implementation detail.
agd() {
  ag0 ${1+"$@"}
}

agd init localnet --chain-id agoriclocal

allaccounts=("gov1" "gov2" "gov3" "user1" "validator")
# WARNING: these mnemonics are purely for testing purposes, do not implement
# features that depend on them in any way.
# The mnemonics below corresponds to elements in `allaccounts` with matching indices
allkeys=(
  "such field health riot cost kitten silly tube flash wrap festival portion imitate this make question host bitter puppy wait area glide soldier knee"
  "physical immune cargo feel crawl style fox require inhale law local glory cheese bring swear royal spy buyer diesel field when task spin alley"
  "tackle hen gap lady bike explain erode midnight marriage wide upset culture model select dial trial swim wood step scan intact what card symptom"
  "spike siege world rather ordinary upper napkin voice brush oppose junior route trim crush expire angry seminar anchor panther piano image pepper chest alone"
  "soap hub stick bomb dish index wing shield cruel board siren force glory assault rotate busy area topple resource okay clown wedding hint unhappy"
)
for i in "${!allaccounts[@]}"; do
  echo "${allkeys[$i]}" | agd keys add ${allaccounts[$i]} --recover --keyring-backend=test 2>&1
done

source /usr/src/upgrade-test-scripts/env_setup.sh

sed -i.bak "s/^timeout_commit =.*/timeout_commit = \"1s\"/" "$HOME/.agoric/config/config.toml"
sed -i.bak "s/^enabled-unsafe-cors =.*/enabled-unsafe-cors = true/" "$HOME/.agoric/config/app.toml"
sed -i.bak "s/^enable-unsafe-cors =.*/enable-unsafe-cors = true/" "$HOME/.agoric/config/app.toml"
sed -i.bak "s/127.0.0.1:26657/0.0.0.0:26657/" "$HOME/.agoric/config/config.toml"
sed -i.bak "s/cors_allowed_origins = \[\]/cors_allowed_origins = \[\"*\"\]/" "$HOME/.agoric/config/config.toml"
sed -i.bak '/^\[api]/,/^\[/{s/^enable[[:space:]]*=.*/enable = true/}' "$HOME/.agoric/config/app.toml"
sed -i.bak "s/^pruning =.*/pruning = \"nothing\"/" "$HOME/.agoric/config/app.toml"

contents="$(jq ".app_state.crisis.constant_fee.denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.mint.params.mint_denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.gov.deposit_params.min_deposit[0].denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.staking.params.bond_denom = \"ubld\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
contents="$(jq ".app_state.slashing.params.signed_blocks_window = \"20000\"" "$HOME/.agoric/config/genesis.json")" && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
contents=$(jq '. * { app_state: { gov: { voting_params: { voting_period: "10s" } } } }' "$HOME/.agoric/config/genesis.json") && echo -E "${contents}" >"$HOME/.agoric/config/genesis.json"
export GENACCT=$(agd keys show validator -a --keyring-backend="test")
echo "Genesis Account $GENACCT"

denoms=(
  "ibc/toyusdc"                                                          #test_usdc
  "ibc/06362C6F7F4FB702B94C13CD2E7C03DEC357683FD978936340B43FBFBC5351EB" #test_atom
  "ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA" #main_ATOM
  "ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F" #main_usdc_axl
  "ibc/6831292903487E58BF9A195FDDC8A2E626B3DF39B88F4E7F41C935CADBAF54AC" #main_usdc_grav
  "ibc/F2331645B9683116188EF36FC04A809C28BD36B54555E8705A37146D0182F045" #main_usdt_axl
  "ibc/386D09AE31DA7C0C93091BB45D08CB7A0730B1F697CD813F06A5446DCF02EEB2" #main_usdt_grv
  "ibc/3914BDEF46F429A26917E4D8D434620EC4817DC6B6E68FB327E190902F1E9242" #main_dai_axl
  "ibc/3D5291C23D776C3AA7A7ABB34C7B023193ECD2BC42EA19D3165B2CF9652117E7" #main_dai_grv
  "ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9" #noble_usdc
  "provisionpass"                                                        #for swingset provisioning
)

camount="1000000000000000000"
coins="${camount}ubld"
for i in "${denoms[@]}"; do
  coins="${coins},${camount}${i}"
done

agd add-genesis-account "$GENACCT" "$coins"

agd gentx validator 5000000000ubld --keyring-backend="test" --chain-id "$CHAINID"
agd collect-gentxs
startAgd

voting_period_s=10
latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
height=$((latest_height + voting_period_s + 20))
info=${UPGRADE_INFO-"{}"}
if echo "$info" | jq .; then
  echo "upgrade-info: $info"
else
  status=$?
  echo "Upgrade info is not valid JSON: $info"
  exit $status
fi
# shellcheck disable=SC2086
agd tx gov submit-proposal software-upgrade "$UPGRADE_TO" \
  --upgrade-height="$height" --upgrade-info="$info" \
  --title="Upgrade to ${UPGRADE_TO}" --description="upgrades" \
  ${SIGN_BROADCAST_OPTS="--missing-env-setup"}
waitForBlock

voteLatestProposalAndWait

echo "Chain in to-be-upgraded state for $UPGRADE_TO"

while true; do
  latest_height=$(agd status | jq -r .SyncInfo.latest_block_height)
  if [ "$latest_height" -ge "$height" ]; then
    echo "Upgrade height for $UPGRADE_TO reached. Killing agd"
    echo "(CONSENSUS FAILURE above for height $height is expected)"
    break
  fi
  echo "Waiting for upgrade height for $UPGRADE_TO to be reached (need $height, have $latest_height)"
  sleep 1
done

killAgd
echo "state directory $HOME/.agoric ready for upgrade to $UPGRADE_TO"
