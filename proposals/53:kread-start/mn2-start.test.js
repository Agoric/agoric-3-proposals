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
  makeFileRW,
  makeWebCache,
  makeWebRd,
} from '@agoric/synthetic-chain/src/lib/webAsset.js';
import {
  bundleDetail,
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

/**
 * URLs of release assets, including bundle hashes agreed by BLD stakers
 *
 * TODO: get permits, scripts from blockchain?
 * TODO: verify bundle contents against hashes?
 *
 * KREAd-rc1 to Mainnet
 * voting 2023-09-28 to 2023-10-01
 * https://agoric.explorers.guru/proposal/53
 */
const assetInfo = {
  repo: {
    release: 'https://github.com/Kryha/KREAd/releases/tag/KREAd-rc1',
    url: 'https://github.com/Kryha/KREAd',
    name: 'KREAd',
  },
  /** @type {Record<string, ProposalInfo>} */
  buildAssets: {
    'kread-committee-info.json': {
      evals: [
        {
          permit: 'kread-invite-committee-permit.json',
          script: 'kread-invite-committee.js',
        },
      ],
      bundles: [
        '/Users/wietzes/.agoric/cache/b1-51085a4ad4ac3448ccf039c0b54b41bd11e9367dfbd641deda38e614a7f647d7f1c0d34e55ba354d0331b1bf54c999fca911e6a796c90c30869f7fb8887b3024.json',
        '/Users/wietzes/.agoric/cache/b1-a724453e7bfcaae1843be4532e18c1236c3d6d33bf6c44011f2966e155bc7149b904573014e583fdcde2b9cf2913cb8b337fc9daf79c59a38a37c99030fcf7dc.json',
      ],
    },
    'start-kread-info.json': {
      evals: [{ permit: 'start-kread-permit.json', script: 'start-kread.js' }],
      bundles: [
        '/Users/wietzes/.agoric/cache/b1-853acd6ba3993f0f19d6c5b0a88c9a722c9b41da17cf7f98ff7705e131860c4737d7faa758ca2120773632dbaf949e4bcce2a2cbf2db224fa09cd165678f64ac.json',
        '/Users/wietzes/.agoric/cache/b1-0c3363b8737677076e141a84b84c8499012f6ba79c0871fc906c8be1bb6d11312a7d14d5a3356828a1de6baa4bee818a37b7cb1ca2064f6eecbabc0a40d28136.json',
      ],
    },
  },
};

const dappAPI = {
  instance: 'kread', // agoricNames.instance key
  vstorageNode: 'kread',
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD. XXX mainnet was 5000 at the time
  installer: 'user1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  releaseAssets: assetInfo.repo.release.replace('/tag/', '/download/') + '/',
  buildInfo: Object.values(assetInfo.buildAssets),
  initialCoins: `20000000ubld`, // enough to provision a smartWallet
  accounts: {
    krgov1: {
      impersonate: 'agoric1hlm7w6pyyqnwz35jdknly8mp0ehvyrl04xjez7',
      address: 'agoric1890064p6j3xhzzdf8daknd6kpvhw766ds8flgw',
      mnemonic:
        'loop clump life tattoo action wish loop garbage room custom tooth lunar increase major draw wage bind vanish order behind bounce unknown cry practice',
    },
    krgov2: {
      impersonate: 'agoric19rtq0t8rm5ej5eyumgl0qwepzr7t4x50whx9ae',
      address: 'agoric1vqm5x5sj4lxmj2kem7x92tuhaum0k2yzyj6mgu',
      mnemonic:
        'expect wheel safe ankle caution vote reduce sell night pencil suit scrap tumble divorce element become result front hurt begin deputy liberty develop next',
    },
    kRoyalties: {
      // Note: same as the krgov2 account
      impersonate: 'agoric19rtq0t8rm5ej5eyumgl0qwepzr7t4x50whx9ae',
      address: 'agoric1vqm5x5sj4lxmj2kem7x92tuhaum0k2yzyj6mgu',
      mnemonic:
        'expect wheel safe ankle caution vote reduce sell night pencil suit scrap tumble divorce element become result front hurt begin deputy liberty develop next',
    },
    kPlatform: {
      impersonate: 'agoric1plt4252p5yu4x0nndfnkumh0gws7pdeksqq33e',
      address: 'agoric1enwuyn2hzyyvt39x87tk9rhlkpqtyv9haj7mgs',
      mnemonic:
        'magic enrich village office myth depth upper pair april dad visit memory resemble castle lab surface globe debate chair upper army pony moon tone',
    },
  },
  ...dappAPI,
};

/**
 * Provide access to the outside world via t.context.
 */
const makeTestContext = async (io = {}) => {
  const {
    process: { env } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = makeWebRd(staticConfig.releaseAssets, { fetch });
  const tmpNameP = prefix =>
    new Promise((resolve, reject) =>
      tmpName({ prefix }, (err, x) => (err ? reject(err) : resolve(x))),
    );
  const td = await tmpNameP('assets');
  const dest = makeFileRW(td, { fsp, path });
  // FIXME Error: `t.teardown()` is not allowed in hooks
  // t.teardown(() => assets.remove());
  const assets = makeWebCache(src, dest);
  console.log(`bundleAssets: ${assets}`);

  const config = {
    assets,
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
  return { agd, agoric, swingstore, config, mkTempRW };
};

test.before(async t => (t.context = await makeTestContext()));

test.serial(`pre-flight: not in agoricNames.instance`, async t => {
  const { config, agoric } = t.context;
  const { instance: target } = config;
  const { instance } = await wellKnownIdentities({ agoric });
  testIncludes(t, target, Object.keys(instance), 'instance keys', false);
});

test.serial('bundles not yet installed', async t => {
  const { swingstore, config } = t.context;
  const loaded = loadedBundleIds(swingstore);
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    t.log(evals[0].script, evals.length, 'eval', bundles.length, 'bundles');
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles', false);
    }
  }
});

/** @param {number[]} xs */
const sum = xs => xs.reduce((a, b) => a + b, 0);

/** @param {import('@agoric/synthetic-chain/src/lib/webAsset.js').WebCache} assets */
const readBundleSizes = async assets => {
  const info = staticConfig.buildInfo;
  const bundleSizes = await Promise.all(
    info
      .map(({ bundles }) =>
        bundles.map(b => assets.size(bundleDetail(b).fileName)),
      )
      .flat(),
  );
  const totalSize = sum(bundleSizes);
  return { bundleSizes, totalSize };
};

test.serial('ensure enough IST to install bundles', async t => {
  const { agd, config } = t.context;
  const { totalSize } = await readBundleSizes(config.assets);

  await ensureISTForInstall(agd, config, totalSize, {
    log: t.log,
  });
  t.pass();
});

test.serial('ensure bundles installed', async t => {
  const { agd, swingstore, agoric, config, io } = t.context;
  const { chainId, assets } = config;
  const loaded = loadedBundleIds(swingstore);
  const from = agd.lookup(config.installer);

  let todo = 0;
  let done = 0;
  for (const { bundles } of staticConfig.buildInfo) {
    todo += bundles.length;
    for (const bundle of bundles) {
      const { id, fileName, endoZipBase64Sha512 } = bundleDetail(bundle);
      if (loaded.includes(id)) {
        t.log('bundle already installed', id);
        done += 1;
        continue;
      }

      const bundleRd = await assets.storedPath(fileName);
      const result = await agd.tx(
        ['swingset', 'install-bundle', `@${bundleRd}`, '--gas', 'auto'],
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

  for (const [name, { address, mnemonic }] of entries(config.accounts)) {
    try {
      agd.lookup(address);
      t.log(name, 'key already added');
      continue;
    } catch (_e) {}
    t.log('add key', name);
    agd.keys.add(name, mnemonic);
  }

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
  const { agd, swingstore, config, mkTempRW } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, assets, instance } = config;
  const info = { title: instance, description: `start ${instance}` };
  t.log('submit proposal', instance);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      testIncludes(t, id, loaded, 'loaded bundles');
    }
  }

  /** @param {string} script */
  const withKnownKeys = async script => {
    const text = await assets.getText(script);
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
  t.log(txAbbr(result));
  t.is(result.code, 0);

  console.log('await voteLatestProposalAndWait', evalPaths);
  const detail = await voteLatestProposalAndWait();
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);

  // TODO: how long is long enough? poll?
  await waitForBlock(5);

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

  const vstorageValueSize = async path => {
    const { value } = await agd.query(['vstorage', 'data', path]);
    return value.length;
  };

  const checkForInstance = async () => {
    // eye candy while we wait for the contract to start
    const progress = await vstorageValueSize(`published.kread.item`);
    console.log('kread.item size', progress);

    const { instance } = await wellKnownIdentities({ agoric });
    const present = Object.keys(instance);
    return present.includes(target);
  };

  // contract initialization took ~10min in mainnet
  const minute = 60 / 1; // block time is ~1sec
  poll(checkForInstance, 15 * minute);
  t.pass();
});

// needs 2 brand names
test.todo(`agoricNames.brand is populated`);
test.todo('boardAux is populated');

// KREAd specific below here
// TODO refactor this test for re-use across MN2 scripts

// TODO test this more robustly with the pausing feature
// This doesn't work with mainline KREAd becaues they don't have anything
// to write upon contract start. The pausing test will ensure there's
// a latestQuestion node published.
test.serial('kread commmittee is present', async t => {
  const { agd, config } = t.context;
  const { vstorageNode } = config;
  const { children } = await agd.query([
    'vstorage',
    'children',
    'published.committees',
  ]);
  testIncludes(t, 'kread-gov', children, 'published children');
});

test.todo('test contract features- mint character');
test.todo('test contract governance - pause');
test.todo('test contract governance - API');
