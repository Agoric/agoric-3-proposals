import { $, execaCommand } from 'execa';
import { BINARY, SDK_ROOT } from './constants.js';
import type { Options as ExecaOptions } from 'execa';

export const executeCommand = async (
  command: string,
  params: string[],
  options: Omit<
    ExecaOptions,
    'buffer' | 'encoding' | 'lines' | 'stdio' | 'stdout'
  > = {},
) => {
  const invocation = `${command} ${params.join(' ')}`;
  console.warn('# invoking:', invocation);
  const result = await execaCommand(invocation, options);
  if (!options.stderr) {
    const { stderr } = result;
    if (stderr) console.warn(stderr);
  }
  return result.stdout;
};

export const agd = {
  query: async (...params: string[]) => {
    const newParams = ['query', ...params, '-o json'];
    const data = await executeCommand(BINARY, newParams);
    return JSON.parse(data);
  },
  tx: async (...params: string[]) => {
    const newParams = [
      'tx',
      '-bblock',
      '--gas auto',
      '--gas-adjustment 1.3',
      ...params,
      '-o json',
    ];
    const data = await executeCommand(BINARY, newParams, { shell: true });
    return JSON.parse(data);
  },
  keys: async (...params: string[]) => {
    let newParams = ['keys', ...params];
    let shouldParse = true;

    if (params.includes('show')) {
      if (params.includes('-a') || params.includes('-address')) {
        shouldParse = false;
      }
    }

    if (shouldParse) {
      newParams = [...newParams, '--output json'];
    }

    const data = await executeCommand(BINARY, newParams, { input: 'Y' });
    if (!shouldParse) {
      return data;
    }

    return JSON.parse(data);
  },
  export: async (...params: string[]) => {
    const newParams = ['export', ...params];
    const data = await executeCommand(BINARY, newParams);
    return JSON.parse(data);
  },
};

export const agoric = {
  follow: async (...params: string[]) => {
    let newParams = ['follow', ...params];
    let parseJson = false;

    if (!params.includes('-o')) {
      newParams = [...newParams, '-o json'];
      parseJson = true;
    }
    const data = await executeCommand('agoric', newParams);

    if (parseJson) {
      return JSON.parse(data);
    }

    return data;
  },
  wallet: async (...params: string[]) => {
    const newParams = ['wallet', ...params];
    return executeCommand('agoric', newParams);
  },
  run: async (...params: string[]) => {
    const newParams = ['run', ...params];
    return executeCommand('agoric', newParams);
  },
};

export const agopsLocation = `${SDK_ROOT}/node_modules/.bin/agops`;

export const agops = {
  vaults: async (...params: string[]) => {
    const newParams = ['vaults', ...params];

    const result = await executeCommand(agopsLocation, newParams);

    if (params[0] === 'list') {
      if (result === '') return [];

      return result.split('\n');
    }

    return result;
  },
  ec: async (...params: string[]) => {
    const newParams = ['ec', ...params];
    return executeCommand(agopsLocation, newParams);
  },
  oracle: async (...params: string[]) => {
    const newParams = ['oracle', ...params];
    return executeCommand(agopsLocation, newParams);
  },
  perf: async (...params: string[]) => {
    const newParams = ['perf', ...params];
    return executeCommand(agopsLocation, newParams);
  },
  auctioneer: async (...params: string[]) => {
    const newParams = ['auctioneer', ...params];
    return executeCommand(agopsLocation, newParams);
  },
};

export const bundleSourceLocation = `${SDK_ROOT}/node_modules/.bin/bundle-source`;

/**
 * @returns Returns the filepath of the bundle
 */
export const bundleSource = async (filePath: string, bundleName: string) => {
  const output =
    await $`${bundleSourceLocation} --cache-json /tmp ${filePath} ${bundleName}`;
  console.log(output.stderr);
  return `/tmp/bundle-${bundleName}.json`;
};

export const wellKnownIdentities = async (io = {}) => {
  // @ts-expect-error
  const { agoric: { follow = agoric.follow } = {} } = io;
  const zip = (xs: unknown[], ys: unknown[]) => xs.map((x, i) => [x, ys[i]]);
  const fromSmallCapsEntries = (txt: string) => {
    const { body, slots } = JSON.parse(txt);
    const theEntries = zip(JSON.parse(body.slice(1)), slots).map(
      // @ts-expect-error
      ([[name, ref], boardID]) => {
        const iface = ref.replace(/^\$\d+\./, '');
        return [name, { iface, boardID }];
      },
    );
    return Object.fromEntries(theEntries);
  };

  const installation = fromSmallCapsEntries(
    await follow('-lF', ':published.agoricNames.installation', '-o', 'text'),
  );

  const instance = fromSmallCapsEntries(
    await follow('-lF', ':published.agoricNames.instance', '-o', 'text'),
  );

  const brand = fromSmallCapsEntries(
    await follow('-lF', ':published.agoricNames.brand', '-o', 'text'),
  );

  return { brand, installation, instance };
};

export const smallCapsContext = () => {
  const slots = [] as string[]; // XXX global mutable state
  const smallCaps = {
    Nat: (n: number | bigint) => `+${n}`,
    // XXX mutates obj
    ref: (obj: any) => {
      if (obj.ix) return obj.ix;
      const ix = slots.length;
      slots.push(obj.boardID);
      obj.ix = `$${ix}.Alleged: ${obj.iface}`;
      return obj.ix;
    },
  };

  const toCapData = (body: unknown) => {
    const capData = { body: `#${JSON.stringify(body)}`, slots };
    return JSON.stringify(capData);
  };

  return { smallCaps, toCapData };
};
