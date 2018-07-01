// Based on code by OpenZeppelin's FinalizableCrowdsale.test.js
// ----------------------------------------------------------------------
// FinalizableCrowdsale.test.js
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// ----------------------------------------------------------------------

import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoTokenSale is FinalizableCrowdsale', function ([_, admin, wallet, thirdparty, ...purchaser]) {

  // values
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.0000001);

  before(async function () {
    await advanceBlock();
  });

  beforeEach(async function () {
    // set token sale period
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(8);
    this.afterClosingTime = this.closingTime + duration.seconds(1);

    // initialize
    this.token = await TkoToken.new();
    this.whitelist = await TkoWhitelist.new(admin);
    this.crowdsale = await TkoTokenSale.new(this.openingTime, this.closingTime, params.initialRate, params.finalRate,
                                                params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                wallet, this.token.address, this.whitelist.address);
  });

  describe('when token is finished mint', function () {

      beforeEach(async function () {
        await this.token.finishMinting().should.be.fulfilled;

        // setting ownership
        this.token.transferOwnership(this.crowdsale.address);
        this.whitelist.transferOwnership(this.crowdsale.address);
        this.crowdsale.transferOwnership(wallet);

        // set timestamp to openingTime
        await increaseTimeTo(this.openingTime);
      });

      it('should not sell token after mint finished', async function () {
        await this.crowdsale.sendTransaction({ value: lessThanLimitValue, from: purchaser[0] }).should.be.rejectedWith(EVMRevert);
      });
  });

  describe('when token is mintable', function () {
      beforeEach(async function () {
        // setting ownership
        await this.token.transferOwnership(this.crowdsale.address);
        await this.whitelist.transferOwnership(this.crowdsale.address);
        await this.crowdsale.transferOwnership(wallet);

        // set timestamp to openingTime
        await increaseTimeTo(this.openingTime);
      });

      it('cannot be finalized before ending', async function () {
        await this.crowdsale.finalize({ from: wallet }).should.be.rejectedWith(EVMRevert);
      });

      it('cannot be finalized by third party after ending', async function () {
        await increaseTimeTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: thirdparty }).should.be.rejectedWith(EVMRevert);
      });

      it('can be finalized by owner after ending', async function () {
        await increaseTimeTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: wallet }).should.be.fulfilled;

        var owner = await this.token.owner();
        assert.isTrue(owner === wallet);
        owner = await this.whitelist.owner();
        assert.isTrue(owner === wallet);

        this.token.mint(thirdparty, 100, {from:wallet});
        var amount = await this.token.balanceOf(thirdparty);
        assert.isTrue(amount.eq(100));
      });

      it('cannot be finalized twice', async function () {
        await increaseTimeTo(this.afterClosingTime);
        await this.crowdsale.finalize({ from: wallet });
        await this.crowdsale.finalize({ from: wallet }).should.be.rejectedWith(EVMRevert);
      });

      it('logs finalized', async function () {
        await increaseTimeTo(this.afterClosingTime);
        const { logs } = await this.crowdsale.finalize({ from: wallet });
        const event = logs.find(e => e.event === 'Finalized');
        should.exist(event);
      });
  });

});
