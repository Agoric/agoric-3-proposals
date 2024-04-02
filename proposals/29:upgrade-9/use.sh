#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# Set to zero so tests don't have to pay gas (we're not testing that)
sed --in-place=.bak s/'minimum-gas-prices = ""'/'minimum-gas-prices = "0ubld,0uist"'/ ~/.agoric/config/app.toml

# NOTE: agoric follow doesn't have the `--first-value-only` parameter in this version
# so we use a hack

# save somewhere we can access later
echo "Dumping PSM gov params..."
timeout 3 agoric follow -l :published.psm.${PSM_PAIR}.metrics -o jsonlines | tee /root/.agoric/psm_metrics.json
timeout 3 agoric follow -l :published.psm.${PSM_PAIR}.governance -o jsonlines | tee /root/.agoric/psm_governance.json
