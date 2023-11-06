#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';
import { imageNameForProposalTest, readProposals } from './common';
import { refreshDockerfile } from './makeDockerfile';

refreshDockerfile();

const options = {
  buildOpts: { type: 'string' },
  match: { short: 'm', type: 'string' },
  dry: { type: 'boolean' },
} as const;
const { values } = parseArgs({ options });

const { buildOpts, match, dry } = values;

const allProposals = readProposals();

const proposals = match
  ? allProposals.filter(p => p.proposalName.includes(match))
  : allProposals;

for (const proposal of proposals) {
  if (!dry) {
    console.log(`\nBuilding test image for proposal ${proposal.proposalName}`);
  }
  const { name, target } = imageNameForProposalTest(proposal);
  // 'load' to ensure the images are output to the Docker client. Seems to be necessary
  // for the CI docker/build-push-action to re-use the cached stages.
  const cmd = `docker buildx build ${buildOpts} --load --tag ${name} --target ${target} .`;
  console.log(cmd);
  if (!dry) {
    execSync(cmd, { stdio: 'inherit' });
  }
}
