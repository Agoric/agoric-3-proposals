import assert from 'node:assert';
import { isPassed, type ProposalInfo } from './proposals.js';
import { makeAgd } from '../lib/agd-lib.js';
import { execFileSync } from 'node:child_process';
import fsp from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_ARCHIVE_NODE = 'https://main-a.rpc.agoric.net:443';

export function getArchiveNode() {
  return process.env['ARCHIVE_NODE'] || DEFAULT_ARCHIVE_NODE;
}
const agdArchive = makeAgd({ execFileSync }).withOpts({
  rpcAddrs: [getArchiveNode()],
});

type CoreEvalContent = {
  '@type': '/agoric.swingset.CoreEvalProposal';
  evals: Array<{ json_permits: string; js_code: string }>;
};

type ParameterChangeContent = {
  '@type': '/cosmos.params.v1beta1.ParameterChangeProposal';
  changes: Array<{
    subspace: string;
    key: string;
    value: string;
  }>;
};

export type QueryGovProposalResponse = {
  proposal_id: string; // number as string
  content: {
    '@type': string; // XXX same type as in proposals.ts
    title: string;
    description: string;
    // TODO import this type from agoric-sdk
    evals: Array<{ json_permits: string; js_code: string }>;
  } & (CoreEvalContent | ParameterChangeContent);
  status: string; // XXX enum
  final_tally_result: {
    // each of these is a number
    yes: string;
    abstain: string;
    no: string;
    no_with_veto: string;
    submit_time: string; // timestamp
    deposit_end_time: string; // timestamp
    total_deposit: [{ denom: 'ubld'; amount: string }];
    voting_start_time: string; // timestamp
    voting_end_time: string; // timestamp
  };
};

async function fetchProposal(
  proposal: ProposalInfo,
): Promise<QueryGovProposalResponse> {
  return agdArchive.query(['gov', 'proposal', proposal.proposalIdentifier]);
}

export async function saveProposalContents(proposal: ProposalInfo) {
  assert(isPassed(proposal), 'unpassed propoosals are not on the chain');
  const data = await fetchProposal(proposal);
  assert.equal(data.proposal_id, proposal.proposalIdentifier);
  assert.equal(data.content['@type'], proposal.type);
  assert.equal(data.status, 'PROPOSAL_STATUS_PASSED');
  switch (proposal.type) {
    case '/agoric.swingset.CoreEvalProposal':
      const { evals } = data.content;
      const submissionDir = path.join(
        'proposals',
        `${proposal.proposalIdentifier}:${proposal.proposalName}`,
        'submission',
      );
      await fsp.mkdir(submissionDir, { recursive: true });
      for (const { json_permits, js_code } of evals) {
        await fsp.writeFile(
          path.join(submissionDir, `${proposal.proposalName}.json`),
          json_permits,
        );
        await fsp.writeFile(
          path.join(submissionDir, `${proposal.proposalName}.js`),
          js_code,
        );
      }
      console.log(
        'Proposal saved to',
        submissionDir,
        '. Now find these bundles and save them there too:',
      );
      // At this point we can trust the bundles because the js_code has the hash
      // and SwingSet kernel verifies that the provided bundles match the hash in their filename.
      for (const { js_code } of evals) {
        const bundleIds = js_code.match(/b1-[a-z0-9]+/g);
        console.log(bundleIds);
      }
      break;
    case '/cosmos.params.v1beta1.ParameterChangeProposal':
      const proposerRecord: { proposal_id: string; proposer: string } =
        await agdArchive.query(['gov', 'proposer', proposal.proposalIdentifier]);
      assert.equal(proposerRecord.proposal_id, proposal.proposalIdentifier);
      const { proposer } = proposerRecord;
      console.log(proposer);
      const txHistory = await agdArchive.query([
        'txs',
        `--events=message.sender=${proposer}`,
      ]);
      console.log(txHistory);
      break;
    case 'Software Upgrade Proposal':
      console.warn('Nothing to save for Software Upgrade Proposal');
      break;
  }
}
