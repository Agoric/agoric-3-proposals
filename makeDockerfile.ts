#!/usr/bin/env tsx
// @ts-check

import * as fs from 'node:fs';
import { readProposals } from './common';
import type {
  ProposalInfo,
  SoftwareUpgradeProposal,
  CoreEvalProposal,
} from './common';

const agZeroUpgrade = 'agoric-upgrade-7-2';

/**
 * Templates for Dockerfile stages
 */
const stage = {
  /**
   * ag0, start of the chain
   */
  START(proposalName: string, to: string) {
    return `
## START
# on ${agZeroUpgrade}, with upgrade to ${to}
FROM ghcr.io/agoric/ag0:${agZeroUpgrade} as prepare-${proposalName}
ENV UPGRADE_TO=${to} THIS_NAME=${agZeroUpgrade}

# put env functions into shell environment
RUN echo '. /usr/src/upgrade-test-scripts/env_setup.sh' >> ~/.bashrc

COPY --link --chmod=755 ./upgrade-test-scripts /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
# this is the only layer that starts ag0
RUN /usr/src/upgrade-test-scripts/start_ag0.sh
`;
  },
  /**
   * Prepare an upgrade handler to run.
   *
   * - Submit the software-upgrade proposal for planName and run until upgradeHeight, leaving the state-dir ready for next agd.
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
COPY --link --chmod=755 ./upgrade-test-scripts/*.sh /usr/src/upgrade-test-scripts/

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
  EXECUTE({ proposalName, planName, sdkImageTag }: SoftwareUpgradeProposal) {
    return `
# EXECUTE ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${sdkImageTag} as execute-${proposalName}
ENV THIS_NAME=${planName}

# base is a fresh sdk image so copy these supports
COPY --link --chmod=755 ./upgrade-test-scripts/*.sh /usr/src/upgrade-test-scripts/

COPY --link --from=prepare-${proposalName} /root/.agoric /root/.agoric

WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN ./start_to_to.sh
`;
  },
  /**
   * Run a core-eval proposal
   * - Run the core-eval scripts from the proposal. They are only guaranteed to have started, not completed.
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

COPY --link --chmod=755 ./proposals/${proposalIdentifier}:${proposalName} /usr/src/proposals/${proposalIdentifier}:${proposalName}

# XXX for 'lib' dir for JS modules
COPY --link --chmod=755 ./upgrade-test-scripts /usr/src/upgrade-test-scripts/
# TODO remove network dependencies in stages
RUN cd /usr/src/upgrade-test-scripts/lib/ && yarn install

WORKDIR /usr/src/upgrade-test-scripts
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

# XXX the test files were already copied in the "use" stage
WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./run_test.sh ${proposalIdentifier}:${proposalName}
`;
  },
};

// Each stage tests something about the left argument and prepare an upgrade to the right side (by passing the proposal and halting the chain.)
// The upgrade doesn't happen until the next stage begins executing.
const blocks: string[] = [];

let previousProposal: ProposalInfo | null = null;
for (const proposal of readProposals()) {
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
    } else {
      blocks.push(stage.START(proposal.proposalName, proposal.planName));
    }
    blocks.push(stage.EXECUTE(proposal));
  }

  blocks.push(stage.USE(proposal));
  blocks.push(stage.TEST(proposal));
  previousProposal = proposal;
}

export function refreshDockerfile() {
  const contents = blocks.join('\n');
  fs.writeFileSync('Dockerfile', contents);
}

if (require.main === module) {
  refreshDockerfile();
}
