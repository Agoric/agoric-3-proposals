#!/bin/bash
set -euo pipefail

agd q vstorage data published.agoricNames.instance

agd q vstorage data published.agoricNames.instance -o json \
  | jq -r --arg NAME "ymax0" '
      .value
      | fromjson
      | .values[0]
      | fromjson
      | . as $root
      | ($root.body | ltrimstr("#") | fromjson) as $pairs
      | $pairs | map(.[0]) | index($NAME) as $i
      | $root.slots[$i]
  '


