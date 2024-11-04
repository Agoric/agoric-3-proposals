# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal such as #76 for vaults / auctions.
PROPOSAL=59

##
# Find the proposal details

proposal.json:
	agd --node $(ARCHIVE_NODE) query gov proposal $(PROPOSAL) -o json >$@

# A CoreEval proposal has a sequence of json_permits,js_code pairs.
# We happen to know there was 1 in this case.

EVALS=submission/add-usdc-permit.json submission/add-usdc.js

core-evals: $(EVALS)

# Now pick out their contents from the transaction.
submission/add-usdc-permit.json: proposal.json
	jq -r '.messages[0].content.evals[0].json_permits' $< >$@
submission/add-usdc.js: proposal.json
	jq -r '.messages[0].content.evals[0].js_code' $< >$@

# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f tx.json proposer.json tx-hist-proposer.json
