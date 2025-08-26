# proposal 103

## Derivation

## Fetch proposal

```sh
scripts/fetch-all-bundles.ts
scripts/add-proposal.ts 103 ymax-alpha2
```

## correct oldBoardId

```sh
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
```

`sed s/board013515/board010155/g`
