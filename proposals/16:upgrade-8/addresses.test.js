/** @file adapted from upgrade-9's sanity test, ensure addresses are what we expected */
import test from 'ava';

import {
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  USER1ADDR,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';

test('gov1 address', async t => {
  t.is(process.env.GOV1ADDR, GOV1ADDR);
});

test('gov2 address', async t => {
  t.is(process.env.GOV2ADDR, GOV2ADDR);
});

test('gov3 address', async t => {
  t.is(process.env.GOV3ADDR, GOV3ADDR);
});

test('user1 address', async t => {
  t.is(process.env.USER1ADDR, USER1ADDR);
});

test('validator address', async t => {
  t.is(process.env.VALIDATORADDR, VALIDATORADDR);
});
