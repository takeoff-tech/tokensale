// Based on code by OpenZeppelin's WhitelistedCrowdsale.test.js
// ----------------------------------------------------------------------
// WhitelistedCrowdsale.test.js
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// ----------------------------------------------------------------------

import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';

contract('TkoTokenSale', function ([_, admin, wallet, authorized, unauthorized, anotherAuthorized, ...purchaser]) {

  // values
  const value = ether(Number(params.limitEther) + 0.1);
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.0000001);
  const lessThanHalfLimitValue = ether(Number(params.limitEther)/2 - 0.000001);

  before(async function () {
    await advanceBlock();
  });

  beforeEach(async function () {
    // set token sale period
    this.openingTime = latestTime() + duration.weeks(1);
    this.closingTime = this.openingTime + duration.weeks(8);

    // initialize
    this.token = await TkoToken.new();
    this.whitelist = await TkoWhitelist.new(admin);
    this.crowdsale = await TkoTokenSale.new(this.openingTime, this.closingTime, params.initialRate, params.finalRate,
                                                params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                wallet, this.token.address, this.whitelist.address);

    // setting ownership
    this.token.transferOwnership(this.crowdsale.address);
    this.whitelist.transferOwnership(this.crowdsale.address);
    this.crowdsale.transferOwnership(wallet);

    // set timestamp to openingTime
    await increaseTimeTo(this.openingTime);

  });

  describe('single user whitelisting', function () {
    beforeEach(async function () {
      await this.whitelist.addToWhitelist(authorized, {from:admin});
    });

    describe('accepting payments', function () {
      it('should accept payments from anyone if value is less than limit amount', async function () {
        await this.crowdsale.sendTransaction({value:lessThanHalfLimitValue, from: authorized}).should.be.fulfilled;
        await this.crowdsale.sendTransaction({value:lessThanHalfLimitValue, from: unauthorized}).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: lessThanHalfLimitValue, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(unauthorized, { value: lessThanHalfLimitValue, from: unauthorized }).should.be.fulfilled;
      });

      it('should accept payments to whitelisted even if sum of value is more than limit amount', async function () {
        await this.crowdsale.sendTransaction({ value:lessThanLimitValue, from: authorized}).should.be.fulfilled;
        await this.crowdsale.sendTransaction({ value:lessThanLimitValue, from: authorized}).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: lessThanLimitValue, from: unauthorized }).should.be.fulfilled;
      });

      it('should reject payments to whitelisted if sum of value is more than limit amount', async function () {
        await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: unauthorized}).should.be.fulfilled;
        await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: unauthorized}).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: lessThanLimitValue, from: authorized }).should.be.rejected;
      });

      it('should accept payments to whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.sendTransaction({value:value, from: authorized}).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: unauthorized }).should.be.fulfilled;
      });

      it('should reject payments to not whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.sendTransaction({value:value, from: unauthorized}).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: unauthorized }).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: authorized }).should.be.rejected;
      });

      it('should reject payments to addresses removed from whitelist', async function () {
        await this.whitelist.removeFromWhitelist(authorized, {from:admin});
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.rejected;
      });

      it('should reject payments to addresses removed from whitelist if sum of value is more than limit amount', async function () {
        await this.crowdsale.sendTransaction({value:value, from: authorized}).should.be.fulfilled;
        await this.whitelist.removeFromWhitelist(authorized, {from:admin});
        await this.crowdsale.buyTokens(authorized, { value: lessThanLimitValue, from: authorized }).should.be.rejected;
      });
    });

    describe('reporting whitelisted', function () {
      it('should correctly report whitelisted addresses', async function () {
        let isAuthorized = await this.whitelist.isWhitelisted(authorized, {from:admin});
        isAuthorized.should.equal(true);
        let isntAuthorized = await this.whitelist.isWhitelisted(unauthorized, {from:admin});
        isntAuthorized.should.equal(false);
      });
    });

  });


  describe('many user whitelisting', function () {
    beforeEach(async function () {
      await this.whitelist.addManyToWhitelist([authorized, anotherAuthorized],{ from:admin });
    });

    describe('accepting payments', function () {
      it('should accept payments to whitelisted (from whichever buyers)', async function () {
        await this.crowdsale.sendTransaction({value:value, from: authorized}).should.be.fulfilled;
        await this.crowdsale.sendTransaction({value:value, from: anotherAuthorized}).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(authorized, { value: value, from: unauthorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: unauthorized }).should.be.fulfilled;
      });

      it('should reject payments to not whitelisted (with whichever buyers)', async function () {
        await this.crowdsale.sendTransaction({value:value, from:unauthorized}).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: unauthorized }).should.be.rejected;
        await this.crowdsale.buyTokens(unauthorized, { value: value, from: authorized }).should.be.rejected;
      });

      it('should reject payments to addresses removed from whitelist', async function () {
        await this.whitelist.removeFromWhitelist(anotherAuthorized,{from:admin});
        await this.crowdsale.buyTokens(authorized, { value: value, from: authorized }).should.be.fulfilled;
        await this.crowdsale.buyTokens(anotherAuthorized, { value: value, from: authorized }).should.be.rejected;
      })
    });

    describe('reporting whitelisted', function () {
      it('should correctly report whitelisted addresses', async function () {
        let isAuthorized = await this.whitelist.isWhitelisted(authorized,{from:admin});
        isAuthorized.should.equal(true);
        let isAnotherAuthorized = await this.whitelist.isWhitelisted(anotherAuthorized,{from:admin});
        isAnotherAuthorized.should.equal(true);
        let isntAuthorized = await this.whitelist.isWhitelisted(unauthorized,{from:admin});
        isntAuthorized.should.equal(false);
      });
    });
  });
});
