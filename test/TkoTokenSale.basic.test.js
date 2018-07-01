import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';

contract('TkoTokenSale', function ([_, admin, wallet, ...purchaser]) {

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  // values
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.1);

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

    // set expected token amount at opening time.
    this.expectedTokenAmount = lessThanLimitValue.mul(params.initialRate);
  });


  describe('accepting payments', function () {
    it('should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });

    it('should accept payments after start', async function () {
      await this.crowdsale.sendTransaction({ from: purchaser[0], value: lessThanLimitValue }).should.be.fulfilled;
      await this.crowdsale.buyTokens(purchaser[1], { from: purchaser[1], value: lessThanLimitValue }).should.be.fulfilled;
    });
  });

  describe('high-level purchase', function () {
    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.sendTransaction({ value: lessThanLimitValue, from: purchaser[0] });
      const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(purchaser[0]);
      event.args.beneficiary.should.equal(purchaser[0]);
      event.args.value.should.be.bignumber.equal(lessThanLimitValue);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to sender', async function () {
      await this.crowdsale.sendTransaction({ value: lessThanLimitValue, from: purchaser[0] });
      let balance = await this.token.balanceOf(purchaser[0]);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.sendTransaction({ value: lessThanLimitValue, from: purchaser[0] });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(lessThanLimitValue);
    });
  });

  describe('low-level purchase', function () {
    it('should log purchase', async function () {
      const { logs } = await this.crowdsale.buyTokens(purchaser[0], { value: lessThanLimitValue, from: purchaser[1] });
      const event = logs.find(e => e.event === 'TokenPurchase');
      should.exist(event);
      event.args.purchaser.should.equal(purchaser[1]);
      event.args.beneficiary.should.equal(purchaser[0]);
      event.args.value.should.be.bignumber.equal(lessThanLimitValue);
      event.args.amount.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should assign tokens to beneficiary', async function () {
      await this.crowdsale.buyTokens(purchaser[0], { value: lessThanLimitValue, from: purchaser[1] });
      const balance = await this.token.balanceOf(purchaser[0]);
      balance.should.be.bignumber.equal(this.expectedTokenAmount);
    });

    it('should forward funds to wallet', async function () {
      const pre = web3.eth.getBalance(wallet);
      await this.crowdsale.buyTokens(purchaser[0], { value: lessThanLimitValue, from: purchaser[1] });
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(lessThanLimitValue);
    });
  });

  describe('invalid arguments', function () {
    it('should not sell token to zero address', async function () {
      await this.crowdsale.buyTokens(0x00, { value: lessThanLimitValue, from: purchaser[1] }).should.be.rejectedWith(EVMRevert);
    });

    it('should not sell token of amount zero', async function () {
      await this.crowdsale.sendTransaction({ value: 0, from: purchaser[0] }).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with zero rate', async function () {
      await TkoTokenSale.new(this.openingTime, this.closingTime, 0, 0,
                                                      params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                      wallet, this.token.address, this.whitelist.address).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with wallet at zero-address', async function () {
      await TkoTokenSale.new(this.openingTime, this.closingTime,  params.initialRate, params.finalRate,
                                                      params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                      ZERO_ADDRESS, this.token.address, this.whitelist.address).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with token at zero-address', async function () {
      await TkoTokenSale.new(this.openingTime, this.closingTime, params.initialRate, params.finalRate,
                                                      params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                      wallet, ZERO_ADDRESS, this.whitelist.address).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with whitelist at zero-address', async function () {
      await TkoTokenSale.new(this.openingTime, this.closingTime, params.initialRate, params.finalRate,
                                                        params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                        wallet, this.token.address, ZERO_ADDRESS).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with opening time is past', async function () {
      let pastTime = this.openingTime - duration.days(1);
      await TkoTokenSale.new(pastTime, this.closingTime, params.initialRate, params.finalRate,
                                                      params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                      wallet, this.token.address, this.whitelist.address).should.be.rejectedWith(EVMRevert);
    });
    it('should not construct instance with opening time and closing time are reversed', async function () {
      await TkoTokenSale.new(this.closingTime, this.openingTime, params.initialRate, params.finalRate,
                                                      params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                      wallet, this.token.address, this.whitelist.address).should.be.rejectedWith(EVMRevert);
    });
  });
});
