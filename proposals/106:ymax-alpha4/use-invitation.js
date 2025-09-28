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

// On chain tx: https://www.mintscan.io/agoric/tx/7C6D98999E7E6F9FD5EDA6501DD44B020EADECB445B1F48948EA938276684BB2?height=21366076
const redeemInvitation = async () => {
  const instances = fromEntries(
    await vsc.readPublished(`agoricNames.instance`),
  );
  const { postalService } = instances;

  /** @type {BridgeAction} */
  const redeemAction = {
    method: 'executeOffer',
    offer: {
      id: 'deliver ymaxControl.2025-09-02T17:51:07.859Z',
      invitationSpec: {
        source: 'purse',
        instance: postalService,
        description: 'deliver ymaxControl',
      },
      proposal: {},
      saveResult: { name: 'ymaxControl', overwrite: true },
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

// On chain tx: https://www.mintscan.io/agoric/tx/EFE05852308A301085D6BF5235A7288E5B2688155AC04B5C2844A63B127D03A2?height=21731786
const startYmax = async () => {
  const { BLD, USDC, PoC26 } = fromEntries(
    await vsc.readPublished('agoricNames.issuer'),
  );

  const issuers = harden({ USDC, Access: PoC26, BLD, Fee: BLD });

  const evmContractAddressesStub = {
    aavePool: '0x',
    compound: '0x',
    factory: '0x',
    usdc: '0x',
  };

  // Stubs to satisfy the private args state shape checks
  const privateArgsOverrides = {
    axelarIds: {
      Arbitrum: 'arbitrum',
      Avalanche: 'Avalanche',
      Base: 'base',
      Ethereum: 'Ethereum',
      Optimism: 'optimism',
      Polygon: 'Polygon',
    },
    contracts: {
      Arbitrum: evmContractAddressesStub,
      Avalanche: evmContractAddressesStub,
      Base: evmContractAddressesStub,
      Ethereum: evmContractAddressesStub,
      Optimism: evmContractAddressesStub,
      Polygon: evmContractAddressesStub,
    },
    gmpAddresses: {
      AXELAR_GAS: 'axelar1gas',
      AXELAR_GMP: 'axelar1gmp',
    },
  };

  const bundleId =
    'b1-078729b9683de5f81afe8b14bd163f0165b8dd803f587413df8dff76b557d56e5d0d67f8f654bc920b5bb3a734d7d7644791692efbbc08c08984e37c6e0e6c88';

  /** @type {BridgeAction} */
  const invokeAction = {
    method: 'invokeEntry',
    message: {
      id: 'installAndStart.2025-09-25T05:14:45.202Z',
      targetName: 'ymaxControl',
      method: 'installAndStart',
      args: [
        {
          bundleId,
          issuers,
          privateArgsOverrides,
        },
      ],
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      update.updated === 'invocation' &&
      update.id === invokeAction.message.id &&
      !!update.result,
    'invoke ymaxControl',
    { setTimeout },
  );

  console.log(actionUpdate);
  return actionUpdate;
};

// On chain tx: https://www.mintscan.io/agoric/tx/30C62047E6C8C7FF02F354E959665DD426A388C78A2702F29EF1D475DFD5A0DF?height=21744068
const saveCreatorFacet = async () => {
  /** @type {BridgeAction} */
  const invokeAction = {
    method: 'invokeEntry',
    message: {
      id: 'getCreatorFacet.2025-09-25T14:53:15.820Z',
      targetName: 'ymaxControl',
      method: 'getCreatorFacet',
      args: [],
      saveResult: { name: 'creatorFacet', overwrite: true },
    },
  };

  await sendWalletAction(vsc, ymaxControlAddr, invokeAction);

  const actionUpdate = await retryUntilCondition(
    () => vsc.readPublished(`wallet.${ymaxControlAddr}`),
    update =>
      update.updated === 'invocation' &&
      update.id === invokeAction.message.id &&
      !!update.result,
    'invoke ymaxControl',
    { setTimeout },
  );

  console.log(actionUpdate);
  return actionUpdate;
};

try {
  // No termination as previous start failed in alpha3
  await redeemInvitation();
  await startYmax();
  await saveCreatorFacet();
  // No deliverPlannerInvitation or deliverResolverInvitation in a3p
  // TODO pruneChainStorage
} catch (err) {
  console.error(err);
  throw err;
}
