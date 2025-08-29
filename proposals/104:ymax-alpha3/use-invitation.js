#!/usr/bin/env node
/** @file redeem ymaxControl invitation as was done on mainnet. */
// @ts-check
import '@endo/init/legacy.js'; // XXX axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { sendWalletAction, ymaxControlAddr } from './wallet-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

const redeemInvitation = async () => {
  const instances = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  const { postalService } = instances;

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id: 'redeem-1',
      invitationSpec: {
        source: 'purse',
        instance: postalService,
        description: 'deliver ymaxControl',
      },
      proposal: {},
      // @ts-expect-error XXX old type
      saveResult: { name: 'ymaxControl' },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, redeemAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update => update.updated === 'offerStatus' && !!update.status.result,
    'redeem offer',
    { setTimeout },
  );

  console.log(actionUpdate);
  return actionUpdate;
};

await redeemInvitation().catch(err => console.error(err));
