# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal such as #100 for Ymax-alpha-1.
PROPOSAL=106

ARCHIVE_NODE ?= https://main-a.rpc.agoric.net:443

##
# Find the proposal transaction

# Get proposer's transaction history.
txs.json:
	agd --node $(ARCHIVE_NODE) query txs --query="submit_proposal.proposal_id='$(PROPOSAL)'" -o json >$@

# pick out their most recent CoreEvalProposal
tx.json: txs.json
	jq -e '.txs | .[] | select(.tx.body.messages[0].content["@type"] == "/agoric.swingset.CoreEvalProposal")' \
		$< >$@

# A CoreEval proposal has a sequence of json_permits,js_code pairs.
# We happen to know there were 1 in this case.

EVALS=submission/ymaxControl-permit.json submission/ymaxControl.js

core-evals: $(EVALS)

# Now pick out their contents from the transaction.
submission/ymaxControl-permit.json: tx.json
	jq -e -r '.tx.body.messages[0].content.evals[0].json_permits' $< >$@
submission/ymaxControl.js: tx.json
	jq -e -r '.tx.body.messages[0].content.evals[0].js_code' $< | sed s/agoric1e80twfutmrm3wrk3fysjcnef4j82mq8dn6nmcq/agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh/ >$@; \
	echo '// HACK! b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88' >>$@ # hack to force `evalBundles` to publish the latest ymax bundle

# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f txs.json tx.json
