#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { makeTendermint34Client } from '@agoric/client-utils';
import { QueryClient, setupGovExtension } from '@cosmjs/stargate';
import { ProposalStatus } from 'cosmjs-types/cosmos/gov/v1beta1/gov.js';

import { saveProposalContents, DEFAULT_ARCHIVE_NODE } from '../packages/synthetic-chain/src/cli/chain.ts';
import {
  readProposalsOf,
  type CoreEvalPackage,
  type StakingParamUpdatePackage,
  type ParameterChangePackage,
  type ProposalInfo,
} from '../packages/synthetic-chain/src/cli/proposals.ts';
import { makeBundleCache } from '../packages/synthetic-chain/src/lib/bundles.js';
import {
  makeDirRW,
  makeFileRW,
  type DirRW,
} from '../packages/synthetic-chain/src/lib/webAsset.js';

// XXX stagnant version numbers
const createMinProposalPackage = (proposalType: string) => ({
  agoricProposal: {
    type: proposalType,
  },
  type: 'module',
  dependencies: {
    '@agoric/synthetic-chain': '~0.6.1',
  },
  packageManager: 'yarn@4.9.4',
});

const { positionals } = parseArgs({
  allowPositionals: true,
});

const [id, name] = positionals;
assert(id, 'must specify proposal id to fetch');
assert(name, 'must specify local name for proposal');

const { env } = process;
const home = makeFileRW(env.HOME || env.USERPROFILE || '.', { fsp, path });
const cwd = makeDirRW('.', { fsp, fs, path });

const present = (await readProposalsOf(cwd.readOnly())).some(
  p => p.proposalIdentifier === id,
);
assert(!present, `proposal ${id} already exists`);

// Fetch proposal from chain to determine its type
console.log(`Fetching proposal ${id} from chain to determine type...`);
const tm = await makeTendermint34Client(DEFAULT_ARCHIVE_NODE, { fetch });
const queryClient = QueryClient.withExtensions(tm, setupGovExtension);

const { proposal: chainProposal } = await queryClient.gov.proposal(id);
console.log('Chain proposal data:', chainProposal);
assert.equal(chainProposal.proposalId, id);
assert.equal(chainProposal.status, ProposalStatus.PROPOSAL_STATUS_PASSED);

const proposalType = chainProposal.content?.typeUrl;
assert(proposalType, 'Missing proposal type in chain data');

console.log(`Detected proposal type: ${proposalType}`);

// Create proposal object based on detected type
let proposal: ProposalInfo;
switch (proposalType) {
  case '/agoric.swingset.CoreEvalProposal':
    proposal = {
      type: '/agoric.swingset.CoreEvalProposal',
      path: `proposals/${id}:${name}`,
      proposalIdentifier: id,
      proposalName: name,
      source: 'subdir',
    } as CoreEvalPackage;
    break;
  case '/cosmos.staking.v1beta1.MsgUpdateParams':
    proposal = {
      type: '/cosmos.staking.v1beta1.MsgUpdateParams',
      path: `proposals/${id}:${name}`,
      proposalIdentifier: id,
      proposalName: name,
    } as StakingParamUpdatePackage;
    break;
  case '/cosmos.params.v1beta1.ParameterChangeProposal':
    proposal = {
      type: '/cosmos.params.v1beta1.ParameterChangeProposal',
      path: `proposals/${id}:${name}`,
      proposalIdentifier: id,
      proposalName: name,
    } as ParameterChangePackage;
    break;
  default:
    throw new Error(`Unsupported proposal type: ${proposalType}`);
}

// Define a stubProposal function or import it from the appropriate module
async function stubProposal(proposal: ProposalInfo, root: DirRW) {
  const proposalDir = root.join(
    'proposals',
    `${proposal.proposalIdentifier}:${proposal.proposalName}`,
  );
  assert(
    !proposalDir.readOnly().existsSync(),
    `Proposal directory ${proposalDir} already exists`,
  );
  await proposalDir.mkdir();
  
  // Create a package.json file with the proposal details
  const packageJsonPath = proposalDir.join('package.json');
  const minProposalPackage = createMinProposalPackage(proposal.type);
  await packageJsonPath
    .asFileRW()
    .writeText(JSON.stringify(minProposalPackage, null, 2));

  // set up package manager and lock
  const yarnrcPath = proposalDir.asFileRW().join('.yarnrc.yml');
  await yarnrcPath.writeText('nodeLinker: node-modules\n');
  const yarnLockPath = proposalDir.join('yarn.lock');
  await yarnLockPath.touch();
  execSync('yarn install', { cwd: `${proposalDir}`, stdio: 'inherit' });

  // Create README with proposal information
  const readmePath = proposalDir.join('README.md');
  const readmeContent = createReadmeContent(chainProposal, proposal);
  await readmePath.asFileRW().writeText(readmeContent);
}

function createReadmeContent(chainProposal: any, proposal: ProposalInfo): string {
  const title = chainProposal.content?.title || `Proposal ${proposal.proposalIdentifier}`;
  const description = chainProposal.content?.description || 'No description available';
  
  let content = `# ${title}\n\n`;
  content += `**Proposal ID:** ${proposal.proposalIdentifier}\n`;
  content += `**Type:** ${proposal.type}\n`;
  content += `**Status:** ${ProposalStatus[chainProposal.status]}\n\n`;
  content += `## Description\n\n${description}\n\n`;
  
  if (proposal.type === '/cosmos.staking.v1beta1.MsgUpdateParams') {
    content += `## Staking Parameter Updates\n\n`;
    content += `This proposal updates staking module parameters. See \`proposal-data.json\` for the specific parameter changes.\n\n`;
  } else if (proposal.type === '/agoric.swingset.CoreEvalProposal') {
    content += `## Core Evaluation\n\n`;
    content += `Files under \`submission/\` contain the core evaluation code and permits.\n\n`;
  }
  
  content += `## Proposal Information\n\n`;
  content += `- **Submit Time:** ${chainProposal.submitTime}\n`;
  content += `- **Voting Start Time:** ${chainProposal.votingStartTime}\n`;
  content += `- **Voting End Time:** ${chainProposal.votingEndTime}\n`;
  content += `- **Total Deposit:** ${chainProposal.totalDeposit?.map((d: any) => `${d.amount} ${d.denom}`).join(', ') || 'N/A'}\n`;
  
  return content;
}

console.log(
  'Creating proposal',
  proposal.proposalIdentifier,
  proposal.proposalName,
  'of type',
  proposal.type,
);
try {
  await stubProposal(proposal, cwd);

  const proposals = cwd.join('proposals');
  const cache = makeBundleCache(home.join('.agoric', 'cache'));
  await saveProposalContents(proposal, proposals, cache, { fetch });
  console.log(
    `Proposal ${proposal.proposalIdentifier} created in ${proposal.path}`,
  );
} catch (error) {
  console.error('Error saving proposal contents:', error);
  console.error(
    'Try deleting the new files, runnning scripts/fetch-all-bundles.ts, and then re-running this script.',
  );
}
