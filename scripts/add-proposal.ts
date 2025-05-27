#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { saveProposalContents } from '../packages/synthetic-chain/src/cli/chain.ts';
import {
  readProposals,
  type CoreEvalPackage,
} from '../packages/synthetic-chain/src/cli/proposals.ts';

// XXX stagnant version numbers
const minProposalPackage = {
  agoricProposal: {
    type: '/agoric.swingset.CoreEvalProposal',
  },
  type: 'module',
  dependencies: {
    '@agoric/synthetic-chain': '~0.5.5',
  },
  packageManager: 'yarn@4.9.1',
};

const { positionals } = parseArgs({
  allowPositionals: true,
});

const [id, name] = positionals;
assert(id, 'must specify proposal id to fetch');
assert(name, 'must specify local name for proposal');

const root = path.resolve('.');

const present = readProposals(root).some(p => p.proposalIdentifier === id);
assert(!present, `proposal ${id} already exists`);

// Define a stubProposal function or import it from the appropriate module
function stubProposal(proposal: CoreEvalPackage, root: string) {
  const proposalDir = path.join(
    root,
    'proposals',
    `${proposal.proposalIdentifier}:${proposal.proposalName}`,
  );
  assert(
    !fs.existsSync(proposalDir),
    `Proposal directory ${proposalDir} already exists`,
  );
  fs.mkdirSync(proposalDir, { recursive: true });
  // Create a package.json file with the proposal details
  const packageJsonPath = path.join(proposalDir, 'package.json');
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(minProposalPackage, null, 2),
  );

  // set up package manager and lock
  const yarnrcPath = path.join(proposalDir, '.yarnrc.yml');
  fs.writeFileSync(yarnrcPath, 'nodeLinker: node-modules\n');
  const yarnLockPath = path.join(proposalDir, 'yarn.lock');
  fs.closeSync(fs.openSync(yarnLockPath, 'w'));
  execSync('yarn install', { cwd: proposalDir, stdio: 'inherit' });
}
const proposal: CoreEvalPackage = {
  type: '/agoric.swingset.CoreEvalProposal',
  path: `proposals/${id}:${name}`,
  proposalIdentifier: id,
  proposalName: name,
  source: 'subdir',
};

console.log(
  'Creating proposal',
  proposal.proposalIdentifier,
  proposal.proposalName,
);
try {
  stubProposal(proposal, root);
  await saveProposalContents(proposal);
  console.log(
    `Proposal ${proposal.proposalIdentifier} created in ${proposal.path}`,
  );
} catch (error) {
  console.error('Error saving proposal contents:', error);
  console.error(
    'Try deleting the new files, runnning scripts/fetch-all-bundles.ts, and then re-running this script.',
  );
}
