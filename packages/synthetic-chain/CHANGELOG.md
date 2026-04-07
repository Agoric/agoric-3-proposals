# @agoric/synthetic-chain

## 0.7.0

### Minor Changes

- 5aa0415: Tweaks for `a3p-integration` of the `agoric-upgrade-23` release.
  - Optional custom `exec_prepare.sh` takes priority when present, entirely replacing the default preparation step (it needs to prepare, submit, vote, and pass a Software Upgrade).
  - Container RPC and service ports are now bound to the host loopback interface for local-only access. This provides cross-platform support for connections to the `agd` RPC node.
  - Proposal message handling updated to ignore unsupported message types instead of erroring, avoiding failures during proposal selection.

### Patch Changes

- dcf5161: Improve CLI validation
- 3493a30: Update `@agoric/synthetic-chain` dependencies to newer patch/minor releases, including `ts-blank-space`, `better-sqlite3`, `chalk`, `execa`, `tsup`, and `typescript`.

## 0.6.5

### Patch Changes

- 4e23259: fix loading in normal env (not hardened by @endo/init)

## 0.6.4

### Patch Changes

- 4790777: add getVatInfoFromID and vatParameters support to vat-status tools
- eca190e: build latest from the multi-stage build target
- 2c95326: Do not remove test image when --dry

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
