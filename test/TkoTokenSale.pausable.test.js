import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoTokenSale is Pausable', function ([_, admin, wallet, ...purchaser]) {

  // values
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.0000001);

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


  it('can perform normal process in non-pause', async function () {
    await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaser[0]}).should.be.fulfilled;
  });

  it('can not perform normal process in pause', async function () {
    await this.crowdsale.pause({from:wallet}).should.be.fulfilled;
    await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaser[0]}).should.be.rejected;
  });
  it('can not perform normal process in pause by pauseCrowdsale', async function () {
    await this.crowdsale.pauseCrowdsale({from:wallet}).should.be.fulfilled;
    await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaser[0]}).should.be.rejected;
  });

  it('can not unpause in non-pause', async function () {
    await this.crowdsale.unpause({from:wallet}).should.be.rejected;
  });
  it('can not unpauseCrowdsale in non-pause', async function () {
    await this.crowdsale.unpauseCrowdsale({from:wallet}).should.be.rejected;
  });

  it('can unpauseCrowdsale in pause', async function () {
    await this.crowdsale.pauseCrowdsale({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from:wallet}).should.be.fulfilled;
  });

  it('should resume allowing normal process after pause is over', async function () {
    await this.crowdsale.pause({from:wallet});
    await this.crowdsale.unpause({from:wallet});
    await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaser[0]}).should.be.fulfilled;
  });
  it('should resume allowing normal process after pause is over by un/pauseCrowdsale', async function () {
    await this.crowdsale.pauseCrowdsale({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from:wallet});
    await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaser[0]}).should.be.fulfilled;
  });

  it('should prevent unpauseCrowdsale after pause is over', async function () {
    await this.crowdsale.pause({from:wallet});
    await this.crowdsale.unpause({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from: wallet}).should.be.rejected;
  });
  it('should prevent unpauseCrowdsale after pause is over by un/pauseCrowdsale', async function () {
    await this.crowdsale.pauseCrowdsale({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from: wallet}).should.be.rejected;
  });

  it('should prevent prevent non-owners from pause/unpause', async function () {
    await this.crowdsale.pause({from:purchaser[0]}).should.be.rejected
    await this.crowdsale.pause({from:wallet});
    await this.crowdsale.unpause({from:purchaser[0]}).should.be.rejected
  });
  it('should prevent prevent non-owners from pause/unpauseCrowdsale', async function () {
    await this.crowdsale.pauseCrowdsale({from:purchaser[0]}).should.be.rejected
    await this.crowdsale.pauseCrowdsale({from:wallet});
    await this.crowdsale.unpauseCrowdsale({from:purchaser[0]}).should.be.rejected
  });

});
