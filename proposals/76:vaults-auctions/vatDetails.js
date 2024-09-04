/* eslint-env node */
import { dbTool, getInstanceBoardId, HOME } from '@agoric/synthetic-chain';
import { writeFile } from 'fs/promises';
import dbOpenAmbient from 'better-sqlite3';

const { env } = process;

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

// XXX: imports of assert and NonNullish aren't working.
export const assert = (cond, msg = 'check failed') => {
  if (!cond) {
    throw Error(msg);
  }
};
/** @type {<T>(val: T | undefined) => T} */
export const NonNullish = val => {
  if (!val) throw Error('required');
  return val;
};

export const lastAuctionInstancePathname = `${env.HOME}/.agoric/lastAuctioneerInstance.json`;

export const recordAuctioneerInstance = async () => {
  const oldAuctionInstance = await getInstanceBoardId('auctioneer');
  assert(oldAuctionInstance, 'no auction instance found');
  console.log('old auction instance ', oldAuctionInstance, env.HOME);

  await writeFile(lastAuctionInstancePathname, oldAuctionInstance);
};

// duplicated from vat-status in synthetic-chain
/**
 * @param {import('better-sqlite3').Database} db
 */
const makeSwingstore = db => {
  const sql = dbTool(db);

  /** @param {string} key */
  const kvGet = key => sql.get`select * from kvStore where key = ${key}`.value;
  /** @param {string} key */
  const kvGetJSON = key => JSON.parse(kvGet(key));

  /** @param {string} vatID */
  const lookupVat = vatID => {
    return Object.freeze({
      source: () => kvGetJSON(`${vatID}.source`),
      options: () => kvGetJSON(`${vatID}.options`),
      currentSpan: () =>
        sql.get`select * from transcriptSpans where isCurrent = 1 and vatID = ${vatID}`,
    });
  };

  return Object.freeze({
    /** @param {string} vatName */
    findVat: vatName => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      const targetVat = dynamicIDs.find(vatID =>
        lookupVat(vatID).options().name.includes(vatName),
      );
      if (!targetVat) throw Error(`vat not found: ${vatName}`);
      return targetVat;
    },
    /** @param {string} vatName */
    findVats: vatName => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      return dynamicIDs.filter(vatID =>
        lookupVat(vatID).options().name.includes(vatName),
      );
    },
    lookupVat,
  });
};

// TODO(cth) get from synthetic-chain
/** @param {string} vatName */
export const getDetailsMatchingVats = async vatName => {
  const fullPath = swingstorePath.replace(/^~/, env.HOME);

  const db = dbOpenAmbient(fullPath, { readonly: true });
  const kStore = makeSwingstore(db);

  const vatIDs = kStore.findVats(vatName);
  const infos = [];
  for (const vatID of vatIDs) {
    const vatInfo = kStore.lookupVat(vatID);
    const name = vatInfo.options().name;
    const source = vatInfo.source();
    // @ts-expect-error cast
    const { incarnation } = vatInfo.currentSpan();
    infos.push({ vatName: name, vatID, incarnation, ...source });
  }

  return infos;
};
