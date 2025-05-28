#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';

import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_ARCHIVE_NODE,
  fetchMsgInstallBundleTxs,
} from '../packages/synthetic-chain/src/cli/chain.js';
import { makeBundleCache } from '../packages/synthetic-chain/src/lib/bundles.js';
import {
  makeFileRW,
  makeWebRd,
} from '../packages/synthetic-chain/src/lib/webAsset.js';

const noop = () => {};
const archiveNode = makeWebRd(DEFAULT_ARCHIVE_NODE, { fetch, log: noop });
const txs = await fetchMsgInstallBundleTxs(archiveNode);

console.log(`\nTotal MsgInstallBundle messages found: ${txs.length}`);

const { env } = process;
const home = makeFileRW(env.HOME || env.USERPROFILE || '.', { fsp, path });
await makeBundleCache(home.join('.agoric', 'cache')).refresh(txs);
