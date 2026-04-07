---
'@agoric/synthetic-chain': patch
---

Upgrade build toolchain and dev dependencies: `typescript` to 6, `ava` to 7, `glob` to 13, and migrate the bundler from `tsup` to `tsdown` (tsup does not yet support TypeScript 6). The published package's output filenames change from `.js`/`.d.ts` to `.mjs`/`.d.mts`; consumers importing via the package name or `bin` are unaffected, but any code reaching directly into `dist/**` paths will need to update the extension.
