import test from 'ava';

import { Far, makeMarshal } from '../src/lib/unmarshal.js';

test('slotless marshal encodes copy data', t => {
  const marshal = makeMarshal();
  const value = {
    text: '#needsEscape',
    notes: '!prefix',
    numbers: [1, 2n, undefined, Infinity, -Infinity, NaN, -0],
  };

  const capData = marshal.toCapData(value);
  t.deepEqual(capData.slots, []);

  const encoded = JSON.parse(capData.body.slice(1));
  t.is(encoded.text, '!#needsEscape');
  t.is(encoded.notes, '!!prefix');
  t.deepEqual(encoded.numbers.slice(0, 3), [1, '+2', '#undefined']);

  const roundTrip = marshal.fromCapData(capData);
  t.is(roundTrip.text, '#needsEscape');
  t.is(roundTrip.notes, '!prefix');
  t.is(roundTrip.numbers[0], 1);
  t.is(roundTrip.numbers[1], 2n);
  t.is(roundTrip.numbers[2], undefined);
  t.is(roundTrip.numbers[3], Infinity);
  t.is(roundTrip.numbers[4], -Infinity);
  t.true(Number.isNaN(roundTrip.numbers[5]));
  t.true(Object.is(roundTrip.numbers[6], -0));
});

test('slotless marshal rejects pass-by-presence', t => {
  const marshal = makeMarshal();
  const remotable = Far('Thing', {});
  t.throws(() => marshal.toCapData(remotable), {
    message: /pass-style/i,
  });
});
