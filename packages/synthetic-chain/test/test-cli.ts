import test from 'ava';
import {
  type ProposalInfo,
  type StakingParamUpdatePackage,
  compareProposalDirNames,
  imageNameForProposal,
} from '../src/cli/proposals.js';

test('compareProposalDirNames', t => {
  const inputs = [
    '1:first',
    '9:second',
    '10:third',
    '99:fourth',
    '100:fifth',
    'foo:a',
    'bar:b',
    'baz:c',
    '.dot:d',
    'Z:e',
    'qux',
    'quux',
  ].sort();
  t.deepEqual(inputs.slice().sort(compareProposalDirNames), [
    // by numeric position
    '1:first',
    '9:second',
    '10:third',
    '99:fourth',
    '100:fifth',
    // lexicographically by whatever precedes the first colon
    '.dot:d',
    'Z:e',
    'bar:b',
    'baz:c',
    'foo:a',
    // lexicographically by full name
    'quux',
    'qux',
  ]);
});

test('imageNameForProposal', t => {
  const proposal: ProposalInfo = {
    type: '/agoric.swingset.CoreEvalProposal',
    path: '1:foo',
    proposalName: 'foo',
    proposalIdentifier: 'z',
    source: 'build',
    buildScript: 'n/a',
  };
  t.deepEqual(imageNameForProposal(proposal, 'test'), {
    name: 'ghcr.io/agoric/agoric-3-proposals:test-foo',
    target: 'test-foo',
  });
});

test('StakingParamUpdatePackage type support', t => {
  const stakingProposal: StakingParamUpdatePackage = {
    type: '/cosmos.staking.v1beta1.MsgUpdateParams',
    path: '123:test-staking-update',
    proposalName: 'test-staking-update',
    proposalIdentifier: '123',
  };
  
  t.is(stakingProposal.type, '/cosmos.staking.v1beta1.MsgUpdateParams');
  t.is(stakingProposal.proposalName, 'test-staking-update');
  
  const image = imageNameForProposal(stakingProposal, 'test');
  t.deepEqual(image, {
    name: 'ghcr.io/agoric/agoric-3-proposals:test-test-staking-update',
    target: 'test-test-staking-update'
  });
});
