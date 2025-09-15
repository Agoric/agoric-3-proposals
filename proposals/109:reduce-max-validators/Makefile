# reverse-engineer Proposal 109: Reduce Validator Set Size to 30 (Updated)

# `agd tx gov submit-proposal param-change` seems
# to JSON.stringify the value in the proposal.
# So we need to `fromjson` it before feeding it back to `agd`.
reduce-max-validators.json: tx-109.json
	jq '.tx.body.messages[0].content | .changes[0].value |= fromjson' tx-109.json >$@

PROPOSAL=109
proposer-109.json:
	agd --node $(ARCHIVE_NODE) query gov proposer $(PROPOSAL) -o json >$@

tx-hist-proposer-109.json: proposer-109.json
	PROPOSER="$$(jq -r .proposer proposer-109.json)"; \
	agd --node $(ARCHIVE_NODE) query txs --events="message.sender=$$PROPOSER" -o json >$@

tx-109.json: tx-hist-proposer-109.json
	jq '.txs | .[] | select(.tx.body.messages[0].content["@type"] == "/cosmos.params.v1beta1.ParameterChangeProposal")' \
		tx-hist-proposer-109.json >$@

# clean up locally computed files
clean:
	rm -f reduce-max-validators.json

# clean up files cached from the network as well
realclean: clean
	rm -f tx-109.json proposer-109.json tx-hist-proposer-109.json
