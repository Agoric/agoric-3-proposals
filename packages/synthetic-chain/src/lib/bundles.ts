import assert from 'node:assert/strict';
import { copyFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

import { agoric } from '@agoric/cosmic-proto/agoric/bundle.js';
import type { MsgInstallBundle } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import path from 'node:path';

const CACHE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  '.agoric',
  'cache',
);

export async function base64ToBlob(
  base64: string,
  type = 'application/octet-stream',
): Promise<Blob> {
  return fetch(`data:${type};base64,${base64}`).then(res => res.blob());
}

export async function decompressBlob(blob: Blob): Promise<Blob> {
  const ds = new DecompressionStream('gzip');
  const decompressedStream = blob.stream().pipeThrough(ds);
  return new Response(decompressedStream).blob();
}

export async function bundleInMessage(msg: MsgInstallBundle) {
  const { compressedBundle: b64gzip, uncompressedSize: size } = msg;
  const bundleText = Buffer.from(gunzipSync(b64gzip)).toString('utf8');
  assert.equal(bundleText.length, Number(size), 'bundle size mismatch');
  return { bundleText, size };
}

export async function writeInstalledBundle(
  basePath: string,
  msgInstall: MsgInstallBundle,
  { log } = { log: (...msgs) => {} },
) {
  const bundle = await bundleInMessage(msgInstall);
  const bundleObj = JSON.parse(bundle.bundleText);
  const filename = path.join(
    basePath,
    `b1-${bundleObj.endoZipBase64Sha512}.json`,
  );
  await writeFile(filename, bundle.bundleText, 'utf8');
  log(`Wrote bundleText to ${filename}`);
}

export async function refreshBundlesCache(
  txs: Array<{
    hash: string;
    height: string;
    msg: any;
  }>,
) {
  for (const tx of txs) {
    console.log(`\nBlock: ${tx.height}, TxHash: ${tx.hash}`);
    const msgInstall = agoric.swingset.MsgInstallBundle.fromProtoMsg(tx.msg);
    await writeInstalledBundle(CACHE_DIR, msgInstall, console);
  }
}

export async function copyFromCache(
  bundleId: string,
  targetDir: string,
  { log } = { log: (...msgs) => {} },
) {
  const bundlePath = path.join(CACHE_DIR, `${bundleId}.json`);
  const targetPath = path.join(targetDir, `${bundleId}.json`);
  await copyFile(bundlePath, targetPath);
  log(`Copied bundle from ${bundlePath} to ${targetPath}`);
}
