/** @file adapted from upgrade-10's precheck, things that should be true at the end of upgrade-9 */
import test from 'ava';

import fsp from 'node:fs/promises';

import { StargateClient } from '@cosmjs/stargate';

import {
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  PSM_PAIR,
  agd,
  agops,
  agoric,
  getUser,
} from '@agoric/synthetic-chain';

const client = await StargateClient.connect('http://localhost:26657');

const provisionPoolAddr = 'agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346';

test(`Provision pool balances`, async t => {
  const balances = await client.getAllBalances(provisionPoolAddr);

  t.deepEqual(balances, [
    {
      amount: '19000000',
      denom: 'uist',
    },
  ]);
});

test('gov1 provisioned', async t => {
  const result = await agd.query(
    'vstorage',
    'data',
    `published.wallet.${GOV1ADDR}`,
  );

  t.not(result.value.length, 0);
});

test('gov2 provisioned', async t => {
  const result = await agd.query(
    'vstorage',
    'data',
    `published.wallet.${GOV2ADDR}`,
  );

  t.not(result.value.length, 0);
});

test('gov3 provisioned', async t => {
  const result = await agd.query(
    'vstorage',
    'data',
    `published.wallet.${GOV3ADDR}`,
  );

  t.not(result.value.length, 0);
});

test('user2 not provisioned', async t => {
  try {
    await getUser('user2');
    t.fail();
  } catch (error) {
    t.pass();
  }
});

test('no vaults exist', async t => {
  const result = await agd.query(
    'vstorage',
    'data',
    `published.vaultFactory.manager0.vaults.vault0`,
  );

  t.is(result.value, '');
});

test('PSM gov params were preserved', async t => {
  const toyUSDGovernance = await agoric.follow(
    '-lF',
    `:published.psm.${PSM_PAIR}.governance`,
  );

  const psmGovernanceData = await fsp.readFile(
    '/root/.agoric/psm_governance.json',
    'binary',
  );

  const psmGovernance = JSON.parse(psmGovernanceData);

  t.not(toyUSDGovernance.current.MintLimit.value.value, '0');
  t.is(
    toyUSDGovernance.current.MintLimit.value.value,
    psmGovernance.current.MintLimit.value.value,
  );
  t.is(toyUSDGovernance.current.GiveMintedFee.value.numerator.value, '0');
  t.is(
    toyUSDGovernance.current.GiveMintedFee.value.denominator.value,
    psmGovernance.current.GiveMintedFee.value.denominator.value,
  );
  t.is(toyUSDGovernance.current.WantMintedFee.value.numerator.value, '0');
  t.is(
    toyUSDGovernance.current.WantMintedFee.value.denominator.value,
    psmGovernance.current.WantMintedFee.value.denominator.value,
  );
});

test('PSM metric params were preserved', async t => {
  const toyUSDMetrics = await agoric.follow(
    '-lF',
    `:published.psm.${PSM_PAIR}.metrics`,
  );

  const psmMetricsData = await fsp.readFile(
    '/root/.agoric/psm_metrics.json',
    'binary',
  );

  const psmMetrics = JSON.parse(psmMetricsData);

  t.is(
    toyUSDMetrics.anchorPoolBalance.value,
    psmMetrics.anchorPoolBalance.value,
  );
  t.is(toyUSDMetrics.feePoolBalance.value, psmMetrics.feePoolBalance.value);
  t.is(
    toyUSDMetrics.mintedPoolBalance.value,
    psmMetrics.mintedPoolBalance.value,
  );
  t.is(
    toyUSDMetrics.totalMintedProvided.value,
    psmMetrics.totalMintedProvided.value,
  );
});

test('Provision pool metrics are retained across vaults upgrade', async t => {
  const provisionPoolMetrics = await agoric.follow(
    '-lF',
    ':published.provisionPool.metrics',
  );

  const provisionPoolMetricsData = await fsp.readFile(
    '/root/.agoric/provision_pool_metrics.json',
    'binary',
  );

  const testProvisionPoolMetrics = JSON.parse(provisionPoolMetricsData);

  t.is(
    provisionPoolMetrics.totalMintedConverted.value,
    testProvisionPoolMetrics.totalMintedConverted.value,
  );
  t.is(
    provisionPoolMetrics.totalMintedProvided.value,
    testProvisionPoolMetrics.totalMintedProvided.value,
  );
  t.is(
    provisionPoolMetrics.walletsProvisioned,
    testProvisionPoolMetrics.walletsProvisioned,
  );
});

test('Gov1 has no vaults', async t => {
  const vaults = await agops.vaults('list', '--from', GOV1ADDR);
  t.is(vaults.length, 0);
});
