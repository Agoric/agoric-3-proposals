import test from 'ava';
import { getIncarnation } from '../../upgrade-test-scripts/lib/vat-status.js';

test(`Smart Wallet vat was upgraded`, async t => {
  // This won't work for a non-genesis vat. Find a different way to ask
  const incarantion = await getIncarnation('Wallet-factory');
  t.is(incarantion, 1);
});
