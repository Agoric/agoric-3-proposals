# @agoric/synthetic-chain

## 0.6.3

### Patch Changes

- 4b40090: Improve dockerfile caching

  Avoid `--link` in COPY and exclude yarn cache

- 544a0ab: Check all proposals in make-ranges.
  Skip last proposal if already pushed.
- 7ece7b5: Support an exact match option
- b92375e: Fix match proposal behavior. Match only applies to proposals to test

## 0.6.2

### Patch Changes

- 74dd6a3: make executeOffer support an OfferSpec arg
- aad6786: bump dependencies, removing axios from transitive

## 0.6.1

### Patch Changes

- 8e7dcb1: fix handling of build config fromTag

  `fromTag` is meant to indicate an image to start from that isn't available in the local set of proposals.

## 0.6.0

### Minor Changes

- 29fac37: Cosmos SDK v0.50 `query gov proposals` support

## 0.5.8

### Patch Changes

- 972e5e1: improve output for `executeOffer`
- c88fe01: remove bankSend agd wrapper

## 0.5.7

### Patch Changes

- f48a56d: Improve output for debugging `agd` invocations
- 92efd29: bump deps to latest
