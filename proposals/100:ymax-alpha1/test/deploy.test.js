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

const slotIndexPatt = /^\$(\d+)(?:\.|$)/;

const getBoardIdFromSlotRef = (slotRef, slots) => {
  const slotIndex = slotRef.match(slotIndexPatt)?.[1];
  return slotIndex ? slots.at(Number(slotIndex)) : undefined;
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

  const { structure: instanceEntries, slots } = getCapDataStructure(
    values.at(-1),
  );
  const instances = Object.fromEntries(instanceEntries);
  const instanceNames = Object.keys(instances).sort();
  t.log('\n=== INSTANCE BOARD IDS ===');
  instanceNames.forEach((name, index) => {
    const boardId = getBoardIdFromSlotRef(instances[name], slots);
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${name} ${boardId}`);
  });
  t.log(`\nTotal instances: ${instanceNames.length}\n`);

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
  const [brandsData, vBankAssetsData] = await Promise.all(
    ['published.agoricNames.brand', 'published.agoricNames.vbankAsset'].map(
      async vstoragePath => {
        const response = await agd.query('vstorage', 'data', vstoragePath);
        if (!response?.value) return { record: [], slots: [] };
        const values = getCellValues(response);
        if (!Array.isArray(values)) return { record: [], slots: [] };
        const { structure, slots } = getCapDataStructure(values.at(-1));
        return { record: Object.fromEntries(structure), slots };
      },
    ),
  );

  t.log('\n=== AVAILABLE BRANDS ===');
  const brandKeys = Object.keys(brandsData.record).sort();
  brandKeys.forEach((key, index) => {
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
  });
  t.log(`\nTotal brands: ${brandKeys.length}`);

  t.log('\n=== AVAILABLE VBANK ASSETS ===');
  const vBankKeys = Object.keys(vBankAssetsData.record).sort();
  vBankKeys.forEach((key, index) => {
    t.log(`${(index + 1).toString().padStart(2, ' ')}. ${key}`);
  });
  t.log(`\nTotal vBank assets: ${vBankKeys.length}\n`);

  const poc26Brand = brandsData.record['PoC26'];
  t.truthy(
    poc26Brand,
    'PoC26 brand should exist in published.agoricNames.brand',
  );
  const brandBoardId = getBoardIdFromSlotRef(
    brandsData.record['PoC26'],
    brandsData.slots,
  );

  const poc26VBankAsset = vBankAssetsData.record['upoc26'];
  t.truthy(
    poc26VBankAsset,
    'upoc26 asset should exist in published.agoricNames.vbankAsset',
  );
  t.truthy(poc26VBankAsset.brand, 'upoc26 asset should have a brand property');
  const vBankBoardId = getBoardIdFromSlotRef(
    poc26VBankAsset.brand,
    vBankAssetsData.slots,
  );

  t.log('=== POC26 BRAND BOARD ID COMPARISON ===');
  t.log('PoC26 brand:', poc26Brand);
  t.log('PoC26 vBank asset:', poc26VBankAsset);
  t.log('PoC26 brand board ID from published.agoricNames.brand:', brandBoardId);
  t.log(
    'PoC26 brand board ID from published.agoricNames.vbankAsset:',
    vBankBoardId,
  );

  t.is(brandBoardId, vBankBoardId, 'PoC26 brand board IDs should match');
  t.is(typeof brandBoardId, 'string', 'PoC26 brand board IDs should exist');
});
