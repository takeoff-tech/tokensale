import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoTokenSale', function ([_, admin, wallet, investor, purchaser, ...purchasers]) {

  describe('rate during crowdsale should change at a fixed step every block', async function () {
    let balance;

    // values
    const lessThanLimitValue = ether(Number(params.limitEther) - 0.1);
    const largeContribValue  = ether(Number(params.largeContribThreshold) + 0.1);
    const percentage = new BigNumber(params.largeContribPercentage).div(100);

    const initialRate = new BigNumber(9166);
    const finalRate   = new BigNumber(5500);

    const rateAtTime150    = new BigNumber(9166);
    const rateAtTime300    = new BigNumber(9165);
    const rateAtTime1500   = new BigNumber(9157);
    const rateAtTime30     = new BigNumber(9166);
    const rateAtTime150000 = new BigNumber(8257);
    const rateAtTime450000 = new BigNumber(6439);


    describe('when value is less than limit', function () {
        let value = lessThanLimitValue;

        beforeEach(async function () {
          await advanceBlock();

          // set token sale period
          this.openingTime = latestTime() + duration.weeks(1);
          this.closingTime = this.openingTime + duration.weeks(1);
          this.afterClosingTime = this.closingTime + duration.seconds(1);

          // initialize
          this.token = await TkoToken.new();
          this.whitelist = await TkoWhitelist.new(admin);
          this.crowdsale = await TkoTokenSale.new(this.openingTime, this.closingTime, initialRate, finalRate,
                                                    params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                    wallet, this.token.address, this.whitelist.address);

          // setting ownership
          this.token.transferOwnership(this.crowdsale.address);
          this.whitelist.transferOwnership(this.crowdsale.address);
          this.crowdsale.transferOwnership(wallet);
        });

        it('at start', async function () {
          await increaseTimeTo(this.openingTime);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(initialRate));
        });

        it('at time 150', async function () {
          await increaseTimeTo(this.openingTime + 150);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime150));
        });

        it('at time 300', async function () {
          await increaseTimeTo(this.openingTime + 300);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime300));
        });

        it('at time 1500', async function () {
          await increaseTimeTo(this.openingTime + 1500);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime1500));
        });

        it('at time 30', async function () {
          await increaseTimeTo(this.openingTime + 30);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime30));
        });

        it('at time 150000', async function () {
          await increaseTimeTo(this.openingTime + 150000);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime150000));
        });

        it('at time 450000', async function () {
          await increaseTimeTo(this.openingTime + 450000);
          await this.crowdsale.buyTokens(purchaser, { value:value, from: purchaser });
          balance = await this.token.balanceOf(purchaser);
          balance.should.be.bignumber.equal(value.mul(rateAtTime450000));
        });

    });

    describe('when value is more than largeContribThreshold', function () {
        let value = largeContribValue;

        beforeEach(async function () {
          await advanceBlock();

          // set token sale period
          this.openingTime = latestTime() + duration.weeks(1);
          this.closingTime = this.openingTime + duration.weeks(1);
          this.afterClosingTime = this.closingTime + duration.seconds(1);

          // initialize
          this.token = await TkoToken.new();
          this.whitelist = await TkoWhitelist.new(admin);
          this.crowdsale = await TkoTokenSale.new(this.openingTime, this.closingTime, initialRate, finalRate,
                                                    params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                    wallet, this.token.address, this.whitelist.address);

          // setting ownership
          this.token.transferOwnership(this.crowdsale.address);
          this.whitelist.transferOwnership(this.crowdsale.address);
          this.crowdsale.transferOwnership(wallet);

          // add to whitelist
          this.whitelist.addToWhitelist(investor, {from:admin});
        });

        it('at start', async function () {
          await increaseTimeTo(this.openingTime);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(initialRate).mul(percentage));
        });

        it('at time 150', async function () {
          await increaseTimeTo(this.openingTime + 150);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime150).mul(percentage));
        });

        it('at time 300', async function () {
          await increaseTimeTo(this.openingTime + 300);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime300).mul(percentage));
        });

        it('at time 1500', async function () {
          await increaseTimeTo(this.openingTime + 1500);
          await this.crowdsale.buyTokens(investor, { value:value, from: purchaser });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime1500).mul(percentage));
        });

        it('at time 30', async function () {
          await increaseTimeTo(this.openingTime + 30);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime30).mul(percentage));
        });

        it('at time 150000', async function () {
          await increaseTimeTo(this.openingTime + 150000);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime150000).mul(percentage));
        });

        it('at time 450000', async function () {
          await increaseTimeTo(this.openingTime + 450000);
          await this.crowdsale.buyTokens(investor, { value:value, from: investor });
          balance = await this.token.balanceOf(investor);
          balance.should.be.bignumber.equal(value.mul(rateAtTime450000).mul(percentage));
        });
    });
  });
});
