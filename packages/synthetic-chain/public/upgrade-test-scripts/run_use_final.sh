#! /bin/bash

set -o errexit -o pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"

# shellcheck source=./source.sh
source "$DIRECTORY_PATH/source.sh"

if grep --silent "max-vats-online" < "$APP_CONFIG_FILE_PATH"
then
  sed "$APP_CONFIG_FILE_PATH" \
    --expression "s|max-vats-online =.*|max-vats-online = $MAX_RUNNING_VATS|" \
    --in-place
else
  sed "$APP_CONFIG_FILE_PATH" \
    --expression "/^\[swingset\]/a max-vats-online = $MAX_RUNNING_VATS" \
    --in-place
fi
