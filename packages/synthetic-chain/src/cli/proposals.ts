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
  releaseNodes: string;
  type: 'Software Upgrade Proposal';
};

export type CoreEvalProposal = ProposalCommon & {
  type: '/agoric.swingset.CoreEvalProposal';
} & (
    | { source: 'build'; buildScript: string }
    | {
        source: 'subdir';
      }
  );

export type ProposalInfo = SoftwareUpgradeProposal | CoreEvalProposal;

function readInfo(proposalPath: string): ProposalInfo {
  const packageJsonPath = path.join('proposals', proposalPath, 'package.json');
  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { agoricProposal } = JSON.parse(packageJson);
  // TODO mustMatch a shape
  assert(agoricProposal, 'missing agoricProposal in package.json');
  const [proposalIdentifier, proposalName] = proposalPath.split(':');
  return {
    ...agoricProposal,
    proposalIdentifier,
    proposalName,
  };
}

export function readProposals(proposalsParent: string): ProposalInfo[] {
  const proposalsDir = path.join(proposalsParent, 'proposals');
  const proposalPaths = fs
    .readdirSync(proposalsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory()) // omit files
    .map(dirent => dirent.name)
    .filter(name => name.includes(':')); // omit node_modules
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

export function lastPassedProposal(proposals: ProposalInfo[]): ProposalInfo {
  const last = proposals.findLast(p => p.proposalIdentifier.match(/^\d/));
  assert(last, 'no passed proposals');
  return last;
}

export function imageNameForProposal(
  proposal: ProposalCommon,
  stage: 'test' | 'eval',
) {
  const target = `${stage}-${proposal.proposalName}`;
  return {
    name: `${repository}:${target}`,
    target,
  };
}
