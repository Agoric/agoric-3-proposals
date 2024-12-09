#!/usr/bin/env node

import assert from 'node:assert/strict';
import {
  GOV1ADDR,
  GOV2ADDR,
  agd,
  agoric,
  agops,
  getUser,
  newOfferId,
  waitForBlock,
  openVault,
  adjustVault,
  closeVault,
} from '@agoric/synthetic-chain';
import {
  provisionWallet,
  implementNewAuctionParams,
  raiseDebtCeiling,
  pushPrice,
} from './actions.js';
import { submitDeliverInbound } from './upgradeHelpers.js';

const START_FREQUENCY = 600; // StartFrequency: 600s (auction runs every 10m)
const CLOCK_STEP = 20; // ClockStep: 20s (ensures auction completes in time)
const PRICE_LOCK_PERIOD = 300;
const oraclesAddresses = [GOV1ADDR, GOV2ADDR];

await waitForBlock(2);
await submitDeliverInbound('user1');

const oracles = [];
for (const oracle of oraclesAddresses) {
  const offerId = await newOfferId();
  oracles.push({ address: oracle, id: offerId });
}

console.log('Ensure user2 provisioned');
await provisionWallet('user2');

// XXX no need to test the helper function here
// const user2Address = await getUser('user2');
// const data = await agd.query(
//   'vstorage',
//   'data',
//   `published.wallet.${user2Address}`,
// );

// assert.equal(data.value, '');

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
