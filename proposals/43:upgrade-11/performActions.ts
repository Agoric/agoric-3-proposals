#!/usr/bin/env tsx

// FIXME get TypeScript to resolve these, probably with lib:ES2022
import assert from 'node:assert/strict';

import { agoric, agops } from '../../upgrade-test-scripts/lib/cliHelper.js';
import { GOV1ADDR } from '../../upgrade-test-scripts/lib/constants.js';
import {
  openVault,
  adjustVault,
  closeVault,
} from '../../upgrade-test-scripts/lib/econHelpers.js';

console.log('Open Vaults');

const currentVaults = await agops.vaults('list', '--from', GOV1ADDR);
assert.equal(currentVaults.length, 2);

await openVault(GOV1ADDR, 7, 11);
await adjustVault(GOV1ADDR, 'vault3', { giveMinted: 1.5 });
await adjustVault(GOV1ADDR, 'vault3', { giveCollateral: 2.0 });
await closeVault(GOV1ADDR, 'vault3', 5.75);

const vault3 = await agoric.follow(
  '-lF',
  ':published.vaultFactory.managers.manager0.vaults.vault3',
);
assert.equal(vault3.vaultState, 'closed');
assert.equal(vault3.locked.value, '0');
assert.equal(vault3.debtSnapshot.debt.value, '0');
