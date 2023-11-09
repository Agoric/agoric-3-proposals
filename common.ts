#!/usr/bin/env tsx
// @ts-check

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
};

export type ProposalInfo = SoftwareUpgradeProposal | CoreEvalProposal;

function readInfo(proposalPath: string): ProposalInfo {
  const configPath = path.join('proposals', proposalPath, 'config.json');
  const config = fs.readFileSync(configPath, 'utf-8');
  const [proposalIdentifier, proposalName] = proposalPath.split(':');
  return {
    ...JSON.parse(config),
    proposalIdentifier,
    proposalName,
  };
}

export function readProposals(): ProposalInfo[] {
  const proposalPaths = fs
    .readdirSync('./proposals', { withFileTypes: true })
    .filter(dirent => dirent.isDirectory()) // omit files
    .map(dirent => dirent.name)
    .filter(name => name.includes(':')); // omit node_modules
  return proposalPaths.map(readInfo);
}

export function imageNameForProposal(
  proposal: ProposalCommon,
  stage: 'use' | 'test',
) {
  const target = `${stage}-${proposal.proposalName}`;
  return {
    name: `${repository}:${target}`,
    target,
  };
}
