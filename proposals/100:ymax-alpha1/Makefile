# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal such as #76 for vaults / auctions.
PROPOSAL=87

##
# Find the proposal transaction

# To find the transaction, let's start with: Who proposed 76?
proposer.json:
	agd --node $(ARCHIVE_NODE) query gov proposer $(PROPOSAL) -o json >$@

# Get proposer's transaction history.
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

EVALS=submission/start-fast-usdc-permit.json submission/start-fast-usdc.js

core-evals: $(EVALS)

# Now pick out their contents from the transaction.
submission/start-fast-usdc-permit.json: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].json_permits' $< >$@
submission/start-fast-usdc.js: tx.json
	jq -r '.tx.body.messages[0].content.evals[0].js_code' $< >$@

# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f tx.json proposer.json tx-hist-proposer.json
