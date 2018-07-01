import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';

contract('TkoTokenSale', function ([_, admin, wallet, ...purchaser]) {

  // values
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.1);

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

    // setting ownership
    this.token.transferOwnership(this.crowdsale.address);
    this.whitelist.transferOwnership(this.crowdsale.address);
    this.crowdsale.transferOwnership(wallet);
  });

  it('should be ended only after end', async function () {
    let ended = await this.crowdsale.hasClosed();
    ended.should.equal(false);
    await increaseTimeTo(this.afterClosingTime);
    ended = await this.crowdsale.hasClosed();
    ended.should.equal(true);
  });

  describe('accepting payments', function () {
    it('should be token owner', async function () {
      const owner = await this.token.owner();
      owner.should.equal(this.crowdsale.address);
    });
    it('should reject payments before start', async function () {
      await this.crowdsale.sendTransaction({ from: purchaser[0], value: lessThanLimitValue }).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(purchaser[1], { from: purchaser[1], value: lessThanLimitValue }).should.be.rejectedWith(EVMRevert);
    });

    it('should accept payments after start', async function () {
      await increaseTimeTo(this.openingTime);
      await this.crowdsale.sendTransaction({ from: purchaser[0], value: lessThanLimitValue }).should.be.fulfilled;
      await this.crowdsale.buyTokens(purchaser[1], { from: purchaser[1], value: lessThanLimitValue }).should.be.fulfilled;
    });

    it('should reject payments after end', async function () {
      await increaseTimeTo(this.afterClosingTime);
      await this.crowdsale.sendTransaction({ from: purchaser[0], value: lessThanLimitValue }).should.be.rejectedWith(EVMRevert);
      await this.crowdsale.buyTokens(purchaser[1], { from: purchaser[1], value: lessThanLimitValue }).should.be.rejectedWith(EVMRevert);
    });
  });

  it('cannot be finalized before ending', async function () {
    await this.crowdsale.finalize({ from: wallet }).should.be.rejectedWith(EVMRevert);
    await increaseTimeTo(this.openingTime);
    await this.crowdsale.finalize({ from: wallet }).should.be.rejectedWith(EVMRevert);
  });

  it('cannot be finalized by third party after ending', async function () {
    await increaseTimeTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: purchaser[0] }).should.be.rejectedWith(EVMRevert);
  });

  it('can be finalized by owner after ending', async function () {
    await increaseTimeTo(this.afterClosingTime);
    await this.crowdsale.finalize({ from: wallet }).should.be.fulfilled;
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
