import {
  ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert, assertRevert,
  BigNumber, should, TkoToken, TkoWhitelist, TkoTokenSale, params
} from './common';


contract('TkoWhitelist is Ownable', function ([owner, admin, ...accounts]) {

  beforeEach(async function () {
    this.whitelist = await TkoWhitelist.new(admin, {from:owner});
  });

  it('should have the owner', async function () {
    let ownerAddress = await this.whitelist.owner();
    assert.isTrue(ownerAddress === owner);
  });

  it('changes owner after transfer', async function () {
    let other = accounts[1];
    await this.whitelist.transferOwnership(other, {from:owner});
    let newOwner = await this.whitelist.owner();

    assert.isTrue(newOwner === other);
  });

  it('should prevent non-owners from transfering', async function () {
    const other = accounts[2];
    assert.isTrue(owner !== other);
    await assertRevert(this.whitelist.transferOwnership(other, { from: other }));
  });

  it('should guard ownership against stuck state', async function () {
    await assertRevert(this.whitelist.transferOwnership(null, { from: owner }));
  });

  it('emits a transferOwnership event', async function () {
    let other = accounts[0];
    const { logs } = await this.whitelist.transferOwnership(other, { from:owner });
    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, 'OwnershipTransferred');
    assert.equal(logs[0].args.previousOwner, owner);
    assert.equal(logs[0].args.newOwner, other);
  });

  describe('when the sender is not the owner', function () {
    let other = accounts[0];
    let beneficiary = accounts[1];
    let newAdmin = accounts[2];

    it('reverts at changeAdmin', async function () {
       await assertRevert(this.whitelist.changeAdmin(newAdmin,{ from: admin }));
       await assertRevert(this.whitelist.changeAdmin(newAdmin,{ from: other }));
    });
    it('reverts at setTotalIndividualWeiAmount', async function () {
       await assertRevert(this.whitelist.setTotalIndividualWeiAmount(beneficiary, 1000,{ from: admin }));
       await assertRevert(this.whitelist.setTotalIndividualWeiAmount(beneficiary, 1000,{ from: other }));
    });
    it('reverts at addTotalIndividualWeiAmount', async function () {
       await assertRevert(this.whitelist.addTotalIndividualWeiAmount(beneficiary, 1000,{ from: admin }));
       await assertRevert(this.whitelist.addTotalIndividualWeiAmount(beneficiary, 1000,{ from: other }));
    });
  });

  describe('when the sender is the owner', function () {
    let other = accounts[0];
    let beneficiary = accounts[1];
    let newAdmin = accounts[2];

    it('should change admin', async function () {
       await this.whitelist.changeAdmin(newAdmin,{ from: owner });
       let adminAddress = await this.whitelist.admin();

       assert.isTrue(newAdmin === adminAddress);
    });

    it('should set amount at setTotalIndividualWeiAmount', async function () {
       await this.whitelist.setTotalIndividualWeiAmount(beneficiary, 100,{ from: owner });
       await this.whitelist.setTotalIndividualWeiAmount(beneficiary, 1000,{ from: owner });
       var amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: owner });
       assert.equal(amount, 1000);
    });
    it('should add amount at addTotalIndividualWeiAmount', async function () {
       await this.whitelist.addTotalIndividualWeiAmount(beneficiary, 100,{ from: owner });
       await this.whitelist.addTotalIndividualWeiAmount(beneficiary, 1000,{ from: owner });
       var amount = await this.whitelist.getTotalIndividualWeiAmount(beneficiary, { from: owner });
       assert.equal(amount, 1100);
    });
  });
});
