---
'@agoric/synthetic-chain': patch
---

fix(synthetic-chain): restore `@agoric/smart-wallet` types for `tsc`

`commonUpgradeHelpers.ts` imports `OfferSpec` and `ExecuteOfferAction` from
`@agoric/smart-wallet`, which had been resolving transitively through the
`@agoric/inter-protocol` / `@agoric/fast-usdc` devDependencies. Those were
dropped in the recent Agoric/Endo dependency upgrade, so `@agoric/smart-wallet`
disappeared from the install tree and `yarn tsc` failed (`TS2307` for the two
type imports, plus knock-on `TS2578` unused `@ts-expect-error` directives in
`econHelpers.js`). Add `@agoric/smart-wallet` as an explicit devDependency to
restore the types.
