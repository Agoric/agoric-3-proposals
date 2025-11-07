import {
  $,
  type TemplateExpression,
  type Options as ExecaOptions,
} from 'execa';
import assert from 'node:assert';
import fsp from 'node:fs/promises';
import * as path from 'node:path';
import { makeMarshal } from './unmarshal.js';
import { agd, agops, agoric } from './cliHelper.js';
import { CHAINID, VALIDATORADDR } from './constants.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { ExecuteOfferAction } from '@agoric/smart-wallet/src/smartWallet.js';

type SlotlessMarshal = {
  toCapData: (value: unknown) => { body: string; slots: string[] };
};

const noSlottingMarshaller = makeMarshal(
  undefined,
  undefined,
) as SlotlessMarshal;

/**
 * Encodes an offer for transmission over the network.
 */
export const serializeOfferAction = (
  offer: OfferSpec,
  { toCapData }: SlotlessMarshal = noSlottingMarshaller,
): string => {
  const action: ExecuteOfferAction = {
    method: 'executeOffer',
    offer,
  };
  const capData = toCapData(action);
  return JSON.stringify(capData);
};

const waitForBootstrap = async (): Promise<number> => {
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

export const waitForBlock = async (n = 1) => {
  console.log(`waitForBlock waiting for ${n} new block(s)...`);
  const h0 = await waitForBootstrap();
  let lastHeight = h0;
  for (let i = 0; i < n; i += 1) {
    while (true) {
      await new Promise(r => setTimeout(r, 1000));
      const currentHeight = await waitForBootstrap();
      if (currentHeight !== lastHeight) {
        console.log(`waitForBlock saw new height ${currentHeight}`);
        lastHeight = currentHeight;
        break;
      }
    }
  }
};

export const provisionSmartWallet = async (address: string, amount: string) => {
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

export const mkTemp = async (template: string) => {
  const { stdout: data } = await $({
    shell: true,
  })`mktemp -t ${template}`;
  return data;
};

export const calculateWalletState = async (
  addr: string,
): Promise<'old' | 'revived' | 'upgraded'> => {
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

/**
 * @throws if the smart wallet writes an error OfferStatus
 */
export const executeOffer = async (
  address: string,
  offerPromise: string | Promise<string> | OfferSpec | Promise<OfferSpec>,
  options: Omit<
    ExecaOptions,
    'buffer' | 'encoding' | 'lines' | 'stdio' | 'stdout'
  > = {},
) => {
  const offerPath = await mkTemp('agops.XXX');
  const offerVal = await offerPromise;
  const offerStr =
    typeof offerVal === 'string' ? offerVal : serializeOfferAction(offerVal);
  await fsp.writeFile(offerPath, offerStr);

  if (options.verbose) {
    console.warn(
      `# ${offerPath}:`,
      await fsp.readFile(offerPath, { encoding: 'utf8' }),
    );
  }
  const stdout = await agops.perf(
    'satisfaction',
    '--from',
    address,
    '--executeOffer',
    offerPath,
    '--keyring-backend=test',
    ...(options.verbose ? ['--verbose'] : []),
  );
  console.warn(stdout);
};

export const getUser = async (user: string): Promise<string> => {
  return agd.keys('show', user, '-a', '--keyring-backend=test');
};

/**
 *
 * @param user
 * @returns user address
 */
export const addUser = async (user: string) => {
  await agd.keys('add', user, '--keyring-backend=test');

  return getUser(user);
};

interface V047ProposalMessage {
  '@type': string;
  content: {
    title: string;
  };
}

interface V050ProposalMessage {
  type: string;
  value: {
    content: {
      type: string;
      value: {
        title: string;
      };
    };
  };
}

type Proposal = {
  content?: { title: string };
  id: string;
  messages?: Array<V047ProposalMessage | V050ProposalMessage>;
  proposal_id?: string;
  status: string;
  title?: string;
  voting_end_time: unknown;
};

export const voteLatestProposalAndWait = async (
  title?: string,
): Promise<{
  proposal_id: string;
  voting_end_time: unknown;
  status: string;
}> => {
  const getProposal = async (proposalId: Proposal['id']) => {
    const proposal = await agd.query<Proposal | { proposal: Proposal }>(
      'gov',
      'proposal',
      proposalId,
    );
    assert(proposal, `Proposal ${lastProposalId} not found`);
    if ('proposal' in proposal) return proposal.proposal;
    return proposal;
  };

  await waitForBlock();
  let { proposals } = (await agd.query('gov', 'proposals')) as {
    proposals: Array<Proposal>;
  };
  if (title) {
    proposals = proposals.filter(proposal => {
      if (proposal.title === title) {
        return true;
      }
      if (proposal.content?.title === title) {
        return true;
      }
      if (proposal.messages) {
        return proposal.messages.some(message => {
          let typeUrl: string;
          let msgTitle: string;
          if ('@type' in message) {
            typeUrl = message['@type'];
            msgTitle = message?.content?.title;
          } else {
            typeUrl = message.type;
            msgTitle = message?.value?.content?.value?.title;
          }

          typeUrl === '/cosmos.gov.v1.MsgExecLegacyContent' ||
            Fail`Unsupported proposal message type ${typeUrl}`;
          return msgTitle === title;
        });
      } else {
        Fail`Unrecognized proposal shape ${Object.keys(proposal)}`;
      }
    });
  }
  let lastProposal = proposals.at(-1);

  assert(lastProposal, `No last proposal found`);

  const lastProposalId = lastProposal.proposal_id || lastProposal.id;

  assert(lastProposalId, `Invalid proposal ${lastProposal}`);

  if (lastProposal.status === 'PROPOSAL_STATUS_DEPOSIT_PERIOD') {
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

    lastProposal = await getProposal(lastProposalId);
  }

  lastProposal.status === 'PROPOSAL_STATUS_VOTING_PERIOD' ||
    Fail`Latest proposal ${lastProposalId} not in voting period (status=${lastProposal.status})`;

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

  for (
    ;
    lastProposal.status !== 'PROPOSAL_STATUS_PASSED' &&
    lastProposal.status !== 'PROPOSAL_STATUS_REJECTED' &&
    lastProposal.status !== 'PROPOSAL_STATUS_FAILED';
    await waitForBlock()
  ) {
    lastProposal = await getProposal(lastProposalId);
    assert(lastProposal, `Proposal ${lastProposalId} not found`);
    console.log(
      `Waiting for proposal ${lastProposalId} to pass (status=${lastProposal.status})`,
    );
  }
  return { proposal_id: lastProposalId, ...lastProposal };
};

const Fail = (
  template: { raw: readonly string[] | ArrayLike<string> },
  ...args: unknown[]
) => {
  throw Error(String.raw(template, ...args.map(val => String(val))));
};

/**
 * Parse output of `agoric run proposal-builder.js`
 *
 * @param {string} txt
 *
 * adapted from packages/boot/test/bootstrapTests/supports.js
 */
const parseProposalParts = (txt: string) => {
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

export const proposalBuilder = async (fileName: TemplateExpression) => {
  const { stdout: output } = await $({ cwd: '/tmp' })`agoric run ${fileName}`;
  const { evals, bundles } = parseProposalParts(output);

  const evalsWithLocation = evals.map(e => {
    return {
      permit: path.join('/tmp', e.permit),
      script: path.join('/tmp', e.script),
    };
  });

  return { evals: evalsWithLocation, bundles };
};

export const installBundle = async (addr: string, bundlePath: string) => {
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
  scriptPath: string,
  permitPath: string,
  title: string,
  description: string,
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

  await voteLatestProposalAndWait(title);
};
