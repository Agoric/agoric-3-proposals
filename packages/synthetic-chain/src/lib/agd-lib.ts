import assert from 'node:assert';
import type { ExecFileSyncOptionsWithStringEncoding } from 'node:child_process';
import { CHAINID, VALIDATORADDR } from './constants.js';
import { agd } from './cliHelper.js';

const { freeze } = Object;

const agdBinary = 'agd';

export const makeAgd = ({
  execFileSync,
}: {
  execFileSync: typeof import('child_process').execFileSync;
}) => {
  const make = (
    { home, keyringBackend, rpcAddrs } = {} as {
      home?: string;
      keyringBackend?: string;
      rpcAddrs?: string[];
    },
  ) => {
    const keyringArgs = [
      ...(home ? ['--home', home] : []),
      ...(keyringBackend ? [`--keyring-backend`, keyringBackend] : []),
    ];
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = [...(rpcAddrs ? [`--node`, rpcAddrs[0]] : [])];

    const exec = (
      args: string[],
      opts?: ExecFileSyncOptionsWithStringEncoding,
    ) => execFileSync(agdBinary, args, opts).toString();

    const outJson = ['--output', 'json'];

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      query: async (
        qArgs:
          | [kind: 'gov', domain: string, ...rest: any]
          | [kind: 'tx', txhash: string]
          | [mod: 'vstorage', kind: 'data' | 'children', path: string],
      ) => {
        const out = exec(['query', ...qArgs, ...nodeArgs, ...outJson], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
    });
    const nameHub = freeze({
      /**
       * NOTE: synchronous I/O
       */
      lookup: (...path: string[]) => {
        if (!Array.isArray(path)) {
          // TODO: use COND || Fail``
          throw TypeError();
        }
        if (path.length !== 1) {
          throw Error(`path length limited to 1: ${path.length}`);
        }
        const [name] = path;
        const txt = exec(['keys', 'show', `--address`, name, ...keyringArgs]);
        return txt.trim();
      },
    });
    const rw = freeze({
      /**
       * @param {string[]} txArgs
       * @param {{ chainId: string, from: string, yes?: boolean }} opts
       */
      tx: async (
        txArgs: string[],
        {
          chainId,
          from,
          yes,
        }: { chainId: string; from: string; yes?: boolean },
      ) => {
        const yesArg = yes ? ['--yes'] : [];
        const args = [
          ...nodeArgs,
          ...[`--chain-id`, chainId],
          ...keyringArgs,
          ...[`--from`, from],
          'tx',
          ...['--broadcast-mode', 'block'],
          ...['--gas', 'auto'],
          ...['--gas-adjustment', '1.3'],
          ...txArgs,
          ...yesArg,
          ...outJson,
        ];
        const out = exec(args);
        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      ...ro,
      ...nameHub,
      readOnly: () => ro,
      nameHub: () => nameHub,
      keys: {
        add: (name: string, mnemonic: string) => {
          return execFileSync(
            agdBinary,
            [...keyringArgs, 'keys', 'add', name, '--recover'],
            { input: mnemonic },
          ).toString();
        },
      },
      withOpts: (opts: Record<string, unknown>) =>
        make({ home, keyringBackend, rpcAddrs, ...opts }),
    });
    return rw;
  };
  return make();
};

export const bankSend = (addr: string, wanted: string) => {
  const chain = ['--chain-id', CHAINID];
  const from = ['--from', VALIDATORADDR];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...from, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', VALIDATORADDR, addr, wanted, ...noise);
};
