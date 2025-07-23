// @ts-check
/* eslint-env node */
import '@endo/init/legacy.js'; // axios compat
import test from 'ava';

import { agd } from '@agoric/synthetic-chain';

test('ymax0 is in vstorage', async t => {
  const instanceArray = await agd.query(
    'vstorage',
    'data',
    'published.agoricNames.instance',
  );

  try {
    const outerValue = JSON.parse(instanceArray.value);
    const values = outerValue.values;

    if (!values || !Array.isArray(values)) {
      t.fail('No values array found in instanceArray');
      return;
    }

    const latestValue = values[values.length - 1];
    const parsedValue = JSON.parse(latestValue);
    const bodyContent = parsedValue.body.slice(1);
    const instanceEntries = JSON.parse(bodyContent);
    const instanceNames = instanceEntries.map(([name]) => name).sort();
    console.log('\n=== INSTANCE NAMES ===');
    instanceNames.forEach((name, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${name}`);
    });
    console.log(`\nTotal instances: ${instanceNames.length}\n`);

    t.log(`Found ${instanceNames.length} instances:`);
    t.log(instanceNames.join(', '));

    t.truthy(instanceNames.includes('ymax0'), 'ymax0 should be in vstorage');
  } catch (error) {
    t.log('Error parsing instanceArray:', error.message);
    t.log('instanceArray structure:', JSON.stringify(instanceArray, null, 2));
    t.fail('Failed to parse instance data');
  }
});
