// Based on code by OpenZeppelin's DetailedERC20.test.js
// ----------------------------------------------------------------------
// DetailedERC20.test.js
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// ----------------------------------------------------------------------

import assertRevert from '../../lib/zeppelin-solidity/helpers/assertRevert';
const TkoToken = artifacts.require('TkoToken');

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();


contract('DetailedERC20', function([account]) {
  let detailedERC20 = null;

  const _name = 'TkoToken';
  const _symbol = 'TKO';
  const _decimals = 18;

  beforeEach(async function () {
    detailedERC20 = await TkoToken.new();
  });

  it('has a name', async function () {
    const name = await detailedERC20.name();
    name.should.be.equal(_name);
  });

  it('has a symbol', async function () {
    const symbol = await detailedERC20.symbol();
    symbol.should.be.equal(_symbol);
  });

  it('has an amount of decimals', async function () {
    const decimals = await detailedERC20.decimals();
    decimals.should.be.bignumber.equal(_decimals);
  });
});
