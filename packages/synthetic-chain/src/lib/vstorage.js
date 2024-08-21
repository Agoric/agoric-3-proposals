import { assert, Fail } from './assert.js';
import { agd } from './cliHelper.js';

const { freeze: harden } = Object; // XXX

// from '@agoric/internal/src/lib-chainStorage.js';
const isStreamCell = cell =>
  cell &&
  typeof cell === 'object' &&
  Array.isArray(cell.values) &&
  typeof cell.blockHeight === 'string' &&
  /^0$|^[1-9][0-9]*$/.test(cell.blockHeight);
harden(isStreamCell);

/**
 * Extract one value from the vstorage stream cell in a QueryDataResponse
 *
 * @param {import('@agoric/cosmic-proto/dist/codegen/agoric/vstorage/query.js').QueryDataResponse} data
 * @param {number} [index] index of the desired value in a deserialized stream cell
 */
export const extractStreamCellValue = (data, index = -1) => {
  const { value: serialized } = data;

  serialized.length > 0 || Fail`no StreamCell values: ${data}`;

  const streamCell = JSON.parse(serialized);
  if (!isStreamCell(streamCell)) {
    throw Fail`not a StreamCell: ${streamCell}`;
  }

  const { values } = streamCell;
  values.length > 0 || Fail`no StreamCell values: ${streamCell}`;

  const value = values.at(index);
  assert.typeof(value, 'string');
  return value;
};
harden(extractStreamCellValue);

export const queryVstorage = path =>
  agd.query('vstorage', 'data', '--output', 'json', path);

// XXX use endo/marshal?
export const getQuoteBody = async path => {
  const queryOut = await queryVstorage(path);

  const body = JSON.parse(JSON.parse(queryOut.value).values[0]);
  return JSON.parse(body.body.substring(1));
};

