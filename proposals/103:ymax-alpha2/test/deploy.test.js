// @ts-check
/* eslint-env node */
import test from 'ava';

import { getDetailsMatchingVats } from '@agoric/synthetic-chain';

test('vat details', async t => {
  const ymaxVats = await getDetailsMatchingVats('ymax');
  console.log('=== YMAX VATS ===');
  console.log(ymaxVats);
  t.snapshot(ymaxVats);

  const allVats = await getDetailsMatchingVats('');
  console.log('=== ALL VATS ===');
  console.log(allVats);
  t.snapshot(allVats);
});
