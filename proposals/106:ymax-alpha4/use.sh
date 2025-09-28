#!/bin/bash
echo == redeem new invitation for ymaxControl in ymax-alpha4

set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

./use-invitation.js
