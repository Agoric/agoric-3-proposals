#!/usr/bin/env -S node --import ts-blank-space/register
/**
 * @file CLI entrypoint, transpiled during build so Node is the env to run it in
 */
import chalk from 'chalk';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  bakeTarget,
  buildProposalSubmissions,
  readBuildConfig,
} from './build.js';
import { writeBakefileProposals, writeDockerfile } from './dockerfileGen.js';
import { runDoctor } from './doctor.js';
import {
  imageNameForProposal,
  readProposals,
  getProposalRange,
  type ProposalRange,
} from './proposals.js';
import { debugTestImage, runTestImage } from './run.js';

const root = path.resolve('.');
const buildConfig = readBuildConfig(root);

const { positionals, values } = parseArgs({
  options: {
    all: { type: 'boolean', default: false },
    match: { short: 'm', type: 'string' },
    dry: { type: 'boolean' },
    debug: { type: 'boolean' },
    rebuild: { type: 'boolean', default: false },
    'no-push': { type: 'boolean', default: false },
    start: { type: 'string', default: buildConfig.fromTag || '' },
    stop: { type: 'string', default: '' },
  },
  allowPositionals: true,
});

const range = getProposalRange(readProposals(root), values);

const [cmd] = positionals;

// TODO consider a lib like Commander for auto-gen help
const USAGE = `USAGE:
prepare-build   - generate Docker build configs

make-ranges     - split proposals into required ranges
  [--rebuild]   - rebuild all the proposals
  [--no-push]   - error if any images would need to be pushed

build           - build the synthetic-chain "use" images
  [--dry]       - print the config without building images

test            - build the "test" images and run them
                  respecting any SLOGFILE environment variable
                  https://github.com/Agoric/agoric-sdk/blob/master/docs/env.md#slogfile
  [-m <name>]   - target a particular proposal by substring match
    [--debug]   - run containers with interactive TTY and port mapping
  [--dry]       - print the config without building images

doctor          - diagnostics and quick fixes
`;

const EXPLAIN_MULTIPLATFORM = `
ERROR: docker exporter does not currently support exporting manifest lists

Multiple platforms are configured but Docker does not support multiplatform in one builder.
Until https://github.com/docker/roadmap/issues/371, attempting it will error as above.

Instead use a builder that supports multiplatform such as depot.dev.
`;

/**
 * Put into places files that building depends upon.
 */
const prepareDockerBuild = (range: ProposalRange) => {
  const cliPath = new URL(import.meta.url).pathname;
  const publicDir = path.resolve(cliPath, '..', '..');
  // copy and generate files of the build context that aren't in the build contents
  execSync(`cp -r ${path.resolve(publicDir, 'docker-bake.hcl')} .`);
  writeDockerfile(range);
  writeBakefileProposals(range, buildConfig.platforms);
  // copy and generate files to include in the build
  execSync(`cp -r ${path.resolve(publicDir, 'upgrade-test-scripts')} .`);
  buildProposalSubmissions(range.proposals);
  // set timestamp of build content to zero to avoid invalidating the build cache
  // (change in contents will still invalidate)
  execSync(
    'find upgrade-test-scripts -type f -exec touch -t 197001010000 {} +',
  );
};

switch (cmd) {
  case 'make-ranges': {
    const { all, rebuild, 'no-push': noPush } = values;
    const ranges: string[] = [];
    let lastName: string | undefined;
    let rebuildRest = rebuild;
    const someProposals = range.proposals;
    const lastUpgrade = range.proposals.findLastIndex(
      p => p.type === 'Software Upgrade Proposal',
    );
    const tail = lastUpgrade < 0 ? 0 : lastUpgrade;
    for (let i = 0; i < someProposals.length; i++) {
      const proposal = someProposals[i];
      const name = proposal.proposalName;
      if (!rebuildRest) {
        const image = imageNameForProposal(proposal, 'use');
        if (
          i < tail &&
          (all || proposal.type === 'Software Upgrade Proposal')
        ) {
          console.warn(
            `[${i + 1}/${someProposals.length}] Checking ${image.name}...`,
          );
          try {
            execSync(`docker manifest inspect ${JSON.stringify(image.name)}`, {
              stdio: 'ignore',
            });
            console.warn(`Skipping ${name} because it is already pushed`);
            lastName = name;
            continue;
          } catch (e) {}
        }
        if (i >= tail || !noPush) {
          console.warn(`Rebuilding ${name} and the rest...`);
          rebuildRest = true;
        } else if (noPush) {
          console.error(`${name} not found, needs to be pushed`);
          process.exit(1);
        }
      }

      if (lastName !== undefined) {
        ranges.push(`${lastName}/${name}`);
      }
      lastName = name;
    }

    if (lastName !== undefined) {
      ranges.push(`${lastName}/`);
    }

    console.log(JSON.stringify(ranges));
    break;
  }
  case 'prepare-build':
    prepareDockerBuild(range);
    break;
  case 'build': {
    prepareDockerBuild(range);
    // do not encapsulate running Depot. It's a special case which the user should understand.
    if (buildConfig.platforms) {
      console.error(EXPLAIN_MULTIPLATFORM);
      process.exit(1);
    }
    bakeTarget('use', values.dry);
    break;
  }
  case 'test':
    // Always rebuild all test images to keep it simple. With the "use" stages
    // cached, these are pretty fast building doesn't run agd.
    prepareDockerBuild(range);

    if (values.debug) {
      assert(values.match, '--debug requires -m');
      assert(range.proposalsToTest.length === 1, 'too many proposals match');
      const proposal = range.proposalsToTest[0];
      console.log(chalk.yellow.bold(`Debugging ${proposal.proposalName}`));
      bakeTarget(imageNameForProposal(proposal, 'test').target, values.dry);
      debugTestImage(proposal);
      // don't bother to delete the test image because there's just one
      // and the user probably wants to run it again.
    } else {
      for (const proposal of range.proposalsToTest) {
        console.log(chalk.cyan.bold(`Testing ${proposal.proposalName}`));
        const image = imageNameForProposal(proposal, 'test');
        bakeTarget(image.target, values.dry);
        runTestImage({ proposal });
        // delete the image to reclaim disk space. The next build
        // will use the build cache.
        execSync('docker system df', { stdio: 'inherit' });
        execSync(`docker rmi ${image.name}`, { stdio: 'inherit' });
        execSync('docker system df', { stdio: 'inherit' });
      }
    }
    break;
  case 'doctor':
    runDoctor(range.allProposals);
    break;
  default:
    console.log(USAGE);
    process.exit(1);
}
