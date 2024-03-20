// @ts-check

// NOTE: This ava test() style is based on earlier working code.
// TODO: consider ordinary script style.

/**
 * @file mainnet-2 contract start test for KREAd
 *
 * Proposal info is fetched from a release.
 *
 * @typedef {{
 *   bundles: string[],
 *   evals: { permit: string; script: string }[],
 * }} ProposalInfo
 */

import anyTest from 'ava';
import * as cpAmbient from 'child_process'; // TODO: use execa
import * as fspAmbient from 'fs/promises';
import { tmpName as tmpNameAmbient } from 'tmp';
import * as pathAmbient from 'path';
import * as processAmbient from 'process';
import dbOpenAmbient from 'better-sqlite3';

// TODO: factor out ambient authority from these
// or at least allow caller to supply authority.
import {
  agoric,
  wellKnownIdentities,
} from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import {
  provisionSmartWallet,
  voteLatestProposalAndWait,
  waitForBlock,
} from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';

import { makeAgd } from '@agoric/synthetic-chain/src/lib/agd-lib.js';
import { dbTool } from '@agoric/synthetic-chain/src/lib/vat-status.js';
import {
  makeFileRd,
  makeFileRW,
} from '@agoric/synthetic-chain/src/lib/webAsset.js';
import {
  ensureISTForInstall,
  flags,
  getContractInfo,
  loadedBundleIds,
  testIncludes,
  txAbbr,
} from '@agoric/synthetic-chain';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

const assetInfo = {
  /** @type {Record<string, ProposalInfo>} */
  buildAssets: {
    crabbleCoreEvalInfo: {
      evals: [
        { permit: 'crabble-permit.json', script: 'crabbleCoreEval.js' },
        { permit: 'gov-permit.json', script: 'govStarting.js' },
      ],
      bundles: ['bundle-contract.json', 'bundle-governor.json'],
    },
  },
};

const dappAPI = {
  instance: 'crabble', // agoricNames.instance key
  vstorageNode: 'crabble',
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD. XXX mainnet was 5000 at the time
  installer: 'user1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  buildInfo: Object.values(assetInfo.buildAssets),
  initialCoins: `20000000ubld`, // enough to provision a smartWallet
  accounts: {
    mem1: {
      impersonate: 'agoric1ag5a8lhn00h4u9h2shpfpjpaq6v4kku54zk69m',
      address: 'agoric1s32tu4wtkqc5440p0uf0hk508nerfmunr65vtl',
      mnemonic:
        'rival find chest wall myself guess fat hint frozen shed cake theme harbor physical bleak tube large desk cream increase scrap virus top bulb',
    },
    mem2: {
      impersonate: 'agoric140y0mqnq7ng5vvxxwpfe67988e5vqar9whg309',
      address: 'agoric1xdu48rxgakk5us7m3wud04pf92kzjmhwllzdef',
      mnemonic:
        'orient tag produce jar expect travel consider zero flight pause rebuild rent blanket yellow siege ivory hidden loop unlock dream priority prevent horn load',
    },
    mem3: {
      impersonate: 'agoric1wqfu6hu5q2qtey9jtjapaae4df9zd492z4448k',
      address: 'agoric1hmdue96vs0p6zj42aa26x6zrqlythpxnvgsgpr',
      mnemonic:
        'seven regular giggle castle universe find secret like inquiry round write pumpkin risk exhaust dress grab host message carbon student put kind gold treat',
    },
  },
  ...dappAPI,
};

/**
 * id: 'b1-{hash}'
 * endoZipBase64Sha512: hash
 * fileName: bundleName
 */
const bundleDetail = async (src, bundleName) => {
  const file = src.join(bundleName);
  const [content, absPath] = await Promise.all([
    file.readText(),
    file.toString(),
  ]);
  const { endoZipBase64Sha512 } = JSON.parse(content);
  return {
    id: `b1-${endoZipBase64Sha512}`,
    fileName: bundleName,
    endoZipBase64Sha512,
    absPath,
  };
};

/**
 * Provide access to the outside world via t.context.
 * @param {Object} io
 */
const makeTestContext = async (io = {}) => {
  const {
    process: { env, cwd } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = makeFileRd(`${cwd()}/assets`, { fsp, path });
  const tmpNameP = prefix =>
    new Promise((resolve, reject) =>
      tmpName({ prefix }, (err, x) => (err ? reject(err) : resolve(x))),
    );

  const config = {
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  // This agd API is based on experience "productizing"
  // the inter bid CLI in #7939
  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, env.HOME);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  /* @param {string} baseName */
  const mkTempRW = async baseName =>
    makeFileRW(await tmpNameP(baseName), { fsp, path });
  return { agd, agoric, swingstore, config, mkTempRW, src };
};

test.before(async t => (t.context = await makeTestContext()));

// test('initial', async t => {
//   const { src } = t.context;
//   const assetFaucet = src.join('bundle-assetsFaucet.json');
//   const stat = assetFaucet.stat();
//   const path = assetFaucet.toString();
//   console.log({
//     stat,
//     path,
//   });
//   t.pass();
// });

test.serial(`pre-flight: not in agoricNames.instance`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  console.log({ config, agoric });
  const { instance } = await wellKnownIdentities({ agoric });
  testIncludes(t, target, Object.keys(instance), 'instance keys', false);
});

test.serial('bundles not yet installed', async t => {
  const { swingstore, src } = t.context;
  const loaded = loadedBundleIds(swingstore);
  const info = staticConfig.buildInfo;
  for await (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for await (const bundle of bundles) {
      const detail = await bundleDetail(src, bundle);
      console.log({ detail });
      const { id } = detail;
      testIncludes(t, id, loaded, 'loaded bundles', false);
    }
  }
});

/** @param {number[]} xs */
const sum = xs => xs.reduce((a, b) => a + b, 0);

const getFileSize = async (src, fileName) => {
  const file = src.join(fileName);
  const { size } = await file.stat();
  return size;
};

/** @param {import('./lib/webAsset.js').FileRd} src */
const readBundleSizes = async src => {
  const info = staticConfig.buildInfo;
  const bundleSizes = await Promise.all(
    info
      .map(({ bundles }) =>
        bundles.map(bundleName => getFileSize(src, bundleName)),
      )
      .flat(),
  );
  const totalSize = sum(bundleSizes);
  return { bundleSizes, totalSize };
};

const minute = 60 / 1; // block time is ~1sec

/**
 * @param {() => Promise<boolean>} check
 */
const poll = async (check, maxTries) => {
  for (let tries = 0; tries < maxTries; tries += 1) {
    const ok = await check();
    if (ok) return;
    await waitForBlock();
  }
  throw Error(`tried ${maxTries} times without success`);
};

test.serial('ensure enough IST to install bundles', async t => {
  const { agd, config, src } = t.context;
  const { totalSize, bundleSizes } = await readBundleSizes(src);
  console.log({ totalSize, bundleSizes });
  await ensureISTForInstall(agd, config, totalSize, {
    log: t.log,
  });
  t.pass();
});

test.serial('ensure bundles installed', async t => {
  const { agd, swingstore, agoric, config, io, src } = t.context;
  const { chainId } = config;
  const loaded = loadedBundleIds(swingstore);
  const from = agd.lookup(config.installer);

  let todo = 0;
  let done = 0;
  for await (const { bundles } of staticConfig.buildInfo) {
    todo += bundles.length;
    for await (const bundle of bundles) {
      const { id, endoZipBase64Sha512, absPath } = await bundleDetail(
        src,
        bundle,
      );
      if (loaded.includes(id)) {
        t.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const result = await agd.tx(
        ['swingset', 'install-bundle', `@${absPath}`, '--gas', 'auto'],
        { from, chainId, yes: true },
      );
      t.log(txAbbr(result));
      t.is(result.code, 0);

      const info = await getContractInfo('bundles', { agoric, prefix: '' });
      t.log(info);
      done += 1;
      t.deepEqual(info, {
        endoZipBase64Sha512,
        error: null,
        installed: true,
      });
    }
  }
  t.is(todo, done);
});

test.serial('core eval prereqs: provision royalty, gov, ...', async t => {
  const { agd, config } = t.context;
  const { entries } = Object;

  console.log('Adding keys, expect errors...');
  for (const [name, { address, mnemonic }] of entries(config.accounts)) {
    try {
      agd.lookup(address);
      t.log(name, 'key already added');
      continue;
    } catch (_e) {}
    t.log('add key', name);
    agd.keys.add(name, mnemonic);
  }

  console.log('Checking wallet state in vstorage');
  for (const [name, { address }] of entries(config.accounts)) {
    const walletPath = `published.wallet.${address}`;
    const data = await agd.query(['vstorage', 'data', walletPath]);
    if (data.value.length > 0) {
      t.log(name, 'wallet already provisioned');
      continue;
    }
    await provisionSmartWallet(address, config.initialCoins);
  }

  t.pass();
});

/**
 * @param {string} text
 * @param {string} fileName
 */
const acctSub = (text, fileName) => {
  let out = text;
  for (const [name, detail] of Object.entries(staticConfig.accounts)) {
    if (out.includes(detail.impersonate)) {
      console.log('impersonating', name, 'in', fileName);
      out = out.replace(detail.impersonate, detail.address);
    }
  }
  return out;
};

test.serial('core eval proposal passes', async t => {
  const { agd, swingstore, config, mkTempRW, src } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, instance } = config;
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = await bundleDetail(src, bundle);
      testIncludes(t, id, loaded, 'loaded bundles');
    }
  }

  /** @param {string} script */
  const withKnownKeys = async script => {
    const file = src.join(script);
    const text = await file.readText();
    const text2 = acctSub(text, script);
    const out = await mkTempRW(script);
    await out.writeText(text2);
    return out.toString();
  };

  const evalNames = buildInfo
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = await Promise.all(evalNames.map(withKnownKeys));
  t.log(evalPaths);
  console.log('await tx', evalPaths);
  const result = await agd.tx(
    [
      'gov',
      'submit-proposal',
      'swingset-core-eval',
      ...evalPaths,
      ...flags({ ...info, deposit }),
      ...flags({ gas: 'auto', 'gas-adjustment': '1.2' }),
    ],
    { from, chainId, yes: true },
  );
  console.log('RESULT', { result });
  t.log(txAbbr(result));
  t.is(result.code, 0);

  console.log('await voteLatestProposalAndWait', evalPaths);
  const detail = await voteLatestProposalAndWait();
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);

  // XXX https://github.com/Agoric/agoric-3-proposals/issues/91
  await waitForBlock(15);

  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
});

test.serial('vstorage published.CHILD is present', async t => {
  const { agd, config } = t.context;
  const { vstorageNode } = config;
  const { children } = await agd.query(['vstorage', 'children', 'published']);
  testIncludes(t, vstorageNode, children, 'published children');
});

test.serial(`agoricNames.instance is populated`, async t => {
  const { config, agoric, agd } = t.context;
  const { instance: target } = config;

  const checkForInstance = async () => {
    const { instance } = await wellKnownIdentities({ agoric });
    const present = Object.keys(instance);
    return present.includes(target);
  };

  // contract initialization took ~10min in mainnet
  poll(checkForInstance, 15 * minute);
  t.pass();
});

// // needs 2 brand names
// test.todo(`agoricNames.brand is populated`);
// test.todo('boardAux is populated');
//
// // KREAd specific below here
// // TODO refactor this test for re-use across MN2 scripts
//
// // TODO test this more robustly with the pausing feature
// // This doesn't work with mainline KREAd becaues they don't have anything
// // to write upon contract start. The pausing test will ensure there's
// // a latestQuestion node published.
test.serial('crabble governance is present', async t => {
  const { agd } = t.context;
  const checkForGovernance = async () => {
    const { children } = await agd.query([
      'vstorage',
      'children',
      'published.crabble',
    ]);
    console.log({ children });
    return children.includes('governance');
  };
  // contract initialization took ~10min in mainnet
  poll(checkForGovernance, 15 * minute);
  t.pass();
});
//
// test.todo('test contract features- mint character');
// test.todo('test contract governance - pause');
// test.todo('test contract governance - API');
