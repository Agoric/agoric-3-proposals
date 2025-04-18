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

/** @param {import('better-sqlite3').Database} db */
const makeSwingstoreTool = db => {
  const sql = dbTool(db);

  /** @param {string} key */
  // @ts-expect-error sqlite typedefs
  const kvGet = key => sql.get`select * from kvStore where key = ${key}`.value;
  const kvGetSafe = key => sql.get`select * from kvStore where key = ${key}`;
  /** @param {string} key */
  const kvGetJSON = key => JSON.parse(kvGet(key));

  /** @param {string} vatID */
  const lookupVat = vatID => {
    return Object.freeze({
      source: () => kvGetJSON(`${vatID}.source`),
      options: () => kvGetJSON(`${vatID}.options`),
      currentSpan: () =>
        sql.get`select * from transcriptSpans where isCurrent = 1 and vatID = ${vatID}`,
      terminated: () => {
        const t = kvGetSafe('vat.terminated');
        if (!t) {
          return false;
        }
        const terminatedIDs = kvGetJSON('vat.terminated');
        return terminatedIDs.includes(vatID);
      },
    });
  };

  return Object.freeze({
    /**
     * Return the vatID for a vat whose name includes the provided string, or an
     * error if there is no such vat. If multiple vats match, the return value
     * prefers static vats over dynamic vats but makes no other guarantees.
     *
     * @param {string} vatName
     */
    findVat: vatName => {
      /** @type {string[]} */
      const staticNames = kvGetJSON('vat.names');
      for (const staticName of staticNames) {
        if (staticName.includes(vatName)) {
          return kvGet(`vat.name.${staticName}`);
        }
      }
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      for (const vatID of dynamicIDs) {
        if (lookupVat(vatID).options().name.includes(vatName)) {
          return vatID;
        }
      }
      throw Error(`vat not found: ${vatName}`);
    },
    /**
     * Return an array of vatIDs for which the vat name includes the provided string.
     *
     * @param {string} vatName
     */
    findVats: vatName => {
      const vatIDs = [];
      /** @type {string[]} */
      const staticNames = kvGetJSON('vat.names');
      for (const staticName of staticNames) {
        if (staticName.includes(vatName)) {
          vatIDs.push(kvGet(`vat.name.${staticName}`));
        }
      }
      /** @type {string[]} */
      const dynamicIDs = kvGetJSON('vat.dynamicIDs');
      for (const vatID of dynamicIDs) {
        if (lookupVat(vatID).options().name.includes(vatName)) {
          vatIDs.push(vatID);
        }
      }
      return vatIDs;
    },
    lookupVat,
  });
};

/** @typedef {ReturnType<typeof makeSwingstoreTool>} SwingstoreTool */

const buildSwingstoreTool = () => {
  const fullPath = swingstorePath.replace(/^~/, NonNullish(HOME));
  return makeSwingstoreTool(dbOpenAmbient(fullPath, { readonly: true }));
};

/**
 * @param {SwingstoreTool} kStore
 * @param {string} vatID
 * @returns {{vatName: string, vatID: string, incarnation: number, terminated: boolean}}
 */
const getVatDetailsFromID = (kStore, vatID) => {
  const vatInfo = kStore.lookupVat(vatID);
  const vatName = vatInfo.options().name;
  const source = vatInfo.source();
  const { incarnation } = /** @type {{incarnation: number}} */ (
    vatInfo.currentSpan()
  );
  const terminated = vatInfo.terminated();
  return { vatName, vatID, incarnation, ...source, terminated };
};

/** @param {string} vatName */
export const getVatDetails = async vatName => {
  const kStore = buildSwingstoreTool();
  const vatID = kStore.findVat(vatName);
  return getVatDetailsFromID(kStore, vatID);
};

/**
 * @param {string} vatName
 * @returns {Promise<number>}
 */
export const getIncarnation = async vatName => {
  const details = await getVatDetails(vatName);

  // misc info to stderr
  console.error(JSON.stringify(details));

  return details.incarnation;
};

/** @param {string} vatSubstring substring to search for within the vat name. */
export const getDetailsMatchingVats = async vatSubstring => {
  const kStore = buildSwingstoreTool();
  const vatIDs = kStore.findVats(vatSubstring);
  const infos = [];
  for (const vatID of vatIDs) {
    infos.push(getVatDetailsFromID(kStore, vatID));
  }

  return infos;
};
