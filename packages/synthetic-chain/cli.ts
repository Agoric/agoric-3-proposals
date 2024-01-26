#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  bakeTarget,
  buildProposalSubmissions,
  readBuildConfig,
} from './src/cli/build.js';
import {
  writeBakefileProposals,
  writeDockerfile,
} from './src/cli/dockerfileGen.js';
import { runDoctor } from './src/cli/doctor.js';
import {
  imageNameForProposal,
  matchOneProposal,
  readProposals,
} from './src/cli/proposals.js';
import { debugTestImage, runTestImage } from './src/cli/run.js';

const { positionals, values } = parseArgs({
  options: {
    match: { short: 'm', type: 'string' },
    dry: { type: 'boolean' },
    debug: { type: 'boolean' },
  },
  allowPositionals: true,
});

const root = path.resolve('.');
const buildConfig = readBuildConfig(root);
const allProposals = readProposals(root);

const { match } = values;
const proposals = match
  ? allProposals.filter(p => p.proposalName.includes(match))
  : allProposals;

const [cmd] = positionals;

// TODO consider a lib like Commander for auto-gen help
const usage = `USAGE:
prepare-ci      - generate dependencies of Docker bake config (when CI controls build)

build           - build the synthetic-chain "use" images

test [--debug]  - build the "test" images and run them
test -m <name>  - target a particular proposal by substring match

doctor          - diagnostics and quick fixes
`;

/**
 * Put into places files that building depends upon.
 */
const prepareDockerBuild = () => {
  const cliPath = new URL(import.meta.url).pathname;
  execSync(`cp -r ${path.resolve(cliPath, '..', 'upgrade-test-scripts')} .`);
  execSync(`cp -r ${path.resolve(cliPath, '..', 'docker-bake.hcl')} .`);
  writeDockerfile(allProposals, buildConfig.fromTag);
  writeBakefileProposals(allProposals);
  buildProposalSubmissions(proposals);
};

switch (cmd) {
  case 'prepare-ci':
    prepareDockerBuild();
    break;
  case 'build': {
    prepareDockerBuild();
    bakeTarget('use', values.dry);
    break;
  }
  case 'test':
    // Always rebuild all test images to keep it simple. With the "use" stages
    // cached, these are pretty fast building doesn't run agd.
    prepareDockerBuild();

    if (values.debug) {
      const proposal = matchOneProposal(proposals, match!);
      bakeTarget(imageNameForProposal(proposal, 'test').target, values.dry);
      debugTestImage(proposal);
      // don't bother to delete the test image because there's just one
      // and the user probably wants to run it again.
    } else {
      for (const proposal of proposals) {
        const image = imageNameForProposal(proposal, 'test');
        bakeTarget(image.target, values.dry);
        runTestImage(proposal);
        // delete the image to reclaim disk space. The next build
        // will use the build cache.
        execSync('docker system df', { stdio: 'inherit' });
        execSync(`docker rmi ${image.name}`, { stdio: 'inherit' });
        execSync('docker system df', { stdio: 'inherit' });
      }
    }
    break;
  case 'doctor':
    runDoctor(allProposals);
    break;
  default:
    console.log(usage);
}
