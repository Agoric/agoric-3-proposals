import { execFileSync } from 'node:child_process'; // TODO: use execa
import assert from 'node:assert';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import * as process from 'node:process';

import { ZipReader } from '@endo/zip';
import dbOpen from 'better-sqlite3';

import { makeAgd } from './agd-lib.js';
import { agoric } from './cliHelper.js';
import { voteLatestProposalAndWait } from './commonUpgradeHelpers.js';
import { dbTool } from './vat-status.js';
import { type WebCache } from './webAsset.js';
import {
  BundleInfo,
  bundleDetail,
  ensureISTForInstall,
  flags,
  getContractInfo,
  loadedBundleIds,
  readBundles,
  txAbbr,
} from '@agoric/synthetic-chain';
import { step } from './logging.js';

export const staticConfig = {
  deposit: '10000000ubld', // 10 BLD
  installer: 'gov1', // as in: agd keys show gov1
  proposer: 'validator',
  collateralPrice: 6, // conservatively low price. TODO: look up
  swingstorePath: '~/.agoric/data/agoric/swingstore.sqlite',
};

export type StaticConfig = typeof staticConfig;

export type CoreEvalConfig = {
  title?: string;
  description?: string;
};

/**
 * Provide access to the outside world via context.
 *
 * TODO: refactor overlap with mn2-start.test.js
 */
const makeTestContext = async (
  staticConfig: StaticConfig,
  coreEvalConfig: CoreEvalConfig,
) => {
  const config = {
    chainId: 'agoriclocal',
    ...staticConfig,
    ...coreEvalConfig,
  };

  const agd = makeAgd({ execFileSync }).withOpts({
    keyringBackend: 'test',
  });

  const dbPath = staticConfig.swingstorePath.replace(/^~/, process.env.HOME!);
  const swingstore = dbTool(dbOpen(dbPath, { readonly: true }));

  const before = new Map();
  return { agd, agoric, swingstore, config, before, fetch };
};

export const passCoreEvalProposal = async (
  bundleInfos: BundleInfo[],
  coreEvalConfig: CoreEvalConfig = {},
) => {
  // XXX vestige of Ava
  const config = {
    ...staticConfig,
  };
  const context = await makeTestContext(config, coreEvalConfig);

  console.log('Passing core evals...');
  for (const { name, bundles, evals } of bundleInfos) {
    console.log(
      name,
      evals[0].script,
      evals.length,
      'eval',
      bundles.length,
      'bundles',
    );
  }

  const bundleEntry = async (bundle: { endoZipBase64: string }) => {
    const getZipReader = async () => {
      const { endoZipBase64 } = bundle;
      const toBlob = (base64: string, type = 'application/octet-stream') =>
        fetch(`data:${type};base64,${base64}`).then(res => res.blob());
      const zipBlob = await toBlob(endoZipBase64);
      // https://github.com/endojs/endo/issues/1811#issuecomment-1751499626
      const buffer = await zipBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      return new ZipReader(bytes);
    };

    const getCompartmentMap = (zipRd: ZipReader) => {
      const { content } = zipRd.files.get('compartment-map.json');
      const td = new TextDecoder();
      const cmap = JSON.parse(td.decode(content));
      return cmap;
    };

    const zipRd = await getZipReader();
    const cmap = getCompartmentMap(zipRd);
    return cmap.entry;
  };

  await step('bundle names: compartmentMap.entry', async () => {
    for (const { bundles, dir } of bundleInfos) {
      for (const bundleRef of bundles) {
        const { fileName } = bundleDetail(bundleRef);
        const bundle = JSON.parse(
          await fsp.readFile(path.join(dir, fileName), 'utf8'),
        );
        const entry = await bundleEntry(bundle);
        console.log(entry, fileName.slice(0, 'b1-12345'.length));
        assert(entry.compartment);
        assert(entry.module);
      }
    }
  });

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

  const readBundleSizes = async () => {
    const bundleSizes = await Promise.all(
      bundleInfos.flatMap(({ bundles, dir }) =>
        bundles.map(async b => {
          const { fileName } = bundleDetail(b);
          const stat = await fsp.stat(path.join(dir, fileName));
          return stat.size;
        }),
      ),
    );
    const totalSize = sum(bundleSizes);
    return { bundleSizes, totalSize };
  };

  await step('ensure enough IST to install bundles', async () => {
    const { agd, config } = context;
    const { totalSize } = await readBundleSizes();

    await ensureISTForInstall(agd, config, totalSize, {
      log: console.log,
    });
  });

  await step('ensure bundles installed', async () => {
    const { agd, swingstore, agoric, config } = context;
    const { chainId } = config;
    const loaded = loadedBundleIds(swingstore);
    const from = agd.lookup(config.installer);

    let todo = 0;
    let done = 0;
    for (const { bundles, dir } of bundleInfos) {
      todo += bundles.length;
      for (const bundle of bundles) {
        const { id, fileName, endoZipBase64Sha512 } = bundleDetail(bundle);
        if (loaded.includes(id)) {
          console.log('bundle already installed', id);
          done += 1;
          continue;
        }

        const bundleRd = path.join(dir, fileName);
        const result = await agd.tx(
          ['swingset', 'install-bundle', `@${bundleRd}`],
          { from, chainId, yes: true },
        );
        console.log(txAbbr(result));
        assert.equal(result.code, 0);

        const info = await getContractInfo('bundles', { agoric, prefix: '' });
        console.log(info);
        done += 1;
        assert.deepEqual(info, {
          endoZipBase64Sha512,
          error: null,
          installed: true,
        });
      }
    }
    assert.equal(todo, done);
  });

  await step('core eval proposal passes', async () => {
    const { agd, swingstore, config } = context;
    const from = agd.lookup(config.proposer);
    const { chainId, deposit } = config;
    const info = {
      title: config.title || `Core Eval ${Date.now()}`,
      description: config.description || 'Core eval proposal',
    };
    console.log('submit proposal', info.title);

    // double-check that bundles are loaded
    const loaded = loadedBundleIds(swingstore);
    for (const { bundles } of bundleInfos) {
      for (const bundle of bundles) {
        const { id } = bundleDetail(bundle);
        if (!loaded.includes(id)) {
          assert.fail(`bundle ${id} not loaded`);
        }
      }
    }

    const evalPaths = bundleInfos.flatMap(({ evals, dir }) => {
      return evals
        .flatMap(e => [e.permit, e.script])
        .map(file => path.join(dir, file));
    });

    const result = await agd.tx(
      [
        'gov',
        'submit-proposal',
        'swingset-core-eval',
        ...evalPaths,
        ...flags({ ...info, deposit }),
      ],
      { from, chainId, yes: true },
    );
    console.log(txAbbr(result));
    assert.equal(result.code, 0);

    const detail = await voteLatestProposalAndWait(info.title);
    console.log(detail.proposal_id, detail.voting_end_time, detail.status);
    assert.equal(detail.status, 'PROPOSAL_STATUS_PASSED');
  });
};

export const evalBundles = async (dir: string) => {
  const bundleInfos = await readBundles(dir);

  await passCoreEvalProposal(bundleInfos, { title: `Core eval of ${dir}` });
};
