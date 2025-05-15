# Synthetic chain tools

Utilities to build a synthetic chain and test running proposals atop it. The chain approximates agoric-3 (Mainnet) using the state from https://github.com/Agoric/agoric-3-proposals (It could trivially support other Agoric chains, if we scale horizontally.)

## Usage

```
prepare-build   - generate Docker build configs

build           - build the synthetic-chain "use" images
  [--dry]       - print the config without building images

test            - build the "test" images and run them
                  respecting any SLOGFILE environment variable
                  https://github.com/Agoric/agoric-sdk/blob/master/docs/env.md#slogfile
  [-m <name>]   - target a particular proposal by substring match
    [--debug]   - run containers with interactive TTY and port mapping
  [--dry]       - print the config without building images

doctor          - diagnostics and quick fixes
```

## Design

[dockerfileGen.ts](./src/cli/dockerfileGen.ts) generates a Dockerfile for the multi-stage build described in the [repository README](../../README.md).

## Development

To depend on `@agoric/synthetic-chain` that isn't yet published, use `npm pack` in this package and copy the tgz into the proposal. Then use the `file:` protocol in the package.json to add it. Finally `yarn install` in the package to update local node_modules for linting. E.g.,

```json
    "dependencies": {
        "@agoric/synthetic-chain": "file:agoric-synthetic-chain-0.0.1-alpha.tgz",
```

### Debugging proposals

The build will fail if an upgrade proposal fails but a CoreEval has no
completion condition the build can wait for. Your TEST stage needs to look for
the effects you expect the CoreEval to cause. If it doesn't, try looking in the
logs around `PROPOSAL_STATUS_PASSED` to see if there were any errors. Because
Docker CLI scrolls the output in a small viewport, you may need to get the full
logs. An easy way to do this in Docker Desktop is enabling “Turn on the Builds
view” in Docker Desktop settings under “Features in development”. Then look at
the Logs tab for the build in question.
