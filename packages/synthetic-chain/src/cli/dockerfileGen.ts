import fs from 'node:fs';
import { type Platform } from './build.js';
import {
  encodeUpgradeInfo,
  imageNameForProposal,
  isPassed,
  type ProposalRange,
  type CoreEvalPackage,
  type ParameterChangePackage,
  type ProposalInfo,
  type SoftwareUpgradePackage,
} from './proposals.js';

// We need this unstable syntax for the `COPY --exclude` feature.
const syntaxPragma = '# syntax=docker/dockerfile:1.7-labs';

/**
 * Templates for Dockerfile stages
 */
export const stage = {
  /**
   * Prepare an upgrade from ag0, start of the chain
   */
  PREPARE_ZERO(proposalName: string, to: string) {
    const agZeroUpgrade = 'agoric-upgrade-7-2';
    return `
## START
# on ${agZeroUpgrade}, with upgrade to ${to}
FROM ghcr.io/agoric/ag0:${agZeroUpgrade} as prepare-${proposalName}
ENV UPGRADE_TO=${to}

# put env functions into shell environment
RUN echo '. /usr/src/upgrade-test-scripts/env_setup.sh' >> ~/.bashrc

# copy scripts
${createCopyCommand(
  [],
  './upgrade-test-scripts/env_setup.sh',
  './upgrade-test-scripts/run_prepare_zero.sh',
  '/usr/src/upgrade-test-scripts/',
)}
SHELL ["/bin/bash", "-c"]
# this is the only layer that starts ag0
RUN /usr/src/upgrade-test-scripts/run_prepare_zero.sh
`;
  },
  /**
   * Resume from state of an existing image.
   * Creates a "use" stage upon which a PREPARE or EVAL can stack.
   */
  RESUME(proposalName: string) {
    return `
## RESUME
FROM ghcr.io/agoric/agoric-3-proposals:use-${proposalName} as use-${proposalName}
`;
  },

  /**
   * Prepare an upgrade handler to run.
   *
   * - Submit the software-upgrade proposal for planName and run until upgradeHeight, leaving the state-dir ready for next agd.
   */
  PREPARE(
    {
      path,
      planName,
      proposalName,
      upgradeInfo,
      releaseNotes,
      sdkImageTag,
    }: SoftwareUpgradePackage,
    lastProposal: ProposalInfo,
    currentSdkImageTag: string,
  ) {
    const skipProposalValidation = !releaseNotes;
    return `
# PREPARE ${proposalName}

# upgrading to ${planName}
FROM ghcr.io/agoric/agoric-sdk:${currentSdkImageTag} as prepare-${proposalName}
ENV \
    UPGRADE_TO=${planName} \
    UPGRADE_INFO=${JSON.stringify(encodeUpgradeInfo(upgradeInfo))} \
    SKIP_PROPOSAL_VALIDATION=${skipProposalValidation}

# Copy chain state from previous layer
COPY --from=use-${lastProposal.proposalName} /root/.agoric /root/.agoric

${createCopyCommand(
  ['host', 'node_modules', '**/.yarn/install-state.gz', 'test', 'test.sh'],
  `./proposals/${path}`,
  `/usr/src/proposals/${path}`,
)}
${createCopyCommand(
  [],
  './upgrade-test-scripts/env_setup.sh',
  './upgrade-test-scripts/run_prepare.sh',
  './upgrade-test-scripts/start_to_to.sh',
  '/usr/src/upgrade-test-scripts/',
)}
WORKDIR /usr/src/upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN ./run_prepare.sh ${path}
`;
  },
  /**
   * Execute a prepared upgrade.
   * - Start agd with the SDK that has the upgradeHandler
   * - Run any core-evals associated with the proposal (either the ones specified in prepare, or straight from the proposal)
   */
  EXECUTE({
    path,
    planName,
    proposalName,
    sdkImageTag,
  }: SoftwareUpgradePackage) {
    return `
# EXECUTE ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${sdkImageTag} as execute-${proposalName}

WORKDIR /usr/src/upgrade-test-scripts

# base is a fresh sdk image so set up the proposal and its dependencies
${createCopyCommand(
  ['host', 'node_modules', '**/.yarn/install-state.gz', 'test', 'test.sh'],
  `./proposals/${path}`,
  `/usr/src/proposals/${path}`,
)}
${createCopyCommand(
  [],
  './upgrade-test-scripts/env_setup.sh',
  './upgrade-test-scripts/run_execute.sh',
  './upgrade-test-scripts/start_to_to.sh',
  './upgrade-test-scripts/install_deps.sh',
  '/usr/src/upgrade-test-scripts/',
)}
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${path}

# Copy chain state from previous PREPARE stage
COPY --from=prepare-${proposalName} /root/.agoric /root/.agoric

SHELL ["/bin/bash", "-c"]
RUN ./run_execute.sh ${planName}
`;
  },
  /**
   * Run a core-eval proposal
   * - Run the core-eval scripts from the proposal. They are only guaranteed to have started, not completed.
   */
  EVAL(
    { path, proposalName }: CoreEvalPackage | ParameterChangePackage,
    lastProposal: ProposalInfo,
    currentSdkImageTag: string,
  ) {
    return `
# EVAL ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${currentSdkImageTag} as eval-${proposalName}

# Copy chain state from previous layer
COPY --from=use-${lastProposal.proposalName} /root/.agoric /root/.agoric

${createCopyCommand(
  ['host', 'node_modules', '**/.yarn/install-state.gz', 'test', 'test.sh'],
  `./proposals/${path}`,
  `/usr/src/proposals/${path}`,
)}

WORKDIR /usr/src/upgrade-test-scripts

# First stage of this proposal so install its deps.
${createCopyCommand(
  [],
  './upgrade-test-scripts/install_deps.sh',
  '/usr/src/upgrade-test-scripts/',
)}
RUN --mount=type=cache,target=/root/.yarn ./install_deps.sh ${path}

${createCopyCommand(
  [],
  './upgrade-test-scripts/*eval*',
  '/usr/src/upgrade-test-scripts/',
)}
SHELL ["/bin/bash", "-c"]
RUN ./run_eval.sh ${path}
`;
  },
  /**
   * Use the proposal
   *
   * - Perform any mutations that should be part of chain history
   */
  USE(proposal: ProposalInfo, currentSdkImageTag: string) {
    const { path, proposalName, type } = proposal;
    const previousStage =
      type === 'Software Upgrade Proposal' ? 'execute' : 'eval';

    return `
# USE ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${currentSdkImageTag} as use-${proposalName}

LABEL agoric.sdk-image-tag="${currentSdkImageTag}"

# Copy chain state from previous stage
COPY --from=${previousStage}-${proposalName} /root/.agoric /root/.agoric

WORKDIR /usr/src/upgrade-test-scripts

${createCopyCommand(
  [],
  './upgrade-test-scripts/run_use.sh',
  './upgrade-test-scripts/start_agd.sh',
  '/usr/src/upgrade-test-scripts/',
)}
SHELL ["/bin/bash", "-c"]
RUN ./run_use.sh ${path}
ENTRYPOINT ./start_agd.sh
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
  TEST({ path, proposalName }: ProposalInfo, currentSdkImageTag: string) {
    return `
# TEST ${proposalName}
FROM ghcr.io/agoric/agoric-sdk:${currentSdkImageTag} as test-${proposalName}

# Copy chain state from USE stage
COPY --from=use-${proposalName} /root/.agoric /root/.agoric

# Previous stages copied excluding test files (see COPY above). It would be good
# to copy only missing files, but there may be none. Fortunately, copying extra
# does not invalidate other images because nothing depends on this layer.
${createCopyCommand(
  ['host', 'node_modules', '**/.yarn/install-state.gz'],
  `./proposals/${path}`,
  `/usr/src/proposals/${path}`,
)}

WORKDIR /usr/src/upgrade-test-scripts

${createCopyCommand(
  [],
  './upgrade-test-scripts/run_test.sh',
  '/usr/src/upgrade-test-scripts/',
)}
SHELL ["/bin/bash", "-c"]
ENTRYPOINT ./run_test.sh ${path}
`;
  },
  /**
   * The last target in the file, for untargeted `docker build`
   */
  LAST(lastProposal: ProposalInfo) {
    return `
## LAST
FROM use-${lastProposal.proposalName} as latest
`;
  },
};

export const createCopyCommand = (
  exclusionList: Array<string>,
  ...files: Array<string>
) =>
  [
    'COPY',
    '--chmod=755',
    ...exclusionList.map(excluded => `--exclude=${excluded}`),
    ...files,
  ].join(' ');

export function writeBakefileProposals(
  range: ProposalRange,
  platforms?: Platform[],
) {
  const json = {
    variable: {
      PLATFORMS: {
        default: platforms || null,
      },
      PROPOSALS: {
        default: range.proposals.map(p => p.proposalName),
      },
      UPGRADE_PROPOSALS: {
        default: range.proposals
          .filter(p => p.type === 'Software Upgrade Proposal')
          .map(p => p.proposalName),
      },
    },
  };
  fs.writeFileSync('docker-bake.json', JSON.stringify(json, null, 2));
}

export function writeDockerfile(range: ProposalRange) {
  // Each stage tests something about the left argument and prepare an upgrade to the right side (by passing the proposal and halting the chain.)
  // The upgrade doesn't happen until the next stage begins executing.
  const blocks: string[] = [syntaxPragma];

  let previousProposal = range.previousProposal;
  let currentSdkImageTag = 'latest'; // Default SDK image tag

  if (previousProposal) {
    blocks.push(stage.RESUME(previousProposal.proposalName));
    // TODO: Extract SDK image tag from existing image when resuming
    // For now, we'll use the first proposal's SDK image tag if available
    const firstUpgradeProposal = range.proposals.find(
      p => p.type === 'Software Upgrade Proposal',
    ) as SoftwareUpgradePackage | undefined;
    if (firstUpgradeProposal) {
      currentSdkImageTag = firstUpgradeProposal.sdkImageTag;
    }
  }

  for (const proposal of range.proposals) {
    // UNTIL region support https://github.com/microsoft/vscode-docker/issues/230
    blocks.push(
      `#----------------\n# ${proposal.proposalName}\n#----------------`,
    );

    switch (proposal.type) {
      case '/agoric.swingset.CoreEvalProposal':
      case '/cosmos.params.v1beta1.ParameterChangeProposal':
        blocks.push(
          stage.EVAL(proposal, previousProposal!, currentSdkImageTag),
        );
        break;
      case 'Software Upgrade Proposal':
        // Update SDK image tag for upgrade proposals
        currentSdkImageTag = proposal.sdkImageTag;
        if (previousProposal) {
          // For PREPARE, use the previous SDK image tag, not the new one
          const previousSdkImageTag = getPreviousSdkImageTag(
            previousProposal,
            range.proposals,
          );
          blocks.push(
            stage.PREPARE(proposal, previousProposal, previousSdkImageTag),
          );
        } else {
          // handle the first proposal of the chain specially
          blocks.push(
            stage.PREPARE_ZERO(proposal.proposalName, proposal.planName),
          );
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
    blocks.push(stage.USE(proposal, currentSdkImageTag));
    blocks.push(stage.TEST(proposal, currentSdkImageTag));
    previousProposal = proposal;
  }

  if (range.lastProposalIsLatest) {
    // If one of the proposals is a passed proposal, make the latest one the default entrypoint
    const lastPassed = range.proposals.findLast(isPassed);
    if (lastPassed) {
      blocks.push(stage.LAST(lastPassed));
    }
  }

  const contents = blocks.join('\n');
  fs.writeFileSync('Dockerfile', contents);
}

/**
 * Get the SDK image tag that should be used for a given proposal's base image
 */
function getPreviousSdkImageTag(
  previousProposal: ProposalInfo,
  allProposals: ProposalInfo[],
): string {
  // Find the most recent upgrade proposal before the current one
  const previousIndex = allProposals.findIndex(
    p => p.proposalName === previousProposal.proposalName,
  );

  // Look backwards for the last upgrade proposal
  for (let i = previousIndex; i >= 0; i--) {
    const prop = allProposals[i];
    if (prop.type === 'Software Upgrade Proposal') {
      return prop.sdkImageTag;
    }
  }

  // Default fallback
  return 'latest';
}
