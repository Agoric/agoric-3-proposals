import assert from 'node:assert';
import fsp from 'node:fs/promises';
import path from 'node:path';

import { makeTendermint34Client } from '@agoric/client-utils';
import { CoreEvalProposal } from '@agoric/cosmic-proto/agoric/swingset/swingset.js';
import { fromBase64 } from '@cosmjs/encoding';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { QueryClient, setupGovExtension } from '@cosmjs/stargate';
import { ProposalStatus } from 'cosmjs-types/cosmos/gov/v1beta1/gov.js';
import { isPassed, type ProposalInfo } from './proposals.js';

const DEFAULT_ARCHIVE_NODE = 'https://main-a.rpc.agoric.net:443';

// TODO use cosmic-proto to query, decoding into SearchTxsResultSDKType
type TxSearchResult = {
  txs: Array<{
    tx: string;
    hash: string;
    height: string;
  }>;
  total_count: string;
};

export async function fetchMsgInstallBundleTxs() {
  const ACTION_TYPE = '/agoric.swingset.MsgInstallBundle';
  // TODO: more configurable
  let page = 1;
  const perPage = 50;
  const allMsgs: Array<{
    height: string;
    hash: string;
    msg: any;
  }> = [];

  while (true) {
    const query = `"message.action='${ACTION_TYPE}'"`;
    const url = `${DEFAULT_ARCHIVE_NODE}/tx_search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&order_by="desc"`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error(`Failed to fetch page ${page}: ${res.statusText}`);
      break;
    }

    const data = await res.json();
    const result: TxSearchResult = data.result;

    if (result.total_count === '0' || !result.txs?.length) {
      console.log('No more transactions found.');
      break;
    }

    console.log(`Page ${page}: ${result.txs.length} transactions`);
    for (const txEntry of result.txs) {
      const decoded = decodeTxRaw(fromBase64(txEntry.tx));
      for (const msg of decoded.body.messages) {
        if (msg.typeUrl === ACTION_TYPE) {
          allMsgs.push({
            height: txEntry.height,
            hash: txEntry.hash,
            msg,
          });
        }
      }
    }

    if (result.txs.length < perPage) break;
    page++;
  }

  return allMsgs;
}

export async function saveProposalContents(proposal: ProposalInfo) {
  assert(isPassed(proposal), 'unpassed propoosals are not on the chain');

  const tm = await makeTendermint34Client(DEFAULT_ARCHIVE_NODE, { fetch });
  const queryClient = QueryClient.withExtensions(tm, setupGovExtension);

  const { proposal: data } = await queryClient.gov.proposal(
    proposal.proposalIdentifier,
  );
  console.log('Proposal data:', data);
  assert.equal(data.proposalId, proposal.proposalIdentifier);
  assert.equal(data.content?.typeUrl, proposal.type);
  assert.equal(data.status, ProposalStatus.PROPOSAL_STATUS_PASSED);
  switch (proposal.type) {
    case '/agoric.swingset.CoreEvalProposal':
      const something = CoreEvalProposal.fromProtoMsg(data.content as any);
      console.log('Decoded proposal:', something);
      const { evals } = something;
      const submissionDir = path.join(
        'proposals',
        `${proposal.proposalIdentifier}:${proposal.proposalName}`,
        'submission',
      );
      await fsp.mkdir(submissionDir, { recursive: true });
      for (const { jsonPermits, jsCode } of evals) {
        await fsp.writeFile(
          path.join(submissionDir, `${proposal.proposalName}.json`),
          jsonPermits,
        );
        await fsp.writeFile(
          path.join(submissionDir, `${proposal.proposalName}.js`),
          jsCode,
        );
      }
      console.log(
        'Proposal saved to',
        submissionDir,
        '. Now find these bundles and save them there too:',
      );
      // At this point we can trust the bundles because the jsCode has the hash
      // and SwingSet kernel verifies that the provided bundles match the hash in their filename.
      for (const { jsCode } of evals) {
        const bundleIds = jsCode.match(/b1-[a-z0-9]+/g);
        console.log(bundleIds);
      }
      break;
    case '/cosmos.params.v1beta1.ParameterChangeProposal':
      console.log('Nothing to save for Parameter Change Proposal');
      break;
    case 'Software Upgrade Proposal':
      console.warn('Nothing to save for Software Upgrade Proposal');
      break;
  }
}
