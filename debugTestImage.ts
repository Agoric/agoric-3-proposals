#!/usr/bin/env tsx
/**
 * @file like runTestImages.ts, but for a single proposal,
 * and leaves the chain running
 */
import { execSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { imageNameForProposal, readOneProposal } from './common';

const options = {
  match: { short: 'm', type: 'string' },
} as const;
const { values } = parseArgs({ options });

const proposal = readOneProposal(values.match!);
const { name } = imageNameForProposal(proposal, 'test');

console.log(
  `
Starting chain of test image for proposal ${proposal.proposalName}

To get an interactive shell in the container, use an IDE feature like "Attach Shell" or this command:'

  docker exec -ti $(docker ps -q -f ancestor=${name}) bash

And within that shell:
  cd /usr/src/proposals/${proposal.proposalIdentifier}:${proposal.proposalName} && ./test.sh

The 'proposals' path is mounted in the container so your edits will appear there.
`,
);

// start the chain, with the repo mounted at /usr/src
const cmd = `docker run --mount type=bind,src=./proposals,dst=/usr/src/proposals -it --entrypoint /usr/src/upgrade-test-scripts/start_agd.sh ${name}`;
execSync(cmd, { stdio: 'inherit' });
