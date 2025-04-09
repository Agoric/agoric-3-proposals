// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js'; // axios compat

import { LOCAL_CONFIG, makeSmartWalletKit } from '@agoric/client-utils';
import test from 'ava';
import { getIncarnation } from '@agoric/synthetic-chain';

const io = {
  delay: ms => new Promise(resolve => setTimeout(() => resolve(undefined), ms)),
  fetch: global.fetch,
};

test('accounts', async t => {
  const swk = await makeSmartWalletKit(io, LOCAL_CONFIG);

  // XXX readPublished once it can handle plain JSON
  const nodeStr = await swk.vstorage.readLatest('published.fastUsdc');
  const { values } = JSON.parse(JSON.parse(nodeStr).value);
  const { poolAccount, settlementAccount } = JSON.parse(values[0]);

  // exact addresses are not available at design time
  t.true(poolAccount.startsWith('agoric1'));
  t.true(settlementAccount.startsWith('agoric1'));
});

test(`fastUsdc incarnation reflects rc2`, async t => {
  const history = { beta: 0, rc1: 1, rc2: 2 };
  t.is(await getIncarnation('fastUsdc'), history.rc2);
});

test('feedPolicy updated for GTM', async t => {
  const swk = await makeSmartWalletKit(io, LOCAL_CONFIG);

  const policy = await swk.readPublished('fastUsdc.feedPolicy');
  t.log('policy', policy);
  t.like(policy, {
    chainPolicies: {
      Arbitrum: {
        confirmations: 96, // was 2 in Beta
      },
    },
  });
});
