import assert from 'node:assert';
import fs from 'node:fs';
import * as path from 'node:path';

type ProposalCommon = {
  path: string; // in the proposals directory
  proposalName: string;
  proposalIdentifier: string;
};

export type SoftwareUpgradePackage = ProposalCommon & {
  sdkImageTag: string;
  planName: string;
  upgradeInfo?: unknown;
  /**
   * The URL for the notes of the release.
   * `false` for unreleased upgrades for which `upgradeInfo` cannot be validated
   */
  releaseNotes: string | false;
  type: 'Software Upgrade Proposal';
};

export type CoreEvalPackage = ProposalCommon & {
  type: '/agoric.swingset.CoreEvalProposal';
} & (
    | { source: 'build'; buildScript: string }
    | {
        // default behavior
        source: 'subdir';
      }
  );

export type ParameterChangePackage = ProposalCommon & {
  type: '/cosmos.params.v1beta1.ParameterChangeProposal';
};

export type ProposalInfo =
  | SoftwareUpgradePackage
  | CoreEvalPackage
  | ParameterChangePackage;

function readInfo(proposalPath: string): ProposalInfo {
  assert(
    proposalPath === proposalPath.toLowerCase(),
    // because they go in Dockerfile target names
    'proposal directories must be lowercase',
  );
  const packageJsonPath = path.join('proposals', proposalPath, 'package.json');
  const packageJson = fs.readFileSync(packageJsonPath, 'utf-8');
  const { agoricProposal } = JSON.parse(packageJson);
  // UNTIL https://github.com/Agoric/agoric-3-proposals/issues/77
  assert(agoricProposal, 'missing agoricProposal in package.json');
  const [proposalIdentifier, proposalName] = proposalPath.split(':');
  return {
    ...agoricProposal,
    path: proposalPath,
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
      assert('path' in dirent, 'missing path in dirent added in Node 18.17');
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

export function imageNameForProposal(
  proposal: Pick<ProposalCommon, 'proposalName'>,
  stage: 'test' | 'use',
  repositoryColon: string,
) {
  const target = `${stage}-${proposal.proposalName}`;
  return {
    name: `${repositoryColon}${target}`,
    target,
  };
}

export function isPassed(proposal: ProposalInfo) {
  return proposal.proposalIdentifier.match(/^\d/);
}
