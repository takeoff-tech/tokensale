import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoWhitelist onlyOwnerOrAdmin Functions', function ([owner, admin, ...accounts]) {
  let other = accounts[0];
  let beneficiary = accounts[1];
  let newAdmin = accounts[2];
  let beneficiaries = [accounts[3],accounts[4],accounts[5]];

  beforeEach(async function () {
    this.whitelist = await TkoWhitelist.new(admin, {from:owner});
  });

  it('should not contract admin at zero-address', async function () {
    await TkoWhitelist.new(0x00, {from:owner}).should.be.rejectedWith(EVMRevert);
  });

  it('should not change admin at zero-address', async function () {
    await this.whitelist.changeAdmin(0x00, {from:owner}).should.be.rejectedWith(EVMRevert);
  });

  it('should have the admin', async function () {
    let adminAddress = await this.whitelist.admin();
    assert.isTrue(adminAddress === admin);
  });

  it('changes admin after changeAdmin', async function () {
    await this.whitelist.changeAdmin(newAdmin, {from:owner});
    let adminAddress = await this.whitelist.admin();

    assert.isTrue(adminAddress === newAdmin);
  });

  it('emits a AdminChanged event', async function () {
    const { logs } = await this.whitelist.changeAdmin(newAdmin,{ from: owner });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'AdminChanged');
    assert.equal(logs[0].args.previousAdmin, admin);
    assert.equal(logs[0].args.newAdmin, newAdmin);
  });

  it('should prevent non-owners from changing admin', async function () {
    assert.isTrue(owner !== other);
    await assertRevert(this.whitelist.changeAdmin(other, { from: other }));
  });

  it('reverts at onlyOwnerOrAdmin function after admin changed', async function () {
    var whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: admin });
    assert.isFalse(whitelisted);
    await this.whitelist.changeAdmin(newAdmin, {from:owner});

    await assertRevert(this.whitelist.isWhitelisted(beneficiary,{ from: other }));
  });

  describe('when the sender is not the owner and the admin', function () {

    it('reverts at isWhitelisted', async function () {
       await assertRevert(this.whitelist.isWhitelisted(beneficiary,{ from: other }));
    });
    it('reverts at addToWhitelist', async function () {
       await assertRevert(this.whitelist.addToWhitelist(beneficiary, { from: other }));
    });
    it('reverts at addManyToWhitelist', async function () {
       await assertRevert(this.whitelist.addManyToWhitelist(beneficiaries, { from: other }));
    });
    it('reverts at removeFromWhitelist', async function () {
       await assertRevert(this.whitelist.removeFromWhitelist(beneficiary, { from: other }));
    });
    it('reverts at getTotalIndividualWeiAmount', async function () {
       await assertRevert(this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: other }));
    });
  });

  describe('when the sender is the owner', function () {

    it('can whitelist a beneficiary and get state', async function () {
       var whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: owner });
       assert.isFalse(whitelisted);

       await this.whitelist.addToWhitelist(beneficiary, { from: owner })

       whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: owner });
       assert.isTrue(whitelisted);
    });
    it('can whitelist beneficiaries and get state', async function () {
       await this.whitelist.addManyToWhitelist(beneficiaries, { from: owner })

       var whitelisted = await this.whitelist.isWhitelisted(beneficiaries[0],{ from: owner });
       assert.isTrue(whitelisted);
       whitelisted = await this.whitelist.isWhitelisted(beneficiaries[1],{ from: owner });
       assert.isTrue(whitelisted);
       whitelisted = await this.whitelist.isWhitelisted(beneficiaries[2],{ from: owner });
       assert.isTrue(whitelisted);
    });

    it('can remove a beneficiary from whitelist', async function () {
       await this.whitelist.addToWhitelist(beneficiary, { from: owner })
       var whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: owner });
       assert.isTrue(whitelisted);

       this.whitelist.removeFromWhitelist(beneficiary, { from: owner });
       whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: owner });
       assert.isFalse(whitelisted);
    });

    it('can get amount by getTotalIndividualWeiAmount', async function () {
       var amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: owner });
       assert.equal(amount,0);

       await this.whitelist.addTotalIndividualWeiAmount(beneficiary, 100,{ from: owner });

       amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: owner });
       assert.equal(amount,100);
    });
  });

  describe('when the sender is the admin', function () {

    it('can whitelist a beneficiary and get state', async function () {
       var whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: admin });
       assert.isFalse(whitelisted);

       await this.whitelist.addToWhitelist(beneficiary, { from: admin })

       whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: admin });
       assert.isTrue(whitelisted);
    });
    it('can whitelist beneficiaries and get state', async function () {
       await this.whitelist.addManyToWhitelist(beneficiaries, { from: admin })

       var whitelisted = await this.whitelist.isWhitelisted(beneficiaries[0],{ from: admin });
       assert.isTrue(whitelisted);
       whitelisted = await this.whitelist.isWhitelisted(beneficiaries[1],{ from: admin });
       assert.isTrue(whitelisted);
       whitelisted = await this.whitelist.isWhitelisted(beneficiaries[2],{ from: admin });
       assert.isTrue(whitelisted);
    });

    it('can remove a beneficiary from whitelist', async function () {
       await this.whitelist.addToWhitelist(beneficiary, { from: owner })
       var whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: admin });
       assert.isTrue(whitelisted);

       this.whitelist.removeFromWhitelist(beneficiary, { from: admin });
       whitelisted = await this.whitelist.isWhitelisted(beneficiary,{ from: admin });
       assert.isFalse(whitelisted);
    });

    it('can get amount by getTotalIndividualWeiAmount', async function () {
       var amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: admin });
       assert.equal(amount,0);

       await this.whitelist.setTotalIndividualWeiAmount(beneficiary, 100,{ from: owner });

       amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: admin });
       assert.equal(amount,100);
    });
  });
});
