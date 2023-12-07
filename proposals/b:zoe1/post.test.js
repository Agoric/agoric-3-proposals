import test from 'ava';
import { execaCommand } from 'execa';
import {
  agops,
  agopsLocation,
} from '../../upgrade-test-scripts/lib/cliHelper.js';
import { getIncarnation } from '../../upgrade-test-scripts/lib/vat-status.js';

// TODO migrate into common
/**
 *
 * @param {string} argvStr
 */
export const execAgops = async argvStr => {
  return execaCommand(`${agopsLocation} ${argvStr}`);
};

test(`Zoe vat was upgraded`, async t => {
  const incarantion = await getIncarnation('zoe');
  t.is(incarantion, 1);
});

/**
 * 1. make a new offer that stays open
 * 2. restart the vat-admin vat
 * 3. make sure the offer is still open
 */
test('offer stays open after vat-admin restart', async t => {
  // XXX consider reusing bid-1701709689406 from upgrade-10
  // make an offer that stays open.
  console.log('making an offer that stays open');

  const openOut = await execAgops(
    'inter bid by-price --give 0.01IST --price 30 --from=gov1 --keyring-backend=test',
  );
  // example:
  // {"timestamp":"2023-11-27T21:43:28Z","height":"1081","offerId":"bid-1701121408756","txhash":"BC23D861CC21C8E5BBF58D135CBB3152DF1CA0904AEF23DA1DD8AD52474AAC20"}
  // {"id":"bid-1701121408756","price":"30 IST/ATOM","give":{"Bid":"0.01 IST"},"maxBuy":"1000000 ATOM","result":"Your bid has been accepted"}
  const lines = openOut.split('\n');
  const offer = JSON.parse(lines[1]);
  t.is(offer.result, 'Your bid has been accepted');

  // get the id so we can track specifically that ID
  console.log('opened bid with offer', offer);
  // agd query vstorage data published.wallet.agoric1yjw9dm77gp6zdjulnhqcftuh42nr56czsy2v2u.current --output=json | jq -r ".value|fromjson.values[0]|fromjson.body" | tr "#" " " |jq ".liveOffers|length"

  // restart the vat-admin vat
  console.log('TODO restarting the vat-admin vat');

  // make sure the offer is still open
  console.log('canceling bid, to confirm it was still open');
  const cancel = await execAgops(
    `inter bid cancel ${offer.id} --from=gov1 --keyring-backend=test`,
  );
  t.false(cancel.stderr.includes('not in live offer ids:'));
  t.true(cancel.stderr.includes('is no longer live'));
});
