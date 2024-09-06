# reverse-engineer CoreEval Proposal 76
PROPOSAL=76

EVALS=submission/add-auction-permit.json submission/add-auction.js \
	submission/upgrade-vaults-permit.json submission/upgrade-vaults.js

core-evals: $(EVALS)

submission/add-auction-permit.json: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].json_permits' $< >$@
submission/add-auction.js: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].js_code' $< >$@

submission/upgrade-vaults-permit.json: tx.json
	jq -r '.tx.body.messages[0].content.evals[1].json_permits' $< >$@
submission/upgrade-vaults.js: tx.json
	jq -r '.tx.body.messages[0].content.evals[1].js_code' $< >$@

proposer.json:
	agd --node $(ARCHIVE_NODE) query gov proposer $(PROPOSAL) -o json >$@

proposer-tx-hist.json: proposer.json
	PROPOSER="$$(jq -r .proposer $<)"; \
	agd --node $(ARCHIVE_NODE) query txs --events="message.sender=$$PROPOSER" -o json >$@

tx.json: proposer-tx-hist.json
	jq '.txs | .[] | select(.tx.body.messages[0].content["@type"] == "/agoric.swingset.CoreEvalProposal")' \
		$< >$@

# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f tx.json proposer.json tx-hist-proposer.json
