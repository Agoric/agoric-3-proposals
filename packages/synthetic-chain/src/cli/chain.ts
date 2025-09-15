import assert from 'node:assert';

import { makeTendermint34Client } from '@agoric/client-utils';
import { CoreEvalProposal } from '@agoric/cosmic-proto/agoric/swingset/swingset.js';
import { MsgUpdateParams } from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { fromBase64 } from '@cosmjs/encoding';
import { decodeTxRaw } from '@cosmjs/proto-signing';
import { QueryClient, setupGovExtension } from '@cosmjs/stargate';
import { ProposalStatus } from 'cosmjs-types/cosmos/gov/v1beta1/gov.js';
import { makeBundleCache } from '../lib/bundles.js';
import type { DirRW, TextRd } from '../lib/webAsset.js';
import { isPassed, type ProposalInfo } from './proposals.js';

export const DEFAULT_ARCHIVE_NODE = 'https://main-a.rpc.agoric.net:443';

// TODO use cosmic-proto to query, decoding into SearchTxsResultSDKType
type TxSearchResult = {
  txs: Array<{
    tx: string;
    hash: string;
    height: string;
  }>;
  total_count: string;
};

export async function fetchMsgInstallBundleTxs(endpoint: TextRd) {
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
    const ref = `/tx_search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&order_by="desc"`;
    const data = await endpoint.join(ref).readJSON();
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

export async function saveProposalContents(
  proposal: ProposalInfo,
  proposalsDir: DirRW,
  bundleCache: ReturnType<typeof makeBundleCache>,
  { fetch }: { fetch: typeof globalThis.fetch },
) {
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
      const submissionDir = proposalsDir.join(
        `${proposal.proposalIdentifier}:${proposal.proposalName}`,
        'submission',
      );
      await submissionDir.mkdir();

      // Save original core eval files
      for (const [i, evalItem] of evals.entries()) {
        const { jsonPermits, jsCode } = evalItem;
        // Use index for unique filenames if proposalName is reused across multiple evals
        const baseFilename = `${proposal.proposalName}${evals.length > 1 ? `-${i}` : ''}`;
        await submissionDir
          .asFileRW()
          .join(`${baseFilename}-permit.json`)
          .writeText(jsonPermits);
        await submissionDir
          .asFileRW()
          .join(`${baseFilename}.js`)
          .writeText(jsCode);
      }
      console.log('Proposal eval files saved to', `${submissionDir}`);

      // Find and save referenced bundles
      const allBundleIds = new Set<string>();
      for (const { jsCode } of evals) {
        const ids = jsCode.match(/b1-[a-z0-9]+/g);
        if (ids) {
          ids.forEach(id => allBundleIds.add(id));
        }
      }

      if (allBundleIds.size > 0) {
        console.log('Found referenced bundle IDs:', Array.from(allBundleIds));
        for (const bundleId of allBundleIds) {
          await bundleCache.copyTo(bundleId, submissionDir.asFileRW(), console);
        }
      } else {
        console.log('No bundle IDs found in proposal eval code.');
      }
      break;
    case '/cosmos.staking.v1beta1.MsgUpdateParams':
      const msgUpdateParams = MsgUpdateParams.fromProtoMsg(data.content as any);
      console.log('Decoded staking param update proposal:', msgUpdateParams);
      const proposalDir = proposalsDir.join(
        `${proposal.proposalIdentifier}:${proposal.proposalName}`,
      );
      const proposalDataFile = proposalDir.asFileRW().join('proposal-data.json');
      await proposalDataFile.writeText(JSON.stringify(msgUpdateParams, null, 2));
      console.log('Staking param update proposal data saved to', `${proposalDataFile}`);
      break;
    case '/cosmos.params.v1beta1.ParameterChangeProposal':
      console.log('Nothing to save for Parameter Change Proposal');
      break;
    case 'Software Upgrade Proposal':
      console.warn('Nothing to save for Software Upgrade Proposal');
      break;
  }
}
