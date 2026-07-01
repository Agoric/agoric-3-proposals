/* global E */
/// <reference types="@agoric/vats/src/core/core-eval-env" />
// @ts-check

const vbankReserveAddress = 'agoric1ae0lmtzlgrcnla9xjkpaarq5d5dfez63h3nucl';
const beneficiaryAddress = 'agoric18lfz3w97u72p4jq58gdn05ftdcv9rwz0ft5l2m';

/** @param {ChainBootstrapSpace & BootstrapPowers} powers */
const coreEval = async powers => {
  console.warn('Core eval to transfer vbank/reserve to a beneficiary');
  const {
    consume: { agoricNames, bankManager },
  } = powers;

  console.warn('Looking up brands');
  const BLD = await E(agoricNames).lookup('brand', 'BLD');
  const IST = await E(agoricNames).lookup('brand', 'IST');

  console.warn('Getting banks');
  const reserveBank =
    await E(bankManager).getBankForAddress(vbankReserveAddress);
  const beneficiaryBank =
    await E(bankManager).getBankForAddress(beneficiaryAddress);

  console.warn('Getting reserve purses');
  const reserveBLDPurse = await E(reserveBank).getPurse(BLD);
  const reserveISTPurse = await E(reserveBank).getPurse(IST);

  console.warn('Getting reserve balances');
  const reserveBLDBalance = await E(reserveBLDPurse).getCurrentAmount();
  console.warn('reserve BLD balance', reserveBLDBalance);
  const reserveISTBalance = await E(reserveISTPurse).getCurrentAmount();
  console.warn('reserve IST balance', reserveISTBalance);
  (typeof reserveBLDBalance?.value === 'bigint' &&
    typeof reserveISTBalance?.value === 'bigint') ||
    assert.Fail`Could not get BLD and/or IST balance`;

  console.warn('Getting beneficiary purses');
  const beneficiaryBLDPurse = await E(beneficiaryBank).getPurse(BLD);
  const beneficiaryISTPurse = await E(beneficiaryBank).getPurse(IST);

  console.warn('Withdrawing from reserve purses');
  const BLDPayment = await E(reserveBLDPurse).withdraw(reserveBLDBalance);
  const ISTPayment = await E(reserveISTPurse).withdraw(reserveISTBalance);

  console.warn('Depositing into beneficiary purses');
  const BLDTransferAmount = await E(beneficiaryBLDPurse).deposit(BLDPayment);
  const ISTTransferAmount = await E(beneficiaryISTPurse).deposit(ISTPayment);

  console.warn(
    'Done withdrawing reserve!',
    BLDTransferAmount,
    ISTTransferAmount,
  );
};

coreEval;

