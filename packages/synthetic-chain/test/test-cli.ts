import test from 'ava';
import {
  type ProposalInfo,
  compareProposalDirNames,
  imageNameForProposal,
  type SoftwareUpgradePackage,
} from '../src/cli/proposals.js';
import { stage } from '../src/cli/dockerfileGen.js';

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

test('EXECUTE stage uses efficient copy strategy', t => {
  const upgradeProposal: SoftwareUpgradePackage = {
    type: 'Software Upgrade Proposal',
    path: '65:upgrade-13',
    proposalName: 'upgrade-13',
    proposalIdentifier: '65',
    sdkImageTag: '39',
    planName: 'agoric-upgrade-13',
    releaseNotes:
      'https://github.com/Agoric/agoric-sdk/releases/tag/agoric-upgrade-13',
  };

  const executeStage = stage.EXECUTE(upgradeProposal);

  // Verify that the stage uses selective copying instead of copying the entire .agoric directory
  t.true(
    executeStage.includes(
      'COPY --from=prepare-upgrade-13 /root/.agoric/config /root/.agoric/config',
    ),
  );
  t.true(
    executeStage.includes(
      'COPY --from=prepare-upgrade-13 /root/.agoric/data /root/.agoric/data',
    ),
  );
  t.true(
    executeStage.includes(
      'COPY --from=prepare-upgrade-13 /root/.agoric/keyring-test /root/.agoric/keyring-test',
    ),
  );

  // Verify it does NOT use the old inefficient copying method
  t.false(
    executeStage.includes(
      'COPY --from=prepare-upgrade-13 /root/.agoric /root/.agoric',
    ),
  );

  // Verify the comment explaining the optimization is present
  t.true(executeStage.includes('Efficient copy strategy'));
});

test('USE stage includes SDK image tag label', t => {
  const upgradeProposal: SoftwareUpgradePackage = {
    type: 'Software Upgrade Proposal',
    path: '65:upgrade-13',
    proposalName: 'upgrade-13',
    proposalIdentifier: '65',
    sdkImageTag: '39',
    planName: 'agoric-upgrade-13',
    releaseNotes:
      'https://github.com/Agoric/agoric-sdk/releases/tag/agoric-upgrade-13',
  };

  const useStage = stage.USE(upgradeProposal);

  // Verify that the USE stage includes the SDK image tag label
  t.true(useStage.includes('LABEL agoric.sdk-image-tag="39"'));
});

test('USE stage does not include SDK image tag for non-upgrade proposals', t => {
  const coreEvalProposal: ProposalInfo = {
    type: '/agoric.swingset.CoreEvalProposal',
    path: '92:reset-psm-mintlimit',
    proposalName: 'reset-psm-mintlimit',
    proposalIdentifier: '92',
    source: 'subdir',
  };

  const useStage = stage.USE(coreEvalProposal);

  // Verify that non-upgrade proposals do not include SDK image tag labels
  t.false(useStage.includes('LABEL agoric.sdk-image-tag'));
});
