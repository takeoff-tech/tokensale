// Based on code by OpenZeppelin's BurnableToken.test.js
// ----------------------------------------------------------------------
// BurnableToken.test.js
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// ----------------------------------------------------------------------

import assertRevert from '../lib/zeppelin-solidity/helpers/assertRevert';
const TkoToken = artifacts.require('TkoToken');

contract('TkoToken is BurnableToken', function ([owner]) {
  beforeEach(async function () {
    this.token = await TkoToken.new({ from: owner });
    this.token.mint(owner, 1000, {from:owner});
  });

  describe('burn', function () {
    const from = owner;

    describe('when the given amount is not greater than balance of the sender', function () {
      const amount = 100;

      it('burns the requested amount', async function () {
        await this.token.burn(amount, { from });

        const balance = await this.token.balanceOf(from);
        assert.equal(balance, 900);
      });

      it('emits a burn event', async function () {
        const { logs } = await this.token.burn(amount, { from });

        assert.equal(logs.length, 1);
        assert.equal(logs[0].event, 'Burn');
        assert.equal(logs[0].args.burner, owner);
        assert.equal(logs[0].args.value, amount);
      });
    });

    describe('when the given amount is greater than the balance of the sender', function () {
      const amount = 1001;

      it('reverts', async function () {
        await assertRevert(this.token.burn(amount, { from }));
      });
    });
  });
});
