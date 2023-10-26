# agoric-3-proposals

Proposals run or planned for Mainnet (agoric-3)

This will build all previous upgrade proposals and upgrade each one.

## Upgrades

| number | description    | notes                                                                      |
| ------ | -------------- | -------------------------------------------------------------------------- |
| 8      | PismoA         | Runs with Pismo release agoric-sdk (including CLI)                         |
| 8.1    | PismoB         |
| 9      | PismoC         |
| 10     | --> Vaults     | Runs with latest SDK. Tests backwards compatibility with Pismo vstorage.   |
| 11     | Vaults --> V+1 | Anticipated upgrade. Tests that Vaults release _can be_ upgraded in place. |

## Testing

**To build the images to latest**

```shell
make build
```

Each stage specifies the SDK version in service when it was deployed.

The last stage hasn't been deployed so it uses the lastest image tagged `dev` in our [container repository](https://github.com/agoric/agoric-sdk/pkgs/container/agoric-sdk).

This repo doesn't yet support specifying an SDK version to test against.

**To run the latest upgrade interactively**

```shell
make run
```

This will start a container with the output of chain start.

To get a shell: `make shell`

  For more info: https://phase2.github.io/devtools/common-tasks/ssh-into-a-container/

The container and chain will halt once you detach from the session.

### Troubleshooting
If you get an error about port 26656 already in use, you have a local chain running on your OS.

**To build and run a specific upgrade**

```shell
TARGET=agoric-upgrade-10 make build run
```

This will put you in `/usr/src/agoric-sdk`. You'll run commands from here. `upgrade-test-scripts` is copied here with only the test scripts for the current image.


If you lose the connection and want to get back,
```sh
# find the container id
docker ps
# reattach using the auto-generated goofy name
docker attach sweet_edison
```

**To pass specific `software-upgrade --upgrade-info`**

```shell
json='{"some":"json","here":123}'
make build BUILD_OPTS="--build-arg UPGRADE_INFO_11='$json'"
```

Search this directory for `UPGRADE_INFO` if you want to see how it is plumbed
through.

**To test CLI**

You can point your local CLI tools to the chain running in Docker. Our Docker config binds on the same port (26656) as running a local chain. So you can use the agoric-cli commands on the Docker chain the same way. But note that the Cosmos account keys will be different from in your dev keyring.

If when reattaching you get a log tail, you need to start a new TTY (with the container name).
```sh
docker exec -it sweet_edison bash
```

or just use this helper,
```
make shell
```


**To test GUI**

To make the wallet ui talk to your local chain, set the network config to
`https://local.agoric.net/network-config`

## To add an upgrade

1. Update the upgrade handler in app.go
2. Duplicate the last pair of UPGRADE and TEST blocks
3. Update their number from the UPGRADE / DEST block at the end
4. Make directory for tests (e.g. `agoric-upgrade-12`)
5. Make directory for ugprade (e.g. `propose-agoric-upgrade-12` with a `.keep`)
6. Update the UPGRADE/DEST pair to be your new upgrade (THIS_NAME matching the upgrade handler string in app.go)
7. Update the `Makefile`
  - the two targets to `Makefile` (e.g. `propose-agoric-upgrade-12` and `agoric-upgrade-12`)
  - set the default TARGET (e.g. `agoric-upgrade-12`)
  - add the DEST target to the `.phony` in `Makefile`
7. Test with `make build run`


## Development

You can iterate on a particular upgrade by targeting. When you exit and run again, it will be a fresh state.

You can send information from one run to the next using `/envs`. A release N can append ENV variable setting shell commands to `"$HOME/.agoric/envs"`. The N+1 release will then have them in its environment. (Because `env_setup.sh` starts with `source "$HOME/.agoric/envs"`)

### IDE

Some IDEs support connecting to a running container. For VS Code you can use [Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers) to connect to a run above. Then you can edit the filesystem using the IDE. Once the workspace opens, you have to add a folder. E.g. `/usr/src/agoric-sdk/packages/agoric-cli/` for tweaking agoric-cli (without a rebuild of SDK).
Note that whatever changes you make within the running container will be lost when you terminate it. Use this just for iterating and be sure to copy any changes you want back to your real workspace.

# TODO
- [X] make the Docker test environment log verbosely (agd start is just printing "block N" begin, commit)
- [ ] alternately, mount the local agoric-sdk in the container
- [ ] provide a utility to import the Docker's GOV123 keys into a local keyring

