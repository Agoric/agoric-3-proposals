import assert from 'node:assert';
import fs from 'node:fs';
import * as path from 'node:path';

export const repository = 'ghcr.io/agoric/agoric-3-proposals';

type ProposalCommon = {
  proposalName: string;
  proposalIdentifier: string;
};

export type SoftwareUpgradeProposal = ProposalCommon & {
  sdkImageTag: string;
  planName: string;
  upgradeInfo?: unknown;
  releaseNodes: string;
  type: 'Software Upgrade Proposal';
};

export type CoreEvalProposal = ProposalCommon & {
  type: '/agoric.swingset.CoreEvalProposal';
} & (
    | { source: 'build'; buildScript: string }
    | {
        // default behavior
        source: 'subdir';
      }
  );

export type ParameterChangeProposal = ProposalCommon & {
  type: '/cosmos.params.v1beta1.ParameterChangeProposal';
};

export type ProposalInfo =
  | SoftwareUpgradeProposal
  | CoreEvalProposal
  | ParameterChangeProposal;

function readInfo(proposalPath: string): ProposalInfo {
  const packageJsonPath = path.join('proposals', proposalPath, 'package.json');
  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { agoricProposal } = JSON.parse(packageJson);
  // UNTIL https://github.com/Agoric/agoric-3-proposals/issues/77
  assert(agoricProposal, 'missing agoricProposal in package.json');
  const [proposalIdentifier, proposalName] = proposalPath.split(':');
  return {
    ...agoricProposal,
    proposalIdentifier,
    proposalName,
  };
}

export function encodeUpgradeInfo(upgradeInfo: unknown): string {
  return upgradeInfo != null ? JSON.stringify(upgradeInfo) : '';
}

export function readProposals(proposalsParent: string): ProposalInfo[] {
  const proposalsDir = path.join(proposalsParent, 'proposals');
  const proposalPaths = fs
    .readdirSync(proposalsDir, { withFileTypes: true })
    .filter(dirent => {
      const hasPackageJson = fs.existsSync(
        path.join(dirent.path, dirent.name, 'package.json'),
      );
      if (!hasPackageJson) {
        console.warn(
          'WARN ignoring non-package in proposal directory:',
          dirent.name,
        );
      }
      return hasPackageJson;
    })
    .map(dirent => dirent.name);
  return proposalPaths.map(readInfo);
}

export const matchOneProposal = (
  allProposals: ProposalInfo[],
  match: string,
) => {
  const proposals = allProposals.filter(p => p.proposalName.includes(match));

  assert(proposals.length > 0, 'no proposals match');
  assert(proposals.length === 1, 'too many proposals match');
  return proposals[0];
};

export function imageNameForProposal(
  proposal: Pick<ProposalCommon, 'proposalName'>,
  stage: 'test' | 'use',
) {
  const target = `${stage}-${proposal.proposalName}`;
  return {
    name: `${repository}:${target}`,
    target,
  };
}

export function isPassed(proposal: ProposalInfo) {
  return proposal.proposalIdentifier.match(/^\d/);
}
