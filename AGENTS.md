# Repository Guidelines

This repo builds and tests synthetic reproductions of Agoric mainnet (agoric-3) proposals. It publishes Docker images that encode the chain state across proposals and verifies expected outcomes.

## Project Structure & Module Organization

- `proposals/`: One subdirectory per proposal (e.g., `91:upgrade-19`). Contains proposal scripts such as `prepare.sh`, `eval.sh`, `use.sh`, and required `test.sh` plus a `package.json` with an `agoricProposal` block.
- `packages/synthetic-chain/`: TypeScript CLI and library that orchestrate builds/tests (`src/`, compiled `dist/`, `test/`). Exposed as the `synthetic-chain` binary.
- `upgrade-test-scripts/`: Shell helpers used inside build/test containers (e.g., `env_setup.sh`, `run_test.sh`).
- `scripts/`: Repo utilities (e.g., `add-proposal.ts`, `fetch-all-bundles.ts`).
- `.changeset/`, `Dockerfile`, CI configs: Release and image build plumbing.

## Build, Test, and Development Commands

- `yarn build`: Build the CLI then build proposal images (USE stages; multi-arch).
- `yarn test`: Build test images and run per‑proposal tests (invokes `synthetic-chain test`).
- `yarn test --match <pattern>`: Run a subset (e.g., `yarn test --match upgrade`).
- `yarn test --debug --match <name>`: Debug a single proposal (e.g., `upgrade-13`).
- `yarn build-cli`: Compile `packages/synthetic-chain` only.
- `yarn doctor`: Diagnose/fix local environment issues.
- `yarn lint`: Prettier check for formatting.

Example: `docker run -p 26657:26657 -p 1317:1317 -p 9090:9090 ghcr.io/agoric/agoric-3-proposals:latest` to run the latest chain image locally.

## Adding a new proposal

- `scripts/fetch-all-bundles.ts` to ensure the local filesystem has the bundles from Mainnet
- `scripts/add-proposal.ts <MAINNET-PROPOSAL-NUMBER> <A3P-PROPOSAL-NAME>` to create the A3P proposal package

## Coding Style & Naming Conventions

- Formatting: Prettier 3.x; prefer 2‑space indentation and ESM modules. Run `yarn lint` (or `prettier --write .` locally).
- Proposal dirs: `NN:label` where `NN` is the chain proposal number; use a letter for pending (e.g., `a:my-contract`). Labels are lowercase, concise, unique.
- Proposal files: include `test.sh` (required). `package.json` must define `agoricProposal` with a valid `type` and, for upgrades, `planName`, `releaseNotes`, and `sdkImageTag`.

## Testing Guidelines

- Repository tests: `yarn test` executes each proposal’s `test.sh` inside containers via `upgrade-test-scripts`.
- Targeted runs: `yarn test --match <pattern>`; interactive debug via `--debug`.
- Package tests: `cd packages/synthetic-chain && yarn test` (Ava). Test files use `*.test.ts/js`.
- Coverage: No explicit thresholds enforced.

## Commit & Pull Request Guidelines

- Commits: Use clear prefixes (e.g., `feat:`, `fix:`, `build:`, `ci:`, `chore:`) and reference proposal directories/IDs when relevant.
- PRs: Include a concise description, linked issues, what changed, how it was tested, and any relevant logs/output. For new proposals, follow `CONTRIBUTING.md` (submit as pending, then rename to the passed number).

## Security & Configuration Tips

- Node: `.node-version` is `22.19.0`; use a version manager (nodenv/nvm). Yarn v4 is configured.
- Secrets: Do not commit private keys or credentials. Proposal artifacts should be public.
- Docker: Builds are multi‑stage; local runs may be platform‑specific—use the published image tags shown in CI/README.
