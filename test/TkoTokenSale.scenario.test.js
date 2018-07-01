// Based on code by OpenZeppelin's FinalizableCrowdsale.test.js
// ----------------------------------------------------------------------
// FinalizableCrowdsale.test.js
// Copyright (c) 2016 Smart Contract Solutions, Inc.
// Released under the MIT license
// https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/LICENSE
// ----------------------------------------------------------------------

import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, MultiSigWallet, params
} from './common';

contract('Senario Test', function ([
        _,
        admin,
        keyA, keyB, keyC,
        purchaserA, purchaserB, purchaserC,
        tokenHolder,
        ...purchaser
    ]) {

  // values
  const deltaValue = ether(0.1);
  const value = ether(Number(params.limitEther) + 0.1) ;
  const lessThanLimitValue = ether(Number(params.limitEther) - 0.1);
  const largeContribValue  = ether(params.largeContribThreshold);

  before(async function () {
    await advanceBlock();

    // set token sale period
    this.openingTime       = latestTime() + duration.weeks(1);
    this.closingTime       = this.openingTime + duration.weeks(1 + 8);
    this.beforeOpeningTime = this.openingTime - duration.seconds(3600);
    this.afterClosingTime  = this.closingTime + duration.seconds(1);

    // initialize
    this.wallet = await MultiSigWallet.new([keyA,keyB,keyC], 2, params.multiSigDailyLimitEther);
    this.token = await TkoToken.new();
    this.whitelist = await TkoWhitelist.new(admin);
    this.crowdsale = await TkoTokenSale.new(this.openingTime, this.closingTime, params.initialRate, params.finalRate,
                                                params.limitEther, params.largeContribThreshold, params.largeContribPercentage,
                                                this.wallet.address, this.token.address, this.whitelist.address);

    // setting ownership
    this.token.transferOwnership(this.crowdsale.address);
    this.whitelist.transferOwnership(this.crowdsale.address);
    this.crowdsale.transferOwnership(this.wallet.address);
  });

  describe('before the open of token sale', function () {
    before(async function () {
      // set timestamp to before the open of token sale.
      await increaseTimeTo(this.beforeOpeningTime);
    });

    it('should prevent purchase', async function () {
        await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaserA}).should.be.rejectedWith(EVMRevert);
        await this.crowdsale.buyTokens(purchaserA, { value: lessThanLimitValue, from: purchaserA }).should.be.rejectedWith(EVMRevert);
    });
  });

  describe('during token sale period', function () {
    before(async function () {
      // set timestamp to intermediate time of token sale.
      await increaseTimeTo(this.openingTime);
    });

    it('should prevent purchase when sending value more than limit', async function () {
        await this.crowdsale.sendTransaction({value:value, from: purchaserA}).should.be.rejectedWith(EVMRevert);
    });

    it('should sell token when sending value is less than limit', async function () {
        let weiAmount = lessThanLimitValue;
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should prevent purchase when total value will be more than limit', async function () {
        await this.crowdsale.sendTransaction({value:deltaValue*1.5, from: purchaserA}).should.be.rejectedWith(EVMRevert);
    });

    it('should sell token when sending value is less than limit', async function () {
        let weiAmount = deltaValue.times(0.5);
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should reject to add whitelist from non-admin', async function () {
        await this.whitelist.addToWhitelist(purchaserA,{from: purchaserA}).should.be.rejectedWith(EVMRevert);
    });

    it('should add whitelist purchaserA and purchaserB from admin', async function () {
        await this.whitelist.addToWhitelist(purchaserA,{from: admin}).should.be.fulfilled;
        await this.whitelist.addToWhitelist(purchaserB,{from: admin}).should.be.fulfilled;
        assert.isTrue(await this.whitelist.isWhitelisted(purchaserA,{from: admin}));
        assert.isTrue(await this.whitelist.isWhitelisted(purchaserB,{from: admin}));
    });

    it('should sell token when purchaserA is whitelisted even if total value will be equal limit', async function () {
        let weiAmount = deltaValue;
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should sell token when purchaserA is whitelisted even if total value will be more than limit', async function () {
        let weiAmount = ether(1);
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should sell token with bonus when purchaserB is whitelisted even if first sending value is more than limit and large contribution value', async function () {
        let weiAmount = largeContribValue.plus(ether(0.5));
        let purchaser = purchaserB;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        var percentage = new BigNumber(params.largeContribPercentage);
        assert.isTrue(weiAmount.times(beforeRate).times(percentage).div(100) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate).times(percentage).div(100)  <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should prevent purchase when total value is already more than limit after removing whitelist', async function () {
        await this.whitelist.removeFromWhitelist(purchaserB,{from: admin}).should.be.fulfilled;
        assert.isFalse(await this.whitelist.isWhitelisted(purchaserB,{from: admin}));
        await this.crowdsale.sendTransaction({value:deltaValue, from: purchaserB}).should.be.rejectedWith(EVMRevert);
    });

    it('should reject pause crowdsale from keyA direct', async function () {
        await this.crowdsale.pauseCrowdsale({from: keyA}).should.be.rejectedWith(EVMRevert);
    });

    it('should pause crowdsale with multisig', async function () {
        let txData = this.crowdsale.pauseCrowdsale.request().params[0].data;
        let { logs } = await this.wallet.submitTransaction(this.crowdsale.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        let transactionId = logs[0].args.transactionId.toNumber();

        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;
        assert.isTrue(await this.crowdsale.paused())
    });

    it('should prevent purchase when crowdsale is paused', async function () {
        await this.crowdsale.sendTransaction({value:deltaValue, from: purchaserA}).should.be.rejectedWith(EVMRevert);
        await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaserC}).should.be.rejectedWith(EVMRevert);
    });

    it('should reject unpause crowdsale from keyA direct', async function () {
        await this.crowdsale.unpauseCrowdsale({from: keyA}).should.be.rejectedWith(EVMRevert);
    });

    it('should unpause crowdsale with multisig', async function () {

        assert.isTrue(await this.crowdsale.paused());

        let txData = this.crowdsale.unpauseCrowdsale.request().params[0].data;
        let { logs } = await this.wallet.submitTransaction(this.crowdsale.address, 0, txData, {from: keyA});

        assert.equal(logs[0].event, 'Submission');
        let transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyC}).should.be.fulfilled;

        assert.isFalse(await this.crowdsale.paused())
    });

    it('should sell token when token sale is unpaused', async function () {
        let weiAmount = deltaValue;
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should reject evacuate crowdsale from whitelist admin direct', async function () {
        await this.crowdsale.evacuate({from: admin}).should.be.rejectedWith(EVMRevert);
    });

    it('should evacuate crowdsale with multisig', async function () {

        let txData = this.crowdsale.evacuate.request().params[0].data;
        let { logs } = await this.wallet.submitTransaction(this.crowdsale.address, 0, txData, {from: keyB});
        assert.equal(logs[0].event, 'Submission');

        let transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyC}).should.be.fulfilled;

        assert.equal(await this.token.owner(), this.wallet.address);
        assert.equal(await this.whitelist.owner(), this.wallet.address);
    });

    it('should prevent purchase when crowdsale is stopped', async function () {
        await this.crowdsale.sendTransaction({value:deltaValue, from: purchaserA}).should.be.rejectedWith(EVMRevert);
        await this.crowdsale.sendTransaction({value:lessThanLimitValue, from: purchaserC}).should.be.rejectedWith(EVMRevert);
    });

    it('should change admin of whitelist with multisig', async function () {

        let txData = this.whitelist.changeAdmin.request(keyC).params[0].data;
        let { logs } = await this.wallet.submitTransaction(this.whitelist.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');

        assert.equal(await this.whitelist.admin(), admin);

        let transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        assert.equal(await this.whitelist.admin(), keyC);
    });

    it('cannot add to whitelist by old admin', async function () {
        await this.whitelist.addToWhitelist(purchaserC,{from: admin}).should.be.rejectedWith(EVMRevert);
    });

    it('should restore admin of whitelist with multisig', async function () {

        let txData = this.whitelist.changeAdmin.request(admin).params[0].data;
        let { logs } = await this.wallet.submitTransaction(this.whitelist.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');

        assert.equal(await this.whitelist.admin(), keyC);

        let transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        assert.equal(await this.whitelist.admin(), admin);
    });

    it('should reject transfer owner of token and whitelist by keyC direct', async function () {
        await this.token.transferOwnership(this.crowdsale.address,{from: keyC}).should.be.rejectedWith(EVMRevert);
        await this.whitelist.transferOwnership(this.crowdsale.address,{from: keyC}).should.be.rejectedWith(EVMRevert);
    });

    it('should re-setting owner of token and whitelist to crowdsale with multisig', async function () {

        // change owner of whitelist to crowdsale
        var txData = this.whitelist.transferOwnership.request(this.crowdsale.address).params[0].data;
        var { logs } = await this.wallet.submitTransaction(this.whitelist.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        var transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        // change owner of token to crowdsale
        var txData = this.token.transferOwnership.request(this.crowdsale.address).params[0].data;
        var { logs } = await this.wallet.submitTransaction(this.token.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        var transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        // check
        assert.equal(await this.whitelist.owner(), this.crowdsale.address);
        assert.equal(await this.token.owner(), this.crowdsale.address);
    });

    it('should sell token when token sale is re-start', async function () {
        let weiAmount = deltaValue;
        let purchaser = purchaserA;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });

    it('should prevent purchase when purchaseC is not on whitelist and value is more than limit', async function () {
        await this.crowdsale.sendTransaction({value:value, from: purchaserC}).should.be.rejectedWith(EVMRevert);
    });

    it('cannot add to whitelist by purchaseC itself and old admin', async function () {
        await this.whitelist.addToWhitelist(purchaserC,{from: purchaserC}).should.be.rejectedWith(EVMRevert);
        await this.whitelist.addToWhitelist(purchaserC,{from: keyC}).should.be.rejectedWith(EVMRevert);
    });

    it('should add to whitelist by restored admin', async function () {
        await this.whitelist.addToWhitelist(purchaserC,{from: admin}).should.be.fulfilled;
        assert.isTrue(await this.whitelist.isWhitelisted(purchaserC, {from:admin}));
    });

    it('should sell token to whitelisted purchaserC after re-start', async function () {
        let weiAmount = value;
        let purchaser = purchaserC;
        let beforeTokenAmount = await this.token.balanceOf(purchaser);
        let beforeWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let beforeRate = await this.crowdsale.getCurrentRate();

        await this.crowdsale.sendTransaction({value:weiAmount, from: purchaser}).should.be.fulfilled;

        let afterTokenAmount = await this.token.balanceOf(purchaser);
        let afterWalletAmount = await web3.eth.getBalance(this.wallet.address);
        let afterRate = await this.crowdsale.getCurrentRate();

        assert.isTrue(weiAmount.times(beforeRate) >= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.times(afterRate) <= afterTokenAmount.minus(beforeTokenAmount));
        assert.isTrue(weiAmount.eq(afterWalletAmount.minus(beforeWalletAmount)));
    });
  });

  describe('after token sale', function () {
    before(async function () {
      // set timestamp to after closing time of token sale.
      await increaseTimeTo(this.afterClosingTime);
    });

    it('should prevent purchase', async function () {
        await this.crowdsale.sendTransaction({value:deltaValue, from: purchaserA}).should.be.rejectedWith(EVMRevert);
        await this.crowdsale.buyTokens(purchaserC, { value: deltaValue, from: purchaserC }).should.be.rejectedWith(EVMRevert);
    });

    it('should finalize crowdsale with multisig', async function () {

        var txData = this.crowdsale.finalize.request().params[0].data;
        var { logs } = await this.wallet.submitTransaction(this.crowdsale.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        var transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        // check
        assert.equal(await this.whitelist.owner(), this.wallet.address);
        assert.equal(await this.token.owner(), this.wallet.address);
    });

    it('should finalize crowdsale with multisig', async function () {
        var txData = this.crowdsale.finalize.request().params[0].data;
        var { logs } = await this.wallet.submitTransaction(this.crowdsale.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        var transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        // check
        assert.equal(await this.whitelist.owner(), this.wallet.address);
        assert.equal(await this.token.owner(), this.wallet.address);
    });

    it('should mint token with multisig', async function () {
        var txData = this.token.mint.request(tokenHolder,ether(12)).params[0].data;
        var { logs } = await this.wallet.submitTransaction(this.token.address, 0, txData, {from: keyA});
        assert.equal(logs[0].event, 'Submission');
        var transactionId = logs[0].args.transactionId.toNumber();
        await this.wallet.confirmTransaction(transactionId,  {from:keyB}).should.be.fulfilled;

        // check
        let amount = await this.token.balanceOf(tokenHolder);
        assert.isTrue(amount.eq(ether(12)));
    });

    it('cannot mint token with direct keyA', async function () {
        await this.token.mint(tokenHolder,ether(12),{from:keyA}).should.be.rejectedWith(EVMRevert);
    });
  });
});
