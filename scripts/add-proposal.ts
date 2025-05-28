#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { saveProposalContents } from '../packages/synthetic-chain/src/cli/chain.ts';
import {
  readProposalsOf,
  type CoreEvalPackage,
} from '../packages/synthetic-chain/src/cli/proposals.ts';
import { makeBundleCache } from '../packages/synthetic-chain/src/lib/bundles.js';
import {
  makeDirRW,
  makeFileRW,
  type DirRW,
} from '../packages/synthetic-chain/src/lib/webAsset.js';

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

const { env } = process;
const home = makeFileRW(env.HOME || env.USERPROFILE || '.', { fsp, path });
const cwd = makeDirRW('.', { fsp, fs, path });

const present = (await readProposalsOf(cwd.readOnly())).some(
  p => p.proposalIdentifier === id,
);
assert(!present, `proposal ${id} already exists`);

// Define a stubProposal function or import it from the appropriate module
async function stubProposal(proposal: CoreEvalPackage, root: DirRW) {
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
  await packageJsonPath
    .asFileRW()
    .writeText(JSON.stringify(minProposalPackage, null, 2));

  // set up package manager and lock
  const yarnrcPath = proposalDir.asFileRW().join('.yarnrc.yml');
  await yarnrcPath.writeText('nodeLinker: node-modules\n');
  const yarnLockPath = proposalDir.join('yarn.lock');
  await yarnLockPath.touch();
  execSync('yarn install', { cwd: `${proposalDir}`, stdio: 'inherit' });
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
