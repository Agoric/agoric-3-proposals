#!/usr/bin/env tsx
// @ts-check

import fs from 'node:fs';
import type {
  CoreEvalProposal,
  ProposalInfo,
  SoftwareUpgradeProposal,
} from './proposals.js';

/**
 * Templates for Dockerfile stages
 */
const stage = {
  /**
   * ag0, start of the chain
   * @param proposalName
   * @param to
   */
  START(proposalName: string, to: string) {
    const agZeroUpgrade = 'agoric-upgrade-7-2';
    return `
## START
# on ${agZeroUpgrade}, with upgrade to ${to}
FROM ghcr.io/agoric/ag0:${agZeroUpgrade} as prepare-${proposalName}
ENV UPGRADE_TO=${to} THIS_NAME=${agZeroUpgrade}

# put env functions into shell environment
RUN echo '. /usr/src/upgrade-test-scripts/env_setup.sh' >> ~/.bashrc

COPY --link --chmod=755 ./upgrade-test-scripts/env_setup.sh ./upgrade-test-scripts/start_ag0.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
# this is the only layer that starts ag0
RUN /usr/src/upgrade-test-scripts/start_ag0.sh
`;
  },
  /**
   * Resume from state of an existing image
   * @param fromTag
   * @param proposalName
   * @param to
   */
  RESUME(fromTag: string, proposalName: string, to: string) {
    return `
## RESUME
# on a3p base, with upgrade to ${to}
FROM ghcr.io/agoric/agoric-3-proposals:${fromTag} as prepare-${proposalName}
`;
  },

  /**
   * Prepare an upgrade handler to run.
   *
   * - Submit the software-upgrade proposal for planName and run until upgradeHeight, leaving the state-dir ready for next agd.
   * @param root0
   * @param root0.planName
   * @param root0.proposalName
   * @param lastProposal
   */
  PREPARE(
    { planName, proposalName }: SoftwareUpgradeProposal,
    lastProposal: ProposalInfo,
  ) {
    return `
# PREPARE ${proposalName}

# upgrading to ${planName}
FROM use-${lastProposal.proposalName} as prepare-${proposalName}
ENV UPGRADE_TO=${planName}
# base is a fresh sdk image so copy these supports
COPY --link --chmod=755 ./upgrade-test-scripts/env_setup.sh ./upgrade-test-scripts/start_to_to.sh /usr/src/upgrade-test-scripts/

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN ./start_to_to.sh
`;
  },
  /**
   * Execute a prepared upgrade.
   * - Start agd with the SDK that has the upgradeHandler
   * - Run any core-evals associated with the proposal (either the ones specified in prepare, or straight from the proposal)
   * @param root0
   * @param root0.proposalName
   * @param root0.planName
   * @param root0.sdkImageTag
   */
  EXECUTE({ proposalName, planName, sdkImageTag }: SoftwareUpgradeProposal) {
    return `
# EXECUTE ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${sdkImageTag} as execute-${proposalName}
ENV THIS_NAME=${planName}

# base is a fresh sdk image so copy these supports
COPY --link --chmod=755 ./upgrade-test-scripts/env_setup.sh ./upgrade-test-scripts/start_to_to.sh /usr/src/upgrade-test-scripts/

COPY --link --from=prepare-${proposalName} /root/.agoric /root/.agoric

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN ./start_to_to.sh
`;
  },
  /**
   * Run a core-eval proposal
   * - Run the core-eval scripts from the proposal. They are only guaranteed to have started, not completed.
   * @param root0
   * @param root0.proposalIdentifier
   * @param root0.proposalName
   * @param lastProposal
   */
  EVAL(
    { proposalIdentifier, proposalName }: CoreEvalProposal,
    lastProposal: ProposalInfo,
  ) {
    return `
# EVAL ${proposalName}
FROM use-${lastProposal.proposalName} as eval-${proposalName}

COPY --link --chmod=755 ./proposals/${proposalIdentifier}:${proposalName} /usr/src/proposals/${proposalIdentifier}:${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# install using global cache
COPY --link ./upgrade-test-scripts/install_deps.sh /usr/src/upgrade-test-scripts/
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${proposalIdentifier}:${proposalName}

COPY --link --chmod=755 ./upgrade-test-scripts/run_eval.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN ./run_eval.sh ${proposalIdentifier}:${proposalName}
`;
  },
  /**
   * Use the proposal
   *
   * - Perform any mutations that should be part of chain history
   * @param root0
   * @param root0.proposalName
   * @param root0.proposalIdentifier
   * @param root0.type
   */
  USE({ proposalName, proposalIdentifier, type }: ProposalInfo) {
    const previousStage =
      type === 'Software Upgrade Proposal' ? 'execute' : 'eval';
    return `
# USE ${proposalName}
FROM ${previousStage}-${proposalName} as use-${proposalName}

COPY --link --chmod=755 ./proposals/${proposalIdentifier}:${proposalName} /usr/src/proposals/${proposalIdentifier}:${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# TODO remove network dependencies in stages
# install using global cache
COPY --link ./upgrade-test-scripts/install_deps.sh /usr/src/upgrade-test-scripts/
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${proposalIdentifier}:${proposalName}

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
   * @param root0
   * @param root0.proposalName
   * @param root0.proposalIdentifier
   */
  TEST({ proposalName, proposalIdentifier }: ProposalInfo) {
    return `
# TEST ${proposalName}
FROM use-${proposalName} as test-${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# install using global cache
COPY --link ./upgrade-test-scripts/install_deps.sh /usr/src/upgrade-test-scripts/
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${proposalIdentifier}:${proposalName}

# copy run_test for this entrypoint and start_agd for optional debugging
COPY --link --chmod=755 ./upgrade-test-scripts/run_test.sh ./upgrade-test-scripts/start_agd.sh /usr/src/upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./run_test.sh ${proposalIdentifier}:${proposalName}
`;
  },
  /**
   * The last target in the file, for untargeted `docker build`
   * @param lastProposal
   */
  DEFAULT(lastProposal: ProposalInfo) {
    return `
# DEFAULT
FROM use-${lastProposal.proposalName}

COPY --link --chmod=755 ./upgrade-test-scripts/start_agd.sh /usr/src/upgrade-test-scripts/

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./start_agd.sh
`;
  },
};

export function writeDockerfile(
  allProposals: ProposalInfo[],
  fromTag?: string,
) {
  // Each stage tests something about the left argument and prepare an upgrade to the right side (by passing the proposal and halting the chain.)
  // The upgrade doesn't happen until the next stage begins executing.
  const blocks: string[] = [];

  let previousProposal: ProposalInfo | null = null;
  for (const proposal of allProposals) {
    //   UNTIL region support https://github.com/microsoft/vscode-docker/issues/230
    blocks.push(
      `#----------------\n# ${proposal.proposalName}\n#----------------`,
    );

    if (proposal.type === '/agoric.swingset.CoreEvalProposal') {
      blocks.push(stage.EVAL(proposal, previousProposal!));
    } else if (proposal.type === 'Software Upgrade Proposal') {
      // handle the first proposal specially
      if (previousProposal) {
        blocks.push(stage.PREPARE(proposal, previousProposal));
      } else if (fromTag) {
        blocks.push(
          stage.RESUME(fromTag, proposal.proposalName, proposal.planName),
        );
      } else {
        blocks.push(stage.START(proposal.proposalName, proposal.planName));
      }
      blocks.push(stage.EXECUTE(proposal));
    }

    // The stages must be output in dependency order because if the builder finds a FROM
    // that it hasn't built yet, it will search for it in the registry. But it won't be there!
    blocks.push(stage.USE(proposal));
    blocks.push(stage.TEST(proposal));
    previousProposal = proposal;
  }
  const contents = blocks.join('\n');
  fs.writeFileSync('Dockerfile', contents);
}
