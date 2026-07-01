// @ts-check
import '@endo/init/legacy.js'; // compat with tendermint-rpc < 0.34 which has axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import test from 'ava';
import {
  makeActionId,
  sendWalletAction,
  ymax0ControlAddr,
} from '../wallet-util.js';

const { fromEntries } = Object;

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

// The ContractControl that proposal 111 delivered to ymax0Control (redeemed in
// use.sh, saved as `ymaxControl`) can be invoked to reach the ymax0 contract.
test.serial('ymax0Control can invoke the delivered ymaxControl', async t => {
  const id = makeActionId('getPublicFacet');

  /** @type {BridgeAction} */
  const invokeAction = {
    method: 'invokeEntry',
    message: {
      id,
      targetName: 'ymaxControl',
      method: 'getPublicFacet',
      args: [],
      saveResult: { name: 'ymax0.publicFacet', overwrite: true },
    },
  };

  await sendWalletAction(vsc, ymax0ControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymax0ControlAddr}`),
    update =>
      update.updated === 'invocation' && update.id === id && !!update.result,
    'invoke ymaxControl getPublicFacet',
    { setTimeout },
  );
  t.log(actionUpdate);
  // @ts-expect-error type narrowing lost
  t.deepEqual(actionUpdate.result, {
    name: 'ymax0.publicFacet',
    passStyle: 'remotable',
  });
});

// YMax Beta sets up control of ymax1 but does not deploy a ymax1 contract
// instance; ymax0 (alpha) remains deployed.
test.serial('beta sets up ymax1 control without a ymax1 instance', async t => {
  const instances = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  t.truthy(instances.ymax0, 'ymax0 instance is present');
  t.is(instances.ymax1, undefined, 'the beta deploys no ymax1 instance');
});
