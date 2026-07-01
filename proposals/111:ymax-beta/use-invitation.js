#!/usr/bin/env node
/** @file redeem the ymaxControl invitation, as was done on mainnet by proposal 111. */
// @ts-check
import '@endo/init/legacy.js'; // XXX axios

import {
  LOCAL_CONFIG,
  makeVstorageKit,
  retryUntilCondition,
} from '@agoric/client-utils';
import { makeActionId, sendWalletAction } from './wallet-util.js';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 */

const { fromEntries } = Object;

const vsc = makeVstorageKit({ fetch }, LOCAL_CONFIG);

/**
 * Redeem the `deliver ymaxControl` invitation that proposal 111 delivered to
 * `addr` via the postalService, saving the resulting ContractControl in the
 * wallet store under the well-known name `ymaxControl`.
 *
 * @param {string} addr
 */
const redeemInvitation = async addr => {
  const { postalService } = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );

  const id = makeActionId('deliver ymaxControl');

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id,
      invitationSpec: {
        source: 'purse',
        instance: postalService,
        description: 'deliver ymaxControl',
      },
      proposal: {},
      saveResult: { name: 'ymaxControl', overwrite: true },
    },
  };

  await sendWalletAction(vsc, addr, redeemAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${addr}`),
    update =>
      update.updated === 'offerStatus' &&
      update.status.id === id &&
      !!update.status.result,
    'redeem ymaxControl',
    { setTimeout },
  );

  console.log(actionUpdate);
  return actionUpdate;
};

if (process.argv.length < 3) {
  console.error('Usage: ./use-invitation.js <from-addr>');
  process.exitCode = 1;
} else {
  await redeemInvitation(process.argv[2]);
}
