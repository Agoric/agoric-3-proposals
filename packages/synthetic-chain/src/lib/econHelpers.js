import { executeOffer, waitForBlock } from './commonUpgradeHelpers.js';
import { ATOM_DENOM, CHAINID, VALIDATORADDR } from './constants.js';
import { agd, agops, executeCommand, agopsLocation } from './cliHelper.js';
import { GOV1ADDR, GOV2ADDR, GOV3ADDR } from './constants.js';
import { queryVstorage, getQuoteBody } from './vstorage.js';

const ORACLE_ADDRESSES = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

// TODO return the id of the new vault so subsequent commands can use it
export const openVault = (address, mint, collateral) => {
  return executeOffer(
    address,
    agops.vaults('open', '--wantMinted', mint, '--giveCollateral', collateral),
  );
};

export const adjustVault = (address, vaultId, vaultParams) => {
  let params = [
    'adjust',
    '--vaultId',
    vaultId,
    '--from',
    address,
    ' --keyring-backend=test',
  ];

  if ('wantCollateral' in vaultParams) {
    params = [...params, '--wantCollateral', vaultParams.wantCollateral];
  }

  if ('wantMinted' in vaultParams) {
    params = [...params, '--wantMinted', vaultParams.wantMinted];
  }

  if ('giveCollateral' in vaultParams) {
    params = [...params, '--giveCollateral', vaultParams.giveCollateral];
  }

  if ('giveMinted' in vaultParams) {
    params = [...params, '--giveMinted', vaultParams.giveMinted];
  }

  return executeOffer(address, agops.vaults(...params));
};

export const closeVault = (address, vaultId, mint) => {
  return executeOffer(
    address,
    agops.vaults(
      'close',
      '--vaultId',
      vaultId,
      '--giveMinted',
      mint,
      '--from',
      address,
      '--keyring-backend=test',
    ),
  );
};

export const mintIST = async (addr, sendValue, wantMinted, giveCollateral) => {
  await agd.tx(
    'bank',
    'send',
    'validator',
    addr,
    `${sendValue}${ATOM_DENOM}`,
    '--from',
    VALIDATORADDR,
    '--chain-id',
    CHAINID,
    '--keyring-backend',
    'test',
    '--yes',
  );
  await openVault(addr, wantMinted, giveCollateral);
};

export const getISTBalance = async (addr, denom = 'uist', unit = 1_000_000) => {
  const coins = await agd.query('bank', 'balances', addr);
  const coin = coins.balances.find(a => a.denom === denom);
  return Number(coin.amount) / unit;
};

export const getOracleInstance = async price => {
  const instanceRec = await queryVstorage(`published.agoricNames.instance`);

  const value = JSON.parse(instanceRec.value);
  const body = JSON.parse(value.values.at(-1));

  const feeds = JSON.parse(body.body.substring(1));
  const feedName = `${price}-USD price feed`;

  const key = Object.keys(feeds).find(k => feeds[k][0] === feedName);
  if (key) {
    return body.slots[key];
  }
  return null;
};

export const checkForOracle = async (t, name) => {
  const instance = await getOracleInstance(name);
  t.truthy(instance);
};

export const registerOraclesForBrand = async (brandIn, oraclesByBrand) => {
  await null;
  const promiseArray = [];

  const oraclesWithID = oraclesByBrand.get(brandIn);
  for (const oracle of oraclesWithID) {
    const { address, offerId } = oracle;
    promiseArray.push(
      executeOffer(
        address,
        agops.oracle('accept', '--offerId', offerId, `--pair ${brandIn}.USD`),
      ),
    );
  }

  return Promise.all(promiseArray);
};

/**
 * Generate a consistent map of oracleIDs for a brand that can be used to
 * register oracles or to push prices. The baseID changes each time new
 * invitations are sent/accepted, and need to be maintained as constants in
 * scripts that use the oracles. Each oracleAddress and brand needs a unique
 * offerId, so we create recoverable IDs using the brandName and oracle id,
 * mixed with the upgrade at which the invitations were accepted.
 *
 * @param {string} baseId
 * @param {string} brandName
 */
const addOraclesForBrand = (baseId, brandName) => {
  const oraclesWithID = [];
  for (let i = 0; i < ORACLE_ADDRESSES.length; i += 1) {
    const oracleAddress = ORACLE_ADDRESSES[i];
    const offerId = `${brandName}.${baseId}.${i}`;
    oraclesWithID.push({ address: oracleAddress, offerId });
  }
  return oraclesWithID;
};

export const addPreexistingOracles = async (brandIn, oraclesByBrand) => {
  await null;

  const oraclesWithID = [];
  for (let i = 0; i < ORACLE_ADDRESSES.length; i += 1) {
    const oracleAddress = ORACLE_ADDRESSES[i];

    const path = `published.wallet.${oracleAddress}.current`;
    const wallet = await getQuoteBody(path);
    const idToInvitation = wallet.offerToUsedInvitation.find(([k]) => {
      return !isNaN(k[0]);
    });
    if (idToInvitation) {
      oraclesWithID.push({
        address: oracleAddress,
        offerId: idToInvitation[0],
      });
    }
  }

  oraclesByBrand.set(brandIn, oraclesWithID);
};

/**
 * Generate a consistent map of oracleIDs and brands that can be used to
 * register oracles or to push prices. The baseID changes each time new
 * invitations are sent/accepted, and need to be maintained as constants in
 * scripts that use these records to push prices.
 *
 * @param {string} baseId
 * @param {string[]} brandNames
 */
export const generateOracleMap = (baseId, brandNames) => {
  const oraclesByBrand = new Map();
  for (const brandName of brandNames) {
    const oraclesWithID = addOraclesForBrand(baseId, brandName);
    oraclesByBrand.set(brandName, oraclesWithID);
  }
  return oraclesByBrand;
};

export const pushPrices = async (price, brandIn, oraclesByBrand, round) => {
  await waitForBlock(1);
  // rotate which oracle is first. Use the round number
  const oracles = oraclesByBrand.get(brandIn);
  for (let i = 0; i < oracles.length; i += 1) {
    const offset = (i + round) % oracles.length;
    const oracle = oraclesByBrand.get(brandIn)[offset];
    const oracleCmd = await agops.oracle(
      'pushPriceRound',
      '--price',
      price,
      '--oracleAdminAcceptOfferId',
      oracle.offerId,
      '--roundId',
      round,
    );
    await executeOffer(oracle.address, oracleCmd);
  }
};

export const getPriceQuote = async price => {
  const path = `published.priceFeed.${price}-USD_price_feed`;
  const body = await getQuoteBody(path);
  return body.amountOut.value;
};

export const agopsInter = (...params) => {
  const newParams = ['inter', ...params];
  return executeCommand(agopsLocation, newParams);
};

export const createBid = (price, addr, offerId) => {
  return agopsInter(
    'bid',
    'by-price',
    `--price ${price}`,
    `--give 1.0IST`,
    '--from',
    addr,
    '--keyring-backend test',
    `--offer-id ${offerId}`,
  );
};

export const getLiveOffers = async addr => {
  const path = `published.wallet.${addr}.current`;
  const body = await getQuoteBody(path);
  return body.liveOffers;
};

export const getAuctionCollateral = async index => {
  const path = `published.auction.book${index}`;
  const body = await getQuoteBody(path);
  return body.collateralAvailable.value;
};

export const getVaultPrices = async index => {
  const path = `published.vaultFactory.managers.manager${index}.quotes`;
  const body = await getQuoteBody(path);
  return body.quoteAmount;
};

export const getProvisionPoolMetrics = async () => {
  const path = `published.provisionPool.metrics`;
  return getQuoteBody(path);
};
