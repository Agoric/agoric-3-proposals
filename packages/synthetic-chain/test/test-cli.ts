import test from 'ava';
import {
  type ProposalInfo,
  imageNameForProposal,
} from '../src/cli/proposals.js';

test('imageNameForProposal', t => {
  const proposal: ProposalInfo = {
    type: '/agoric.swingset.CoreEvalProposal',
    path: '1:foo',
    proposalName: 'foo',
    proposalIdentifier: 'z',
    source: 'build',
    buildScript: 'n/a',
  };
  t.deepEqual(imageNameForProposal(proposal, 'test', 'example.net/org/repo:'), {
    name: 'example.net/org/repo:test-foo',
    target: 'test-foo',
  });
});
