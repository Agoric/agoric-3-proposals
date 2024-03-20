// @ts-check
import * as fspAmbient from 'fs/promises';
import * as pathAmbient from 'path';
import * as processAmbient from 'process';
import * as cpAmbient from 'child_process'; // TODO: use execa

import anyTest from 'ava';
import dbOpenAmbient from 'better-sqlite3';
import { tmpName as tmpNameAmbient } from 'tmp';
import { ZipReader } from '@endo/zip';

import {
  makeFileRW,
  makeWebCache,
  makeWebRd,
} from '@agoric/synthetic-chain/src/lib/webAsset.js';
import { makeAgd } from '@agoric/synthetic-chain/src/lib/agd-lib.js';
import { dbTool } from '@agoric/synthetic-chain/src/lib/vat-status.js';
import { voteLatestProposalAndWait } from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';
import {
  bundleDetail,
  ensureISTForInstall,
  flags,
  getContractInfo,
  loadedBundleIds,
  testIncludes,
  txAbbr,
} from '@agoric/synthetic-chain';
import {
  agoric,
  wellKnownIdentities,
} from '@agoric/synthetic-chain/src/lib/cliHelper.js';

/** @typedef {Awaited<ReturnType<typeof makeTestContext>>} TestContext */
/** @type {import('ava').TestFn<TestContext>}} */
const test = anyTest;

/**
 * URLs of assets, including bundle hashes (to be) agreed by BLD stakers
 */
const assetInfo = {
  repo: {
    release:
      'https://github.com/Agoric/agoric-sdk/releases/tag/agoric-upgrade-11wf',
    url: 'https://github.com/Agoric/agoric-sdk',
    name: 'agoric-sdk',
    description:
      'expand walletFactory (aka smart wallet) contract to support NFTs etc.',
  },
  /** @type {Record<string, import('@agoric/synthetic-chain').ProposalInfo>} */
  buildAssets: {
    'upgrade-walletFactory-proposal': {
      evals: [
        {
          permit: 'upgrade-walletFactory-permit.json',
          script: 'upgrade-walletFactory.js',
        },
      ],
      bundles: [
        // entry: upgrade-walletFactory-proposal.js
        'b1-e229e4bb6c8720016d92116e3dccaebec20a43699d5547a1c815f8710985ba897e825cbe4cd5b80c1d9d674f086bcaf3981b82a0d5546a095542c14174d5f942.json',
        // entry: src/walletFactory.js
        'b1-fa06290e58e5df0b5e8e26ebf7926176770bee5d32f42bcaa62bb77737955a8d9da2922760e644e26643b36ec3118c3c0d546f2af4faf717fdb6ae1fb36773d0.json',
      ],
    },
  },
};

const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'user1', // as in: agd keys show user1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
  releaseAssets: assetInfo.repo.release.replace('/tag/', '/download/') + '/',
  title: assetInfo.repo.name,
  description: assetInfo.repo.description,
  buildInfo: Object.values(assetInfo.buildAssets),
};

/**
 * Provide access to the outside world via t.context.
 *
 * TODO: refactor overlap with mn2-start.test.js
 *
 * @param {*} t
 * @param {object} io
 */
const makeTestContext = async (t, io = {}) => {
  const {
    process: { env } = processAmbient,
    child_process: { execFileSync } = cpAmbient,
    dbOpen = dbOpenAmbient,
    fsp = fspAmbient,
    path = pathAmbient,
    tmpName = tmpNameAmbient,
  } = io;

  const src = makeWebRd(staticConfig.releaseAssets, { fetch });

  const td = await new Promise((resolve, reject) =>
    tmpName({ prefix: 'assets' }, (err, x) => (err ? reject(err) : resolve(x))),
  );
  const dest = makeFileRW(td, { fsp, path });
  // FIXME Error: `t.teardown()` is not allowed in hooks
  //   t.teardown(() => assets.remove());
  const assets = makeWebCache(src, dest);
  // assume filenames don't overlap
  const bundleAssets = makeWebCache(src, dest);
  console.log(`bundleAssets: ${bundleAssets}`);

  const config = {
    assets,
    bundleAssets,
    chainId: 'agoriclocal',
    ...staticConfig,
  };

  const agd = makeAgd({ execFileSync: execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, env.HOME);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  const before = new Map();
  return { agd, agoric, swingstore, config, before, fetch };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('bundles not yet installed', async t => {
  // TODO: also check that scaledPrice..., fluxAgg bundles match mainnet
  // select bundleId from bundles where (bundleId like 'b1-4522b%' or bundleId like 'b1-0b217%')"
  const { swingstore } = t.context;
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

/**
 * @param {{endoZipBase64:string}} bundle
 * @param {{fetch: typeof fetch}} io - using fetch for base64 decoding is a bit of over-kill
 */
const bundleEntry = async (bundle, { fetch }) => {
  const getZipReader = async () => {
    const { endoZipBase64 } = bundle;
    const toBlob = (base64, type = 'application/octet-stream') =>
      fetch(`data:${type};base64,${base64}`).then(res => res.blob());
    const zipBlob = await toBlob(endoZipBase64);
    // https://github.com/endojs/endo/issues/1811#issuecomment-1751499626
    const buffer = await zipBlob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    return new ZipReader(bytes);
  };

  const getCompartmentMap = zipRd => {
    const { content } = zipRd.files.get('compartment-map.json');
    const td = new TextDecoder();
    const cmap = JSON.parse(td.decode(content));
    return cmap;
  };

  const zipRd = await getZipReader();
  const cmap = getCompartmentMap(zipRd);
  return cmap.entry;
};

test.serial('bundle names: compartmentMap.entry', async t => {
  const {
    config: { bundleAssets },
    fetch,
  } = t.context;
  const info = staticConfig.buildInfo;
  for (const { bundles, evals } of info) {
    for (const bundleRef of bundles) {
      const { fileName } = bundleDetail(bundleRef);
      const bundle = JSON.parse(await bundleAssets.getText(fileName));
      const entry = await bundleEntry(bundle, { fetch });
      t.log(entry, fileName.slice(0, 'b1-12345'.length));
      t.truthy(entry.compartment);
      t.truthy(entry.module);
    }
  }
});

/** @param {number[]} xs */
const sum = xs => xs.reduce((a, b) => a + b, 0);

/** @param {import('../lib/webAsset.js').WebCache} assets */
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

test.skip('core eval not permitted to add/replace installations', async t => {
  // upgrading wf should not have updated agoricNames.installation, but it did.
});

test.serial('ensure enough IST to install bundles', async t => {
  const { agd, config } = t.context;
  const { totalSize } = await readBundleSizes(config.bundleAssets);

  await ensureISTForInstall(agd, config, totalSize, {
    log: t.log,
  });
  t.pass();
});

test.serial('ensure bundles installed', async t => {
  const { agd, swingstore, agoric, config } = t.context;
  const { chainId, bundleAssets } = config;
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

      const bundleRd = await bundleAssets.storedPath(fileName);
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

test.serial('core eval proposal passes', async t => {
  const { agd, swingstore, config } = t.context;
  const from = agd.lookup(config.proposer);
  const { chainId, deposit, assets } = config;
  const info = { title: config.title, description: config.description };
  t.log('submit proposal', config.title);

  // double-check that bundles are loaded
  const loaded = loadedBundleIds(swingstore);
  const { buildInfo } = staticConfig;
  for (const { bundles } of buildInfo) {
    for (const bundle of bundles) {
      const { id } = bundleDetail(bundle);
      if (!loaded.includes(id)) {
        t.fail(`bundle ${id} not loaded`);
        return;
      }
    }
  }

  const evalNames = buildInfo
    .map(({ evals }) => evals)
    .flat()
    .map(e => [e.permit, e.script])
    .flat();
  const evalPaths = await Promise.all(evalNames.map(e => assets.storedPath(e)));
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

  const detail = await voteLatestProposalAndWait(info.title);
  t.log(detail.proposal_id, detail.voting_end_time, detail.status);
  t.is(detail.status, 'PROPOSAL_STATUS_PASSED');
});

test.skip('walletFactory installation was not changed', async t => {
  // upgrading wf should not have updated agoricNames.installation, but it did.
});
