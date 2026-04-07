---
'@agoric/synthetic-chain': minor
---

Tweaks for `a3p-integration` of the `agoric-upgrade-23` release.

- Optional custom `exec_prepare.sh` takes priority when present, entirely replacing the default preparation step (it needs to prepare, submit, vote, and pass a Software Upgrade).
- Container RPC and service ports are now bound to the host loopback interface for local-only access. This provides cross-platform support for connections to the `agd` RPC node.
- Proposal message handling updated to ignore unsupported message types instead of erroring, avoiding failures during proposal selection.
