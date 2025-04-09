# This Makefile is here to help you find out what went on the
# chain for a CoreEval proposal.
PROPOSAL=89
# Can be anything but try to match the assets in the agoric-sdk release (see package.json releaseNotes)
EVAL_NAME=eval-fast-usdc-gtm
# only the archive node has enough history
ARCHIVE_NODE=https://main-a.rpc.agoric.net:443/

.DEFAULT_GOAL := core-evals

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
	jq '.txs | map(select(.tx.body.messages[0].content["@type"] == "/agoric.swingset.CoreEvalProposal")) | last' \
		$< >$@

# A CoreEval proposal has a sequence of json_permits,js_code pairs.
# We happen to know there were 2 in this case, and we have
# been using certain filenames for them.
core-evals: tx.json
	mkdir -p submission
	jq -r '.tx.body.messages[0].content.evals[0].json_permits' $< >submission/$(EVAL_NAME)-permit.json
	jq -r '.tx.body.messages[0].content.evals[0].js_code' $< >submission/$(EVAL_NAME).js
	@grep -oE 'b1-[a-f0-9]{128}' $< | sort -u | while read BUNDLE_ID; do \
		echo "Found bundle reference $$BUNDLE_ID"; \
	done
	@echo "NOTE you must procure the bundles yourself from the release notes and check into the submission directory."


# clean up locally computed files
clean:
	rm -f $(EVALS)

# clean up files cached from the network as well
realclean: clean
	rm -f tx.json proposer.json tx-hist-proposer.json
	rm -rf submission

