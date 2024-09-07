import dbOpenAmbient from 'better-sqlite3';
import { HOME } from './constants.js';
import { NonNullish } from './assert.js';

/**
 * @file look up vat incarnation from kernel DB
 * @see {getIncarnation}
 */

const swingstorePath = '~/.agoric/data/agoric/swingstore.sqlite';

/**
 * SQL short-hand
 *
 * @param {import('better-sqlite3').Database} db
 */
export const dbTool = db => {
  const prepare = (strings, ...params) => {
    const dml = strings.join('?');
    return { stmt: db.prepare(dml), params };
  };
  const sql = (strings, ...args) => {
    const { stmt, params } = prepare(strings, ...args);
    return stmt.all(...params);
  };
  sql.get = (strings, ...args) => {
    const { stmt, params } = prepare(strings, ...args);
    return stmt.get(...params);
  };
  return sql;
};

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
    /** @param {string} string a string to search for within the vat name. */
    findVats: string => {
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      return dynamicIDs.filter(vatID =>
        lookupVat(vatID).options().name.includes(string),
      );
    },
    lookupVat,
  });
};

/**
 * @param {string} vatName
 */
export const getVatDetails = async vatName => {
  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  const kStore = makeSwingstore(dbOpenAmbient(fullPath, { readonly: true }));

  const vatID = kStore.findVat(vatName);
  const vatInfo = kStore.lookupVat(vatID);

  const source = vatInfo.source();
  const { incarnation } = vatInfo.currentSpan();
  return { vatName, vatID, incarnation, ...source };
};

/**
 * @param {string} vatName
 */
export const getIncarnation = async vatName => {
  const details = await getVatDetails(vatName);

  // misc info to stderr
  console.error(JSON.stringify(details));

  return details.incarnation;
};

/** @param {string} vatName */
export const getDetailsMatchingVats = async vatName => {
  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));

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
