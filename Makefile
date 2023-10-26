REPOSITORY = agoric/upgrade-test
# use :dev (latest prerelease image) unless we build local sdk
TARGET?=agoric-upgrade-12
dockerLabel?=$(TARGET)
@echo target: $(TARGET)

BUILD = docker build --progress=plain $(BUILD_OPTS) \
	-f Dockerfile upgrade-test-scripts

agoric-upgrade-7-2:
	$(BUILD) --target agoric-upgrade-7-2 -t $(REPOSITORY):agoric-upgrade-7-2$(TAG_SUFFIX)

agoric-upgrade-8: agoric-upgrade-7-2
	$(BUILD) --target agoric-upgrade-8 -t $(REPOSITORY):agoric-upgrade-8$(TAG_SUFFIX)

agoric-upgrade-8-1: agoric-upgrade-8
	$(BUILD) --target agoric-upgrade-8-1 -t $(REPOSITORY):agoric-upgrade-8-1$(TAG_SUFFIX)

agoric-upgrade-9: agoric-upgrade-8-1
	$(BUILD) --target agoric-upgrade-9 -t $(REPOSITORY):agoric-upgrade-9$(TAG_SUFFIX)

agoric-upgrade-10: agoric-upgrade-9
	$(BUILD) --target agoric-upgrade-10 -t $(REPOSITORY):agoric-upgrade-10$(TAG_SUFFIX)

propose-agoric-upgrade-11: agoric-upgrade-10
	$(BUILD) --target propose-agoric-upgrade-11 -t $(REPOSITORY):propose-agoric-upgrade-11$(TAG_SUFFIX)

agoric-upgrade-11: propose-agoric-upgrade-11
	$(BUILD) --target agoric-upgrade-11 -t $(REPOSITORY):agoric-upgrade-11$(TAG_SUFFIX)

propose-agoric-upgrade-12: agoric-upgrade-11
	$(BUILD) --target propose-agoric-upgrade-12 -t $(REPOSITORY):propose-agoric-upgrade-12$(TAG_SUFFIX)

agoric-upgrade-12: propose-agoric-upgrade-12
	$(BUILD) --target agoric-upgrade-12 -t $(REPOSITORY):agoric-upgrade-12$(TAG_SUFFIX)

# build main bootstrap
build: $(TARGET)

DEBUG ?= SwingSet:ls,SwingSet:vat
RUN = docker run --rm -it \
	-p 26656:26656 -p 26657:26657 -p 1317:1317 \
	-v "$${PWD}:/workspace" \
	-e "DEBUG=$(DEBUG)"

run:
	$(RUN) -e "DEST=1" \
		--entrypoint /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh \
		 $(REPOSITORY):$(dockerLabel)

run_test:
	$(RUN) -e "DEST=0" $(REPOSITORY):$(dockerLabel)

run_bash:
	$(RUN) --entrypoint /bin/bash $(REPOSITORY):$(dockerLabel)

shell:
	docker exec -it `docker ps --latest --format json | jq -r .Names` bash

.PHONY: agoric-upgrade-7-2 agoric-upgrade-8 agoric-upgrade-8-1 agoric-upgrade-9 agoric-upgrade-10 agoric-upgrade-11 agoric-upgrade-12 build build_test run