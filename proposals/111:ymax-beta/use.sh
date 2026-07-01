#!/bin/bash
echo == accept ymaxControl for ymax0 and ymax1 as proposal 111 did on mainnet

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# ymax0Control's key already exists in the synthetic chain from earlier ymax
# proposals (its smart wallet is provisioned); reference it by address.
ymax0Addr="agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh"

# WARNING: For any mnemonic phrase you use to secure your own assets,
# take care to keep it strictly confidential!
# The mnemonic here is only for testing.
mnemonic="swing matrix country boring segment void similar cliff illness any pulse object quantum viable unveil carbon gap thunder merge screen combine core dog control"

echo "$mnemonic" | agd keys add ymax1Control --recover --keyring-backend=test
ymax1Addr="$(agd keys show -a ymax1Control --keyring-backend=test)"

provisionSmartWallet "$ymax1Addr" "200000000ubld"

echo "== deposit some IST..."
agd tx bank send gov1 $ymax0Addr 20000000uist $SIGN_BROADCAST_OPTS --from gov1
agd tx bank send gov1 $ymax1Addr 20000000uist $SIGN_BROADCAST_OPTS --from gov1

echo "== redeem invitations..."
./use-invitation.js $ymax0Addr # accept fresh ymax0 control
./use-invitation.js $ymax1Addr # accept ymax1 control
