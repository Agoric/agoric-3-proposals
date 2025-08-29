// @ts-check
import '@endo/init/legacy.js'; // compat with tendermint-rpc < 0.34 which has axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { passStyleOf } from '@endo/pass-style';
import test from 'ava';
import { sendWalletAction, ymaxControlAddr } from '../wallet-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

test.serial('postalService is in vstorage', async t => {
  const instanceEntries = await vsc.readPublished('agoricNames.instance');
  const instances = fromEntries(instanceEntries);
  const { postalService } = instances;

  t.is(passStyleOf(postalService), 'remotable');
});

test.serial('invoke ymaxControl to getPublicFacet', async t => {
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id: 100,
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'ymax0.publicFacet' },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      // @ts-expect-error XXX old type from npm
      update.updated === 'invocation' && update.id === 100 && !!update.result,
    'invoke ymaxControl',
    { setTimeout },
  );
  t.log(actionUpdate);

  t.pass('ymaxControl invocation produced result');
});

test.serial('invoke publicFacet from terminated contract', async t => {
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id: 101,
      targetName: 'ymax0.publicFacet',
      method: 'makeOpenPortfolioInvitation',
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      // @ts-expect-error XXX old type from npm
      update.updated === 'invocation' && update.id === 101 && !!update.error,
    'invoke ymax0.publicFacet',
    { setTimeout },
  );
  t.log(actionUpdate);

  t.pass('current ymax0.publicFacet is from a terminated vat');
});
