#! /bin/bash

set -o errexit -o nounset -o pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

source "/usr/src/upgrade-test-scripts/source.sh"

sed "$SDK_SRC/packages/agoric-cli/src/lib/rpc.js" \
 --expression "s|agoriclocal|$CHAIN_ID|" \
 --in-place

printISTBalance() {
  addr=$(agd keys show -a "$1" --keyring-backend=test)
  agd query bank balances "$addr" -o json |
    jq -c '.balances[] | select(.denom=="uist")'

}

echo TEST: Offer with bad invitation
printISTBalance gov1

badInvitationOffer=$(mktemp)
cat >"$badInvitationOffer" <<'EOF'
{"body":"#{\"method\":\"executeOffer\",\"offer\":{\"id\":\"bad-invitation-15\",\"invitationSpec\":{\"callPipe\":[[\"badMethodName\"]],\"instancePath\":[\"reserve\"],\"source\":\"agoricContract\"},\"proposal\":{\"give\":{\"Collateral\":{\"brand\":\"$0.Alleged: IST brand\",\"value\":\"+15000\"}}}}}","slots":["board0257"]}
EOF

PATH=/usr/src/agoric-sdk/node_modules/.bin:$PATH
agops perf satisfaction --keyring-backend=test send --executeOffer "$badInvitationOffer" --from gov1 || true

printISTBalance gov1
