// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js'; // axios compat
import test from 'ava';

import { agd } from '@agoric/synthetic-chain';

const getCellValues = ({ value }) => {
  return JSON.parse(value).values;
};

const getCapDataStructure = cell => {
  const { body, slots } = JSON.parse(cell);
  const structure = JSON.parse(body.replace(/^#/, ''));
  return { structure, slots };
};

test('ymax0 is not in vstorage yet', async t => {
  const instanceArray = await agd.query(
    'vstorage',
    'data',
    'published.agoricNames.instance',
  );
  const values = getCellValues(instanceArray);

  if (!values || !Array.isArray(values)) {
    t.fail('No values array found in instanceArray');
    return;
  }

  const instances = Object.fromEntries(
    getCapDataStructure(values.at(-1)).structure,
  );
  const instanceNames = Object.keys(instances).sort();
  t.log('\n=== INSTANCE NAMES ===');
  instanceNames.forEach((name, index) => {
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${name}`);
  });
  t.log(`\nTotal instances: ${instanceNames.length}\n`);

  t.log(`Found ${instanceNames.length} instances:`);
  t.log(instanceNames.join(', '));

  t.false(instanceNames.includes('ymax0'), 'no ymax0 instance in vstorage yet');
});

test('chain-info works', async t => {
  const chainData = await agd.query(
    'vstorage',
    'children',
    'published.agoricNames.chain',
  );
  const chainConnectionData = await agd.query(
    'vstorage',
    'children',
    'published.agoricNames.chainConnection',
  );

  const chainKeys = chainData?.children || [];
  const chainConnectionKeys = chainConnectionData?.children || [];

  t.log('\n=== CHAIN KEYS ===');
  if (Array.isArray(chainKeys) && chainKeys.length > 0) {
    chainKeys.forEach((key, index) => {
      t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
    });
    t.log(`\nTotal chain keys: ${chainKeys.length}`);
  } else {
    t.log('No chain keys found or data is not an array');
  }

  t.log('\n=== CHAIN CONNECTION KEYS ===');
  if (Array.isArray(chainConnectionKeys) && chainConnectionKeys.length > 0) {
    chainConnectionKeys.forEach((key, index) => {
      t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
    });
    t.log(`\nTotal chain connection keys: ${chainConnectionKeys.length}\n`);
  } else {
    t.log('No chain connection keys found or data is not an array\n');
  }

  t.log(`agoricNames.chain keys (${chainKeys.length}):`, chainKeys);
  t.log(
    `agoricNames.chainConnection keys (${chainConnectionKeys.length}):`,
    chainConnectionKeys,
  );

  t.truthy(chainData, 'chain should be defined');
  t.truthy(chainConnectionData, 'chainConnection should be defined');
  t.truthy(chainKeys.length > 0, 'chain keys should exist');
  t.truthy(chainConnectionKeys.length > 0, 'chainConnection keys should exist');
});

test('PoC26 brand board IDs match in agoricNames.brand and vbankAsset', async t => {
  const brandDataResponse = await agd.query(
    'vstorage',
    'data',
    'published.agoricNames.brand',
  );
  const vBankDataResponse = await agd.query(
    'vstorage',
    'data',
    'published.agoricNames.vbankAsset',
  );

  let brands = {};
  if (brandDataResponse?.value) {
    const values = getCellValues(brandDataResponse);

    if (values && Array.isArray(values)) {
      brands = Object.fromEntries(getCapDataStructure(values.at(-1)).structure);
    }
  }

  let vBankAssets = {};
  if (vBankDataResponse?.value) {
    const values = getCellValues(vBankDataResponse);

    if (values && Array.isArray(values)) {
      vBankAssets = Object.fromEntries(
        getCapDataStructure(values.at(-1)).structure,
      );
    }
  }

  t.log('\n=== AVAILABLE BRANDS ===');
  const brandKeys = Object.keys(brands).sort();
  brandKeys.forEach((key, index) => {
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
  });
  t.log(`\nTotal brands: ${brandKeys.length}`);

  t.log('\n=== AVAILABLE VBANK ASSETS ===');
  const vBankKeys = Object.keys(vBankAssets).sort();
  vBankKeys.forEach((key, index) => {
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
  });
  t.log(`\nTotal vBank assets: ${vBankKeys.length}\n`);

  const poc26Brand = brands['PoC26'];
  t.truthy(
    poc26Brand,
    'PoC26 brand should exist in published.agoricNames.brand',
  );

  const poc26VBankAsset = vBankAssets['upoc26'];
  t.truthy(
    poc26VBankAsset,
    'upoc26 asset should exist in published.agoricNames.vbankAsset',
  );
  t.truthy(poc26VBankAsset?.brand, 'upoc26 asset should have a brand property');

  let brandBoardId, vBankBoardId;

  if (brandDataResponse?.value) {
    const values = getCellValues(brandDataResponse);
    if (values && Array.isArray(values)) {
      const { structure, slots } = getCapDataStructure(values.at(-1));
      const brandEntries = Object.fromEntries(structure);

      const poc26Entry = brandEntries.PoC26;
      if (poc26Entry && poc26Entry[1]) {
        const slotMatch = poc26Entry[1].match(/\$(\d+)\./);
        if (slotMatch && slots) {
          const slotIndex = parseInt(slotMatch[1]);
          brandBoardId = slots[slotIndex];
        }
      }
    }
  }

  if (vBankDataResponse?.value) {
    const values = getCellValues(vBankDataResponse);
    if (values && Array.isArray(values)) {
      const { structure, slots } = getCapDataStructure(values.at(-1));
      const vBankEntries = Object.fromEntries(structure);

      const upoc26Entry = vBankEntries.upoc26;
      if (upoc26Entry && upoc26Entry[1] && upoc26Entry[1].brand) {
        const slotMatch = upoc26Entry[1].brand.match(/\$(\d+)\./);
        if (slotMatch && slots) {
          const slotIndex = parseInt(slotMatch[1]);
          vBankBoardId = slots[slotIndex];
        }
      }
    }
  }

  t.log('=== POC26 BOARD ID COMPARISON ===');
  t.log('PoC26 brand board ID from published.agoricNames.brand:', brandBoardId);
  t.log(
    'PoC26 brand board ID from published.agoricNames.vbankAsset:',
    vBankBoardId,
  );
  t.log('Board IDs match:', brandBoardId === vBankBoardId, '\n');

  t.log('PoC26 brand:', poc26Brand);
  t.log('PoC26 vBank asset:', poc26VBankAsset);
  t.log('Brand board ID:', brandBoardId);
  t.log('vBank board ID:', vBankBoardId);

  t.is(brandBoardId, vBankBoardId, 'PoC26 brand board IDs should match');
});
