import test from 'ava';
import { getIncarnation } from '../../upgrade-test-scripts/lib/vat-status.js';

test(`Smart Wallet vat was upgraded`, async t => {
  const incarnation = await getIncarnation('walletFactory');

  t.is(incarnation, 2);
});
