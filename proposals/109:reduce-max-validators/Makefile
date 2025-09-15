# reverse-engineer Proposal 109: Reduce Validator Set Size to 30 (Updated)

reduce-max-validators.json: proposal-info.json
	jq '{ title, summary, messages, metadata: "", deposit: "10000000ubld" }' proposal-info.json >$@

PROPOSAL=109
proposal-info.json:
	agd query --node $(ARCHIVE_NODE) gov proposal $(PROPOSAL) -o json >$@ || (rm $@; false)

# clean up locally computed files
clean:
	rm -f reduce-max-validators.json

# clean up files cached from the network as well
realclean: clean
	rm -f tx-109.json proposer-109.json tx-hist-proposer-109.json
