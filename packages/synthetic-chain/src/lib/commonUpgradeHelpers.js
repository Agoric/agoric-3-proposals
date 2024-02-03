import { $ } from 'execa';
import fsp from 'node:fs/promises';
import * as path from 'node:path';
import { agd, agoric, agops } from './cliHelper.js';
import { CHAINID, HOME, VALIDATORADDR } from './constants.js';

const waitForBootstrap = async () => {
  const endpoint = 'localhost';
  while (true) {
    const { stdout: json } = await $({
      reject: false,
    })`curl -s --fail -m 15 ${`${endpoint}:26657/status`}`;

    if (json.length === 0) {
      continue;
    }

    const data = JSON.parse(json);

    if (data.jsonrpc !== '2.0') {
      continue;
    }

    const lastHeight = data.result.sync_info.latest_block_height;

    if (lastHeight !== '1') {
      return lastHeight;
    }

    await new Promise(r => setTimeout(r, 2000));
  }
};

export const waitForBlock = async (times = 1) => {
  console.log(times);
  let time = 0;
  while (time < times) {
    const block1 = await waitForBootstrap();
    while (true) {
      const block2 = await waitForBootstrap();

      if (block1 !== block2) {
        console.log('block produced');
        break;
      }

      await new Promise(r => setTimeout(r, 1000));
    }
    time += 1;
  }
};

export const provisionSmartWallet = async (address, amount) => {
  console.log(`funding ${address}`);
  await agd.tx(
    'bank',
    'send',
    'validator',
    address,
    amount,
    '-y',
    '--keyring-backend=test',
    `--chain-id="${CHAINID}"`,
  );
  await waitForBlock();

  console.log(`provisioning ${address}`);
  await agd.tx(
    'swingset',
    'provision-one',
    'my-wallet',
    address,
    'SMART_WALLET',
    '--keyring-backend=test',
    '-y',
    `--chain-id="${CHAINID}"`,
    `--from="${address}"`,
  );

  await waitForBlock(2);
  console.log(await agoric.wallet('show', `--from ${address}`));
};

export const newOfferId = async () => {
  const { stdout: date } = await $`date +${'%s%3M'}`;
  await new Promise(r => setTimeout(r, 1000));

  return date;
};

export const mkTemp = async template => {
  const { stdout: data } = await $({
    shell: true,
  })`mktemp -t ${template}`;
  return data;
};

export const calculateWalletState = async addr => {
  const result = await agoric.follow(
    '-lF',
    `:published.wallet.${addr}`,
    '-o',
    'text',
  );

  const body = JSON.parse(result).body;
  let state = body;

  if (body.includes('@qclass')) {
    state = 'old';
  } else if (body.includes('#{}')) {
    state = 'upgraded';
  } else if (body.includes('#')) {
    state = 'revived';
  }

  return state;
};

export const executeOffer = async (address, offerPromise) => {
  const offerPath = await mkTemp('agops.XXX');
  const offer = await offerPromise;
  await fsp.writeFile(offerPath, offer);

  await agops.perf(
    'satisfaction',
    '--from',
    address,
    '--executeOffer',
    offerPath,
    '--keyring-backend=test',
  );
};

export const getUser = async user => {
  return agd.keys('show', user, '-a', '--keyring-backend=test');
};

export const addUser = async user => {
  const userKeyData = await agd.keys('add', user, '--keyring-backend=test');
  await fsp.writeFile(`${HOME}/.agoric/${user}.key`, userKeyData.mnemonic);

  const userAddress = await getUser(user);
  return userAddress;
};

/**
 * @returns {Promise<{ proposal_id: string, voting_end_time: unknown, status: string }>}
 */
export const voteLatestProposalAndWait = async () => {
  await waitForBlock();
  const proposalsData = await agd.query('gov', 'proposals');
  const lastProposalId = proposalsData.proposals.at(-1).proposal_id;

  await waitForBlock();

  await agd.tx(
    'gov',
    'deposit',
    lastProposalId,
    '50000000ubld',
    '--from',
    VALIDATORADDR,
    `--chain-id=${CHAINID}`,
    '--yes',
    '--keyring-backend',
    'test',
  );

  await waitForBlock();

  await agd.tx(
    'gov',
    'vote',
    lastProposalId,
    'yes',
    '--from',
    VALIDATORADDR,
    `--chain-id=${CHAINID}`,
    '--yes',
    '--keyring-backend',
    'test',
  );

  let info = {};
  for (
    ;
    info.status !== 'PROPOSAL_STATUS_REJECTED' &&
    info.status !== 'PROPOSAL_STATUS_PASSED';
    await waitForBlock()
  ) {
    info = await agd.query('gov', 'proposal', lastProposalId);
    console.log(
      `Waiting for proposal ${lastProposalId} to pass (status=${info.status})`,
    );
  }
  return info;
};

const Fail = (template, ...args) => {
  throw Error(String.raw(template, ...args.map(val => String(val))));
};

/**
 * Parse output of `agoric run proposal-builder.js`
 *
 * @param {string} txt
 *
 * adapted from packages/boot/test/bootstrapTests/supports.js
 */
const parseProposalParts = txt => {
  const evals = [
    ...txt.matchAll(/swingset-core-eval (?<permit>\S+) (?<script>\S+)/g),
  ].map(m => {
    if (!m.groups) throw Fail`Invalid proposal output ${m[0]}`;
    const { permit, script } = m.groups;
    return { permit, script };
  });
  evals.length || Fail`No swingset-core-eval found in proposal output: ${txt}`;

  const bundles = [...txt.matchAll(/swingset install-bundle @([^\n]+)/gm)].map(
    ([, bundle]) => bundle,
  );
  bundles.length || Fail`No bundles found in proposal output: ${txt}`;

  return { evals, bundles };
};

export const proposalBuilder = async fileName => {
  const { stdout: output } = await $({ cwd: '/tmp' })`agoric run ${fileName}`;
  const { evals, bundles } = parseProposalParts(output);

  const evalsWithLocation = evals.map(e => {
    return {
      permit: path.join('/tmp', e.permit),
      script: path.join('/tmp', e.permit),
    };
  });

  return { evals: evalsWithLocation, bundles };
};

export const installBundle = async (addr, bundlePath) => {
  await agd.tx(
    'swingset',
    'install-bundle',
    `@${bundlePath}`,
    '--from',
    addr,
    '--keyring-backend=test',
    '--chain-id',
    CHAINID,
    '-bblock',
    '--yes',
  );
};

export const submitProposal = async (
  scriptPath,
  permitPath,
  title,
  description,
) => {
  await agd.tx(
    'gov',
    'submit-proposal',
    'swingset-core-eval',
    permitPath,
    scriptPath,
    `--title="${title}"`,
    `--description="${description}"`,
    '--deposit=10000000ubld',
    '--from',
    VALIDATORADDR,
    '--keyring-backend=test',
    '--chain-id',
    CHAINID,
    '-bblock',
    '--yes',
  );

  await voteLatestProposalAndWait();
};
