import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';

import { agoric } from '@agoric/cosmic-proto/agoric/bundle.js';
import type { MsgInstallBundle } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import type { FileRW } from './webAsset.js';

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
  basePath: FileRW,
  msgInstall: MsgInstallBundle,
  { log } = { log: (...msgs) => {} },
) {
  const bundle = await bundleInMessage(msgInstall);
  const bundleObj = JSON.parse(bundle.bundleText);
  const file = basePath.join(`b1-${bundleObj.endoZipBase64Sha512}.json`);
  await file.writeText(bundle.bundleText);
  log(`Wrote bundleText to ${file}`);
}

const { freeze } = Object;

export const makeBundleCache = (cacheDir: FileRW) => {
  return freeze({
    async refresh(txs: Array<{ hash: string; height: string; msg: any }>) {
      for (const tx of txs) {
        console.log(`\nBlock: ${tx.height}, TxHash: ${tx.hash}`);
        const msgInstall = agoric.swingset.MsgInstallBundle.fromProtoMsg(
          tx.msg,
        );
        await writeInstalledBundle(cacheDir, msgInstall, console);
      }
    },
    async copyTo(
      bundleId: string,
      targetDir: FileRW,
      { log } = { log: (...msgs) => {} },
    ) {
      const bundlePath = cacheDir.readOnly().join(`${bundleId}.json`);
      const targetPath = targetDir.join(`${bundleId}.json`);
      await bundlePath.readText().then(t => targetPath.writeText(t));
      log(`Copied bundle from ${bundlePath} to ${targetPath}`);
    },
  });
};
