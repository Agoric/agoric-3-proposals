#!/usr/bin/env -S node --import ts-blank-space/register
import '@endo/init/legacy.js';

import { fetchMsgInstallBundleTxs } from '../packages/synthetic-chain/src/cli/chain.js';
import { refreshBundlesCache } from '../packages/synthetic-chain/src/lib/bundles.js';

const txs = await fetchMsgInstallBundleTxs();

console.log(`\nTotal MsgInstallBundle messages found: ${txs.length}`);

await refreshBundlesCache(txs);
