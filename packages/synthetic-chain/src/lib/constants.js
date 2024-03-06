import { NonNullish } from './assert.js';

export const BINARY = NonNullish(process.env.binary);

export const GOV1ADDR = NonNullish(process.env.GOV1ADDR);
export const GOV2ADDR = NonNullish(process.env.GOV2ADDR);
export const GOV3ADDR = NonNullish(process.env.GOV3ADDR);
export const USER1ADDR = NonNullish(process.env.USER1ADDR);
export const VALIDATORADDR = NonNullish(process.env.VALIDATORADDR);

export const PSM_PAIR = NonNullish(process.env.PSM_PAIR);
export const ATOM_DENOM = NonNullish(process.env.ATOM_DENOM);

export const CHAINID = NonNullish(process.env.CHAINID);
export const HOME = NonNullish(process.env.HOME);

export const SDK_ROOT = '/usr/src/agoric-sdk';
