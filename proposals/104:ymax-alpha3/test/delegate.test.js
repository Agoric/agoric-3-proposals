// @ts-check
import '@endo/init/legacy.js'; // compat with tendermint-rpc < 0.34 which has axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import test from 'ava';
import { sendWalletAction, ymaxControlAddr } from '../wallet-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

test.serial('invoke ymaxControl to getPublicFacet', async t => {
  /** @type {BridgeAction} */
  const invokeAction = {
    // @ts-expect-error old type from npm
    method: 'invokeEntry',
    message: {
      id: 100,
      targetName: 'ymaxControl',
      method: 'getPublicFacet',
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
  // @ts-expect-error XXX old type
  t.deepEqual(actionUpdate.result, {
    name: 'ymax0.publicFacet',
    passStyle: 'remotable',
  });
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
      args: [],
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
  // @ts-expect-error XXX old type
  t.is(actionUpdate.error, 'Error: vat terminated');
});
