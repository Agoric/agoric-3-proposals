#!/usr/bin/env tsx

import { parseArgs } from 'node:util';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { buildProposalSubmissions, buildTestImages } from './src/cli/build.js';
import { writeDockerfile } from './src/cli/dockerfileGen.js';
import { matchOneProposal, readProposals } from './src/cli/proposals.js';
import { debugTestImage, runTestImages } from './src/cli/run.js';

// TODO change the tag to 'main' after multi-platform support https://github.com/Agoric/agoric-3-proposals/pull/32
const baseImage = 'pr-32-linux_arm64_v8';

const { positionals, values } = parseArgs({
  options: {
    match: { short: 'm', type: 'string' },
    dry: { type: 'boolean' },
    debug: { type: 'boolean' },
  },
  allowPositionals: true,
});

const allProposals = readProposals(path.resolve('.'));

const { match } = values;
const proposals = match
  ? allProposals.filter(p => p.proposalName.includes(match))
  : allProposals;

const [cmd] = positionals;

// TODO consider a lib like Commander for auto-gen help
const usage = `USAGE:
amend [<tag>]   - build on top of an existing image (defaults to latest from a3p)

build           - build from the beginning

test [--debug]  - run the tests of the proposals
`;

const buildImages = () => {
  execSync(
    // XXX very brittle
    'cp -r node_modules/@agoric/synthetic-chain/upgrade-test-scripts .',
  );
  buildProposalSubmissions(proposals);
  buildTestImages(proposals, values.dry);
};

switch (cmd) {
  case 'amend':
    const fromTag = positionals[1] || baseImage;
    writeDockerfile(allProposals, fromTag);
    buildImages();
    break;
  case 'build':
    writeDockerfile(allProposals);
    buildImages();
    break;
  case 'test':
    if (values.debug) {
      debugTestImage(matchOneProposal(proposals, match!));
    } else {
      runTestImages(proposals);
    }
    break;
  default:
    console.log(usage);
}
