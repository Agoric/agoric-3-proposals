# reverse-engineer Proposal 61: Lower bundle cost

# `agd tx gov submit-proposal param-change` seems
# to JSON.stringify the value in the proposal.
# So we need to `fromjson` it before feeding it back to `agd`.
lower-bundle-cost.json: tx-61.json
	jq '.tx.body.messages[0].content | .changes[0].value |= fromjson' tx-61.json >$@

PROPOSAL=61
proposer-61.json:
	agd --node $(ARCHIVE_NODE) query gov proposer $(PROPOSAL) -o json >$@

tx-hist-proposer-61.json: proposer-61.json
	PROPOSER="$$(jq -r .proposer proposer-61.json)"; \
	agd --node $(ARCHIVE_NODE) query txs --events="message.sender=$$PROPOSER" -o json >$@

tx-61.json: tx-hist-proposer-61.json
	jq '.txs | .[] | select(.tx.body.messages[0].content["@type"] == "/cosmos.params.v1beta1.ParameterChangeProposal")' \
		tx-hist-proposer-61.json >$@

# clean up locally computed files
clean:
	rm -f lower-bundle-cost.json

# clean up files cached from the network as well
realclean: clean
	rm -f tx-61.json proposer-61.json tx-hist-proposer-61.json
