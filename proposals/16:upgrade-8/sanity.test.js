/** @file adapted from upgrade-9's sanity, ensure addresses are what we expected */
import test from 'ava';

import {
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  USER1ADDR,
  VALIDATORADDR,
} from '@agoric/synthetic-chain/src/lib/constants.js';

test('gov1 address', async t => {
  t.is(GOV1ADDR, 'agoric1ee9hr0jyrxhy999y755mp862ljgycmwyp4pl7q');
});

test('gov2 address', async t => {
  t.is(GOV2ADDR, 'agoric1wrfh296eu2z34p6pah7q04jjuyj3mxu9v98277');
});

test('gov3 address', async t => {
  t.is(GOV3ADDR, 'agoric1ydzxwh6f893jvpaslmaz6l8j2ulup9a7x8qvvq');
});

test('user1 address', async t => {
  t.is(USER1ADDR, 'agoric1rwwley550k9mmk6uq6mm6z4udrg8kyuyvfszjk');
});

test('validator address', async t => {
  t.is(VALIDATORADDR, 'agoric1estsewt6jqsx77pwcxkn5ah0jqgu8rhgflwfdl');
});
