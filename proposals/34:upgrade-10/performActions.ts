#!/usr/bin/env tsx

// FIXME get TypeScript to resolve these, probably with lib:ES2022
import assert from 'node:assert/strict';
import {
  provisionWallet,
  implementNewAuctionParams,
  raiseDebtCeiling,
  pushPrice,
} from './actions.js';
import {
  agd,
  agoric,
  agops,
} from '../../upgrade-test-scripts/lib/cliHelper.js';
import {
  GOV1ADDR,
  GOV2ADDR,
} from '../../upgrade-test-scripts/lib/constants.js';
import {
  getUser,
  waitForBlock,
} from '../../upgrade-test-scripts/lib/commonUpgradeHelpers.js';
import { submitDeliverInbound } from './upgradeHelpers.js';
import {
  openVault,
  adjustVault,
  closeVault,
} from '../../upgrade-test-scripts/lib/econHelpers.js';

const START_FREQUENCY = 600; // StartFrequency: 600s (auction runs every 10m)
const CLOCK_STEP = 20; // ClockStep: 20s (ensures auction completes in time)
const PRICE_LOCK_PERIOD = 300;
const oraclesAddresses = [GOV1ADDR, GOV2ADDR];

await waitForBlock(2);
await submitDeliverInbound('user1');

const oracles = oraclesAddresses.map((address, i) => ({
  address,
  acceptanceOfferId: i, // for re-use between accept and push
}));

console.log('Ensure user2 provisioned');
await provisionWallet('user2');

console.log('Ensure auction params have changed');
await implementNewAuctionParams(
  GOV1ADDR,
  oracles,
  START_FREQUENCY,
  CLOCK_STEP,
  PRICE_LOCK_PERIOD,
);

const govParams = await agoric.follow('-lF', ':published.auction.governance');
assert.equal(govParams.current.ClockStep.value.relValue, CLOCK_STEP.toString());
assert.equal(
  govParams.current.StartFrequency.value.relValue,
  START_FREQUENCY.toString(),
);

console.log('Ensure debt ceiling raised');
await raiseDebtCeiling(GOV1ADDR);
const params = await agoric.follow(
  '-lF',
  ':published.vaultFactory.managers.manager0.governance',
);
assert.equal(params.current.DebtLimit.value.value, '123000000000000');

console.log('Update oracle prices');
await pushPrice(oracles, 12.01);

console.log('Open Vaults');
const currentVaults = await agops.vaults('list', '--from', GOV1ADDR);
assert.equal(currentVaults.length, 0);

const vaults = [
  { mint: 5.0, collateral: 9.0 },
  { mint: 6.0, collateral: 10.0 },
];

for (const vault of vaults) {
  await openVault(GOV1ADDR, vault.mint, vault.collateral);
}

await adjustVault(GOV1ADDR, 'vault0', { wantCollateral: 1.0 });
await adjustVault(GOV1ADDR, 'vault0', { wantMinted: 1.0 });
await closeVault(GOV1ADDR, 'vault1', 6.06);

const user2 = await getUser('user2');
await openVault(user2, 7, 11);
await adjustVault(user2, 'vault2', { giveMinted: 1.5 });
await adjustVault(user2, 'vault2', { giveCollateral: 2.0 });
await closeVault(user2, 'vault2', 5.75);
