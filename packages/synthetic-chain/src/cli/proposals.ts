import assert from 'node:assert';
import fs from 'node:fs';
import * as path from 'node:path';
import type { DirRd, FileRd } from '../lib/webAsset.js';
import type { AgoricSyntheticChainConfig } from './build.js';

export const repository = 'ghcr.io/agoric/agoric-3-proposals';

type ProposalCommon = {
  path: string; // in the proposals directory
  proposalName: string;
  proposalIdentifier: string;
};

export type ProposalRange = {
  allProposals: ProposalInfo[];
  previousProposal?: ProposalInfo;
  proposals: ProposalInfo[];
  proposalsToTest: ProposalInfo[];
  lastProposalIsLatest: boolean;
};

export function synthesizePreviousProposal(fromTag: string): ProposalInfo {
  const proposalName = fromTag.replace(/^use-/, '');

  return {
    proposalName,
    proposalIdentifier: proposalName,
    // XXX these are bogus
    path: '.',
    type: '/agoric.swingset.CoreEvalProposal',
    source: 'subdir',
  };
}

export function getProposalRange(
  allProposals: ProposalInfo[],
  { fromTag }: AgoricSyntheticChainConfig,
  {
    start,
    stop,
    match,
    exact,
  }: { start: string; stop: string; match?: string; exact?: boolean },
): ProposalRange {
  let failures = '';
  let sep = '';

  const startIndex = allProposals.findIndex(p => p.proposalName === start);
  if (start && startIndex < 0) {
    failures += `${sep}Start proposal "${start}" not found`;
    sep = ', ';
  }

  const stopIndex = allProposals.findIndex(p => p.proposalName === stop);
  if (stop && stopIndex < 0) {
    failures += `${sep}Stop proposal "${stop}" not found`;
    sep = ', ';
  }

  if (failures) {
    console.error(`Getting proposal range:`, { start, stop });
    throw new Error(`Invalid proposal range: ${failures}`);
  }

  const sliceStart = start ? startIndex : 0;
  const sliceEnd = stop ? stopIndex : allProposals.length;
  const proposals = allProposals.slice(sliceStart, sliceEnd);

  const previousProposal = sliceStart
    ? allProposals[sliceStart - 1]
    : fromTag
      ? synthesizePreviousProposal(fromTag)
      : undefined;

  if (proposals.length === 0) {
    failures += `${sep}No proposals found`;
    sep = ', ';
  }

  if (
    previousProposal &&
    proposals.some(p => p.proposalName === previousProposal.proposalName)
  ) {
    throw Error(
      `Unexpected previous proposal ${previousProposal.proposalName}`,
    );
  }

  const proposalsToTest = match
    ? proposals.filter(p =>
        exact ? p.proposalName === match : p.proposalName.includes(match),
      )
    : proposals;
  const lastProposalIsLatest = sliceEnd === allProposals.length;

  if (failures) {
    console.error(
      `Considering proposals: ${proposals.map(p => p.proposalName).join(', ')}`,
    );
    throw new Error(`Invalid proposal range: ${failures}`);
  }

  return {
    allProposals,
    previousProposal,
    proposals,
    proposalsToTest,
    lastProposalIsLatest,
  };
}

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

/** @deprecated use readInfoOf */
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

async function readInfoOf(
  proposals: FileRd,
  proposalPath: string,
): Promise<ProposalInfo> {
  assert(
    proposalPath === proposalPath.toLowerCase(),
    // because they go in Dockerfile target names
    'proposal directories must be lowercase',
  );
  const packageJsonPath = proposals.join(proposalPath, 'package.json');
  const packageJson = await packageJsonPath.readText();
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

export function compareProposalDirNames(a: string, b: string): -1 | 0 | 1 {
  // Proposal directories should be named like "$position:$name", and we expect
  // $position to be numeric but this logic tolerates deviation.
  // Compare by position numerically, then by position lexicographically (by
  // code unit for simplicity), then by the full name.
  const [_a, aPos, aNumericPos] = a.match(/^(([0-9]+)|[^:]*):.*/) || [];
  const [_b, bPos, bNumericPos] = b.match(/^(([0-9]+)|[^:]*):.*/) || [];
  if (aNumericPos && !bNumericPos) return -1;
  if (!aNumericPos && bNumericPos) return 1;
  if (aNumericPos && bNumericPos) {
    if (Number(aNumericPos) < Number(bNumericPos)) return -1;
    if (Number(aNumericPos) > Number(bNumericPos)) return 1;
  }
  if (aPos !== undefined && bPos === undefined) return -1;
  if (aPos === undefined && bPos !== undefined) return 1;
  if (aPos !== undefined && bPos !== undefined) {
    if (aPos < bPos) return -1;
    if (aPos > bPos) return 1;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

/** @deprecated use readProposalsOf */
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
    .map(dirent => dirent.name)
    .sort(compareProposalDirNames);
  return proposalPaths.map(readInfo);
}

export async function readProposalsOf(
  proposalsParent: DirRd,
): Promise<ProposalInfo[]> {
  const proposalsDir = proposalsParent.join('proposals');
  const candidates = await proposalsDir.readdir();
  const proposalPaths = candidates
    .filter(dirent => {
      const hasPackageJson = dirent.join('package.json').existsSync();
      if (!hasPackageJson) {
        console.warn(
          'WARN ignoring non-package in proposal directory:',
          `${dirent}`,
        );
      }
      return hasPackageJson;
    })
    .sort((a, b) => compareProposalDirNames(a.basename(), b.basename()));
  return Promise.all(
    proposalPaths.map(p => readInfoOf(proposalsDir.asFileRd(), p.basename())),
  );
}

export function imageNameForProposal(
  proposal: Pick<ProposalCommon, 'proposalName'>,
  stage: 'test' | 'use',
) {
  const target = `${stage}-${proposal.proposalName}`;
  return { name: `${repository}:${target}`, target };
}

export function isPassed(proposal: ProposalInfo) {
  return proposal.proposalIdentifier.match(/^\d/);
}
