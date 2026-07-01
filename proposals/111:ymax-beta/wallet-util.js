// @ts-check
import { agoric, mkTemp } from '@agoric/synthetic-chain';
import { writeFile } from 'node:fs/promises';

/**
 * @import {BridgeAction} from '@agoric/smart-wallet/src/smartWallet';
 * @import {VstorageKit} from '@agoric/client-utils';
 */

// Smart-wallet addresses that hold the ymax ContractControl delivered by
// proposal 111. See ../use.sh for how each is set up in the synthetic chain.
// - ymax0Control receives a fresh control over the existing ymax0 (alpha) instance.
// - ymax1Control accepts control of ymax1.
export const ymax0ControlAddr = 'agoric15u29seyj3c9rdwg7gwkc97uttrk6j9fl4jkuyh';
export const ymax1ControlAddr = 'agoric1c0eq3m8sze9cj8lxr7h66fu3jgqtevqxv8svcm';

/**
 * @param {VstorageKit} vsc
 * @param {string} addr
 * @param {BridgeAction} action
 */
export const sendWalletAction = async (vsc, addr, action) => {
  const capData = vsc.marshaller.toCapData(harden(action));
  const f1 = await mkTemp('offer-send-XXX');
  await writeFile(f1, JSON.stringify(capData), 'utf-8');
  return agoric.wallet(
    'send',
    '--from',
    addr,
    '--keyring-backend=test',
    '--offer',
    f1,
  );
};

/** @param {string} name */
export const makeActionId = name => `${name}-${Date.now()}`;
