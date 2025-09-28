// @ts-check
import '@endo/init/legacy.js'; // compat with tendermint-rpc < 0.34 which has axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { GOV1ADDR } from '@agoric/synthetic-chain';
import test from 'ava';
import { sendWalletAction, ymaxControlAddr } from '../wallet-util.js';

const { fromEntries } = Object;

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

test.serial('invoke ymaxControl to getPublicFacet', async t => {
  /** @type {BridgeAction} */
  const invokeAction = {
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
      update.updated === 'invocation' && update.id === 100 && !!update.result,
    'invoke ymaxControl',
    { setTimeout },
  );
  // @ts-expect-error type narrowing lost
  t.deepEqual(actionUpdate.result, {
    name: 'ymax0.publicFacet',
    passStyle: 'remotable',
  });
});

test.serial('ymax0 told zoe that Access token is required', async t => {
  const { ymax0 } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const id = 'open.132';

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'contract',
        instance: ymax0,
        publicInvitationMaker: 'makeOpenPortfolioInvitation',
      },
      proposal: {},
    },
  };

  await sendWalletAction(vsc, GOV1ADDR, redeemAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${GOV1ADDR}`),
    update =>
      update.updated === 'offerStatus' &&
      update.status.id === id &&
      !!update.status.error,
    'invoke ymax0.publicFacet',
    { setTimeout },
  );
  t.log(actionUpdate);
  // @ts-expect-error type narrowing lost
  t.regex(actionUpdate.status.error, /missing properties \["Access"\]/);
});
