// @ts-check
import '@endo/init/legacy.js'; // compat with tendermint-rpc < 0.34 which has axios
import test from 'ava';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import { executeOffer, GOV1ADDR, queryVstorage } from '@agoric/synthetic-chain';
import { Far } from '@endo/far';
import { passStyleOf } from '@endo/pass-style';

/**
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 */

const oldBoardId = 'board010155'; // from A3P proposal 100

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

test('ymax in agoricNames failed to update', async t => {
  const instancePath = 'published.agoricNames.instance';
  const instanceRaw = await queryVstorage(instancePath);
  const capData = JSON.parse(getCellValues(instanceRaw).at(-1));

  const m = boardSlottingMarshaller((slot, iface) => {
    return Far('SlotReference', {
      getDetails: () => ({ slot, iface }),
    });
  });
  const instances = Object.fromEntries(m.fromCapData(capData));
  const { ymax0 } = instances;

  t.is(passStyleOf(ymax0), 'remotable');
  const { slot, iface } = ymax0.getDetails();
  // The proposal was meant to update this, but it didn't because the CoreEval failed in Mainnet.
  // Verify that the A3P history matches Mainnet
  t.is(slot, oldBoardId);
});

test('sending offer to ymax0 contract results in vat terminated error', async t => {
  /** @type {OfferSpec} */
  const offer = {
    id: 'test-ymax-offer',
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['ymax0'],
      callPipe: [['makeOpenPortfolioInvitation']],
    },
    proposal: {},
  };

  // XXX executeOffer should take an OfferSpec
  /** @type {import('@agoric/smart-wallet/src/smartWallet').ExecuteOfferAction} */
  const body = {
    method: 'executeOffer',
    offer,
  };
  const capData = { body: `#${JSON.stringify(body)}`, slots: [] };
  const offerStr = JSON.stringify(capData);

  try {
    await executeOffer(GOV1ADDR, offerStr);
    t.fail('Expected offer to result in error, but it succeeded');
  } catch (error) {
    // The error message is the whole `agops perf satisfaction` output buffer.
    // We could instead read vstorage but this suffices.
    t.regex(error.message, /error: 'Error: vat terminated'/); // in wallet update status
    t.pass('Offer correctly resulted in an error');
  }
});
