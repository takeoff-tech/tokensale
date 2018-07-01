import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoTokenSale is Ownable', function ([_, admin, wallet, ...accounts]) {

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

  it('should have the owner of wallet', async function () {
    let owner = await this.crowdsale.owner();
    assert.isTrue(owner === wallet);
  });

  it('changes owner after transfer', async function () {
    let other = accounts[1];
    await this.crowdsale.transferOwnership(other, {from: wallet});
    let owner = await this.crowdsale.owner();

    assert.isTrue(owner === other);
  });

  it('should prevent non-owners from transfering', async function () {
    const other = accounts[2];
    const owner = await this.crowdsale.owner();
    assert.isTrue(owner !== other);
    await assertRevert(this.crowdsale.transferOwnership(other, { from: other }));
  });

  it('should guard ownership against stuck state', async function () {
    let originalOwner = await this.crowdsale.owner();
    await assertRevert(this.crowdsale.transferOwnership(null, { from: originalOwner }));
  });

  it('emits a transferOwnership event', async function () {
    let other = accounts[0];
    const { logs } = await this.crowdsale.transferOwnership(other, { from:wallet });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'OwnershipTransferred');
    assert.equal(logs[0].args.previousOwner, wallet);
    assert.equal(logs[0].args.newOwner, other);
  });

  describe('when the sender is not the crowdsale owner', function () {
      let other = accounts[0];

      describe('when the crowdsale was not paused', function () {
        it('reverts at pauseCrowdsale', async function () {
          await assertRevert(this.crowdsale.pauseCrowdsale({ from: other }));
        });
        it('reverts at unpauseCrowdsale', async function () {
          await assertRevert(this.crowdsale.pauseCrowdsale({ from: other }));
        });
      });

      describe('when the crowdsale was paused', function () {
        it('reverts at pauseCrowdsale', async function () {
          await this.crowdsale.pauseCrowdsale({ from: wallet });
          await assertRevert(this.crowdsale.pauseCrowdsale({ from: other }));
        });
        it('reverts at unpauseCrowdsale', async function () {
          await this.crowdsale.pauseCrowdsale({ from: wallet });
          await assertRevert(this.crowdsale.unpauseCrowdsale({ from: other }));
        });
      });

      it('reverts at evacuate', async function () {
        await assertRevert(this.crowdsale.evacuate({ from: other }));
      });
  });


  describe('when the sender is the crowdsale owner', function () {

      describe('when the crowdsale was not paused', function () {
        it('should be paused after call pauseCrowdsale', async function () {
          await this.crowdsale.pauseCrowdsale({ from: wallet });

          assert.isTrue(await this.crowdsale.paused());
          assert.isTrue(await this.token.paused());
        });
        it('reverts at unpauseCrowdsale', async function () {
          await assertRevert(this.crowdsale.unpauseCrowdsale({ from: wallet }));
        });
      });

      describe('when the crowdsale was paused', function () {
        beforeEach(async function () {
          await this.crowdsale.pauseCrowdsale({ from: wallet });
        });

        it('reverts at pauseCrowdsale', async function () {
          await assertRevert(this.crowdsale.pauseCrowdsale({ from: wallet }));
        });
        it('should not be paused after call unpauseCrowdsale', async function () {
          await this.crowdsale.unpauseCrowdsale({ from: wallet });
          assert.isFalse(await this.crowdsale.paused());
          assert.isFalse(await this.token.paused());
        });
      });

      it('should transfer token and whitelist owner to wallet', async function () {
        await this.crowdsale.evacuate({ from: wallet });

        var owner = await this.token.owner();
        assert.isTrue(owner === wallet);
        owner = await this.whitelist.owner();
        assert.isTrue(owner === wallet);
      });
  });

});
