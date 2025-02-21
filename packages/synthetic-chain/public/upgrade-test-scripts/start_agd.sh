#!/bin/bash
# Start and leave agd running

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# shellcheck source=./source.sh
source "$DIRECTORY_PATH/source.sh"

grep -qF 'env_setup.sh' /root/.bashrc || echo "source $DIRECTORY_PATH/env_setup.sh" >>/root/.bashrc
grep -qF 'printKeys' /root/.bashrc || echo "printKeys" >>/root/.bashrc

# shellcheck source=./env_setup.sh
source "$DIRECTORY_PATH/env_setup.sh"

# start_agd never builds an image so it's safe to include this multigigabyte logfile
export SLOGFILE=slog.slog

# don't use startAgd() because that backgrounds
echo "Starting agd in foreground"
agd start --log_level warn "$@"
