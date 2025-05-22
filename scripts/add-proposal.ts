#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';
import assert from 'node:assert';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { saveProposalContents } from '../packages/synthetic-chain/src/cli/chain.ts';
import { readProposals } from '../packages/synthetic-chain/src/cli/proposals.ts';

const { positionals } = parseArgs({
  allowPositionals: true,
});

const [id] = positionals;
assert(id, 'must specify id to save');

const root = path.resolve('.');

const allProposals = readProposals(root);

const proposal = allProposals.find(p => p.proposalIdentifier === id);
assert(proposal, `proposal ${id} not found`);
saveProposalContents(proposal);
