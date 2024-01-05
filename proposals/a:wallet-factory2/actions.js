import { promises as fs } from 'fs';

import {
  agd,
  agops,
} from '../../upgrade-test-scripts/lib/cliHelper.js';
import {
  HOME,
  ATOM_DENOM,
} from '../../upgrade-test-scripts/lib/constants.js';
import {
  waitForBlock,
  executeOffer,
  getUser,
  provisionSmartWallet,
} from '../../upgrade-test-scripts/lib/commonUpgradeHelpers.js';

export const provisionWallet = async user => {
  const userKeyData = await agd.keys('add', user, '--keyring-backend=test');
  await fs.writeFile(`${HOME}/.agoric/${user}.key`, userKeyData.mnemonic);

  const userAddress = await getUser(user);

  await provisionSmartWallet(
    userAddress,
    `20000000ubld,100000000${ATOM_DENOM}`,
  );
  await waitForBlock();
};

export const pushPrice = (oracles, price = 10.0) => {
  console.log(`ACTIONS pushPrice ${price}`);
  const promiseArray = [];

  for (const oracle of oracles) {
    console.log(`Pushing Price from oracle ${oracle.address}`);

    promiseArray.push(
      executeOffer(
        oracle.address,
        agops.oracle(
          'pushPriceRound',
          '--price',
          price,
          '--oracleAdminAcceptOfferId',
          oracle.id,
        ),
      ),
    );
  }

  return Promise.all(promiseArray);
};
