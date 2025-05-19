# Scripts Usage

Scripts in this directory are standalone scripts generally not dependent on any code in this repo. This readme will list
some handy usage information.

## mainfork-snapshot.sh

### Running the script

> [!IMPORTANT]
> The whole process takes around 1d to complete

The script runs in async mode so you can just run and forget. The script will take care of generating the snapshot and then exit gracefully.

### Retrieving the snapshots

The resulting tar files created are stored in the `mainfork-snapshots` folder in the `agoric-snapshots-public` bucket.

### Deploying mainfork using the snapshot

> [!IMPORTANT]
> Before deploying, make sure to delete the existing namespace or the existing chain would get deployed and the snapshot won't be used.

In `instagoric/bases/shared/scripts/source.sh` set timestamp to the value from tar file in above bucket (example: `agoric_1740226862.tar.gz` where 1740226862 is the timestamp) to `MAINFORK_TIMESTAMP`. And then use the deploy script.
