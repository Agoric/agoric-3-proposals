#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# No automated post-conditions are asserted for this recorded proposal.
# (Liquidate the reserve module account)
echo "proposal 112:reserve-liquidate: no acceptance test defined"
