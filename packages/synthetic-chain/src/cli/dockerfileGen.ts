#!/usr/bin/env tsx
// @ts-check

import fs from 'node:fs';
import {
  encodeUpgradeInfo,
  imageNameForProposal,
  isPassed,
  type CoreEvalProposal,
  type ParameterChangeProposal,
  type ProposalInfo,
  type SoftwareUpgradeProposal,
} from './proposals.js';

/**
 * Templates for Dockerfile stages
 */
const stage = {
  /**
   * ag0, start of the chain
   */
  START(proposalName: string, to: string) {
    const agZeroUpgrade = 'agoric-upgrade-7-2';
    return `
## START
# on ${agZeroUpgrade}, with upgrade to ${to}
FROM ghcr.io/agoric/ag0:${agZeroUpgrade} as prepare-${proposalName}
ENV UPGRADE_TO=${to}

# put env functions into shell environment
RUN echo '. /usr/src/upgrade-test-scripts/env_setup.sh' >> ~/.bashrc

COPY --link --chmod=755 ./upgrade-test-scripts/env_setup.sh ./upgrade-test-scripts/start_ag0.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
# this is the only layer that starts ag0
RUN /usr/src/upgrade-test-scripts/start_ag0.sh
`;
  },
  /**
   * Resume from state of an existing image.
   * Creates a "use" stage upon which a PREPARE or EVAL can stack.
   */
  RESUME(fromTag: string) {
    return `
## RESUME
FROM ghcr.io/agoric/agoric-3-proposals:${fromTag} as use-${fromTag}
`;
  },

  /**
   * Prepare an upgrade handler to run.
   *
   * - Submit the software-upgrade proposal for planName and run until upgradeHeight, leaving the state-dir ready for next agd.
   */
  PREPARE(
    { planName, proposalName, upgradeInfo }: SoftwareUpgradeProposal,
    lastProposal: ProposalInfo,
  ) {
    return `
# PREPARE ${proposalName}

# upgrading to ${planName}
FROM use-${lastProposal.proposalName} as prepare-${proposalName}
ENV UPGRADE_TO=${planName} UPGRADE_INFO=${JSON.stringify(
      encodeUpgradeInfo(upgradeInfo),
    )}

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN ./start_to_to.sh
`;
  },
  /**
   * Execute a prepared upgrade.
   * - Start agd with the SDK that has the upgradeHandler
   * - Run any core-evals associated with the proposal (either the ones specified in prepare, or straight from the proposal)
   */
  EXECUTE({
    proposalIdentifier,
    proposalName,
    sdkImageTag,
  }: SoftwareUpgradeProposal) {
    return `
# EXECUTE ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${sdkImageTag} as execute-${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# base is a fresh sdk image so set up the proposal and its dependencies
COPY --link --chmod=755 ./proposals/${proposalIdentifier}:${proposalName} /usr/src/proposals/${proposalIdentifier}:${proposalName}
COPY --link --chmod=755 ./upgrade-test-scripts/env_setup.sh ./upgrade-test-scripts/start_to_to.sh ./upgrade-test-scripts/install_deps.sh /usr/src/upgrade-test-scripts/
# XXX this hits the network each time because the fresh base lacks the global Yarn cache from the previous proposal's build
RUN ./install_deps.sh ${proposalIdentifier}:${proposalName}

COPY --link --from=prepare-${proposalName} /root/.agoric /root/.agoric

SHELL ["/bin/bash", "-c"]
RUN ./start_to_to.sh
`;
  },
  /**
   * Run a core-eval proposal
   * - Run the core-eval scripts from the proposal. They are only guaranteed to have started, not completed.
   */
  EVAL(
    {
      proposalIdentifier,
      proposalName,
    }: CoreEvalProposal | ParameterChangeProposal,
    lastProposal: ProposalInfo,
  ) {
    return `
# EVAL ${proposalName}
FROM use-${lastProposal.proposalName} as eval-${proposalName}

COPY --link --chmod=755 ./proposals/${proposalIdentifier}:${proposalName} /usr/src/proposals/${proposalIdentifier}:${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# First stage of this proposal so install its deps.
COPY --link ./upgrade-test-scripts/install_deps.sh /usr/src/upgrade-test-scripts/
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${proposalIdentifier}:${proposalName}

COPY --link --chmod=755 ./upgrade-test-scripts/*eval* /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN ./run_eval.sh ${proposalIdentifier}:${proposalName}
`;
  },
  /**
   * Use the proposal
   *
   * - Perform any mutations that should be part of chain history
   */
  USE({ proposalName, proposalIdentifier, type }: ProposalInfo) {
    const previousStage =
      type === 'Software Upgrade Proposal' ? 'execute' : 'eval';
    return `
# USE ${proposalName}
FROM ${previousStage}-${proposalName} as use-${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

COPY --link --chmod=755 ./upgrade-test-scripts/run_use.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN ./run_use.sh ${proposalIdentifier}:${proposalName}
`;
  },
  /**
   * Generate image than can test the proposal
   *
   * - Run with the image of the last "use"
   * - Run tests of the proposal
   *
   * Needs to be an image to have access to the SwingSet db. run it with `docker run --rm` to not make the container ephemeral.
   */
  TEST({ proposalName, proposalIdentifier }: ProposalInfo) {
    return `
# TEST ${proposalName}
FROM use-${proposalName} as test-${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# copy run_test for this entrypoint and start_agd for optional debugging
COPY --link --chmod=755 ./upgrade-test-scripts/run_test.sh ./upgrade-test-scripts/start_agd.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./run_test.sh ${proposalIdentifier}:${proposalName}
`;
  },
  /**
   * The last target in the file, for untargeted `docker build`
   */
  DEFAULT(lastProposal: ProposalInfo) {
    // Assumes the 'use' image is built and tagged.
    // This isn't necessary for a multi-stage build, but without it CI
    // rebuilds the last "use" image during the "default" image step
    // Some background: https://github.com/moby/moby/issues/34715
    const useImage = imageNameForProposal(lastProposal, 'use').name;
    return `
# DEFAULT
FROM ${useImage}

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./start_agd.sh
`;
  },
};

export function writeBakefileProposals(allProposals: ProposalInfo[]) {
  const json = {
    variable: {
      PROPOSALS: {
        default: allProposals.map(p => p.proposalName),
      },
    },
  };
  fs.writeFileSync('docker-bake.json', JSON.stringify(json, null, 2));
}

export function writeDockerfile(
  allProposals: ProposalInfo[],
  fromTag?: string | null,
) {
  // Each stage tests something about the left argument and prepare an upgrade to the right side (by passing the proposal and halting the chain.)
  // The upgrade doesn't happen until the next stage begins executing.
  const blocks: string[] = [];

  let previousProposal: ProposalInfo | null = null;

  // appending to a previous image, so set up the 'use' stage
  if (fromTag) {
    blocks.push(stage.RESUME(fromTag));
    // define a previous proposal that matches what later stages expect
    previousProposal = {
      proposalName: fromTag,
      proposalIdentifier: fromTag,
      // XXX these are bogus
      type: '/agoric.swingset.CoreEvalProposal',
      source: 'subdir',
    };
  }
  for (const proposal of allProposals) {
    // UNTIL region support https://github.com/microsoft/vscode-docker/issues/230
    blocks.push(
      `#----------------\n# ${proposal.proposalName}\n#----------------`,
    );

    switch (proposal.type) {
      case '/agoric.swingset.CoreEvalProposal':
      case '/cosmos.params.v1beta1.ParameterChangeProposal':
        blocks.push(stage.EVAL(proposal, previousProposal!));
        break;
      case 'Software Upgrade Proposal':
        // handle the first proposal specially
        if (previousProposal) {
          blocks.push(stage.PREPARE(proposal, previousProposal));
        } else {
          blocks.push(stage.START(proposal.proposalName, proposal.planName));
        }
        blocks.push(stage.EXECUTE(proposal));
        break;
      default:
        // UNTIL https://github.com/Agoric/agoric-3-proposals/issues/77
        // @ts-expect-error exhaustive switch narrowed type to `never`
        throw new Error(`unsupported proposal type ${proposal.type}`);
    }

    // The stages must be output in dependency order because if the builder finds a FROM
    // that it hasn't built yet, it will search for it in the registry. But it won't be there!
    blocks.push(stage.USE(proposal));
    blocks.push(stage.TEST(proposal));
    previousProposal = proposal;
  }
  // If one of the proposals is a passed proposal, make the latest one the default entrypoint
  const lastPassed = allProposals.findLast(isPassed);
  if (lastPassed) {
    blocks.push(stage.DEFAULT(lastPassed));
  }

  const contents = blocks.join('\n');
  fs.writeFileSync('Dockerfile', contents);
}
