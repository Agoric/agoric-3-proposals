import * as fsp from 'node:fs/promises';

import { Fail, NonNullish } from './assert.js';
import { Far, makeMarshal, makeTranslationTable } from './unmarshal.js';

// TODO: factor out ambient authority from these
// or at least allow caller to supply authority.
import { agoric } from './cliHelper.js';
import { getISTBalance, mintIST } from './econHelpers.js';
import { type StaticConfig } from './core-eval.js';
import path from 'node:path';

// move to unmarshal.js?
const makeBoardUnmarshal = () => {
  const synthesizeRemotable = (_slot: unknown, iface: string) =>
    Far(iface.replace(/^Alleged: /, ''), {});

  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    (slot: unknown) => Fail`unknown id: ${slot}`,
    synthesizeRemotable,
  );

  return makeMarshal(convertValToSlot, convertSlotToVal);
};

export const getContractInfo = async (path: string, io = {} as any) => {
  const m = makeBoardUnmarshal();
  const {
    agoric: { follow = agoric.follow },
    prefix = 'published.',
  } = io;
  console.log('@@TODO: prevent agoric follow hang', prefix, path);
  const txt = await follow('-lF', `:${prefix}${path}`, '-o', 'text');
  const { body, slots } = JSON.parse(txt);
  return m.fromCapData({ body, slots });
};

/**
 * @param record - e.g. { color: 'blue' }
 * @returns e.g. ['--color', 'blue']
 */
export const flags = (record: Record<string, string>): string[] => {
  return Object.entries(record)
    .map(([k, v]) => [`--${k}`, v])
    .flat();
};

export const txAbbr = (tx: any) => {
  const { txhash, code, height, gas_used } = tx;
  return { txhash, code, height, gas_used };
};

export const loadedBundleIds = (swingstore: any) => {
  const ids = swingstore`SELECT bundleID FROM bundles`.map(
    (r: { bundleID: string }) => r.bundleID,
  );
  return ids;
};

/**
 * @param cacheFn - e.g. /home/me.agoric/cache/b1-DEADBEEF.json
 */
export const bundleDetail = (cacheFn: string) => {
  const fileName = NonNullish(cacheFn.split('/').at(-1));
  const id = fileName.replace(/\.json$/, '');
  const hash = id.replace(/^b1-/, '');
  return { fileName, endoZipBase64Sha512: hash, id };
};

const importBundleCost = (bytes: number, price = 0.002) => {
  return bytes * price;
};

export type BundleInfo = {
  name: string;
  dir: string;
  bundles: string[];
  evals: { permit: string; script: string }[];
};

const mintCalc = (
  myIST: number,
  cost: number,
  opts: {
    unit?: number;
    padding?: number;
    minInitialDebt?: number;
    collateralPrice: number;
  },
) => {
  const {
    unit = 1_000_000,
    padding = 1,
    minInitialDebt = 6,
    collateralPrice,
  } = opts;
  const { round, max } = Math;
  const wantMinted = max(round(cost - myIST + padding), minInitialDebt);
  const giveCollateral = round(wantMinted / collateralPrice) + 1;
  const sendValue = round(giveCollateral * unit);
  return { wantMinted, giveCollateral, sendValue };
};

export const ensureISTForInstall = async (
  agd: ReturnType<typeof import('../lib/agd-lib.js').makeAgd>,
  config: StaticConfig,
  bytes: number,
  { log }: { log: (...args: any[]) => void },
) => {
  const cost = importBundleCost(bytes);
  log({ totalSize: bytes, cost });
  const { installer } = config;
  const addr = agd.lookup(installer);
  const istBalance = await getISTBalance(addr);

  if (istBalance > cost) {
    log('balance sufficient', { istBalance, cost });
    return;
  }
  const { sendValue, wantMinted, giveCollateral } = mintCalc(
    istBalance,
    cost,
    config,
  );
  log({ wantMinted });
  await mintIST(addr, sendValue, wantMinted, giveCollateral);
};

export const readBundles = async (dir: string) => {
  const files = await fsp.readdir(dir);
  const names = files.filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
  const bundleInfos: BundleInfo[] = [];
  for (const name of names) {
    const evals = [{ permit: `${name}-permit.json`, script: `${name}.js` }];
    const content = await fsp.readFile(path.join(dir, `${name}.js`), 'utf8');
    const bundleIds = content.matchAll(/b1-[a-z0-9]+/g);
    const bundles = Array.from(bundleIds).map(id => `${id}.json`);
    bundleInfos.push({ evals, bundles, name, dir });
  }
  return bundleInfos;
};
