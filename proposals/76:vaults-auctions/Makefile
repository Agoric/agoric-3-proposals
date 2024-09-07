# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal such as #76 for vaults / auctions.
PROPOSAL=76

##
# Find the proposal transaction

# To find the transaction, let's start with: Who proposed 76?
proposer.json:
	agd --node $(ARCHIVE_NODE) query gov proposer $(PROPOSAL) -o json >$@

# Get proposer's tranasction history.
proposer-tx-hist.json: proposer.json
	PROPOSER="$$(jq -r .proposer $<)"; \
	agd --node $(ARCHIVE_NODE) query txs --events="message.sender=$$PROPOSER" -o json >$@

# pick out their most recent CoreEvalProposal
tx.json: proposer-tx-hist.json
	jq '.txs | .[] | select(.tx.body.messages[0].content["@type"] == "/agoric.swingset.CoreEvalProposal")' \
		$< >$@

# A CoreEval proposal has a sequence of json_permits,js_code pairs.
# We happen to know there were 2 in this case, and we have
# been using certain filenames for them.

EVALS=submission/add-auction-permit.json submission/add-auction.js \
	submission/upgrade-vaults-permit.json submission/upgrade-vaults.js

core-evals: $(EVALS)

# Now pick out their contents from the transaction.
submission/add-auction-permit.json: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].json_permits' $< >$@
submission/add-auction.js: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].js_code' $< >$@

submission/upgrade-vaults-permit.json: tx.json
	jq -r '.tx.body.messages[0].content.evals[1].json_permits' $< >$@
submission/upgrade-vaults.js: tx.json
	jq -r '.tx.body.messages[0].content.evals[1].js_code' $< >$@


# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f tx.json proposer.json tx-hist-proposer.json
