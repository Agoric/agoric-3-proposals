# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal such as #101 for Ymax-USDC-resolve.
PROPOSAL=101
ARCHIVE_NODE='https://main-a.rpc.agoric.net:443'
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
	jq '.txs | map(select(try(.tx.body.messages[0].content["@type"] == "/agoric.swingset.CoreEvalProposal") // false)) | max_by(.height | tonumber)' \
	$< >$@
# A CoreEval proposal has a sequence of json_permits,js_code pairs.
# We happen to know there were 3 in this case, and we have
# been using certain filenames for them.

EVALS=submission/eval-usdc-resolve-permit.json submission/eval-usdc-resolve.js

core-evals: $(EVALS)

# Now pick out their contents from the transaction.
submission/eval-usdc-resolve-permit.json:
	agd --node $(ARCHIVE_NODE) query gov proposal $(PROPOSAL) -o json \
	| jq -r '.messages[0].content.evals[0].json_permits' >$@
submission/eval-usdc-resolve.js: tx.json
	agd --node $(ARCHIVE_NODE) query gov proposal $(PROPOSAL) -o json \
	| jq -r '.messages[0].content.evals[0].js_code' >$@

# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network
clean-cache:
	rm -f tx.json proposer.json proposer-tx-hist.json

# clean up files cached from the network as well
realclean: clean clean-cache
