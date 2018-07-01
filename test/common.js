import ether from './lib/zeppelin-solidity/helpers/ether';
import { advanceBlock } from './lib/zeppelin-solidity/helpers/advanceToBlock';
import { increaseTimeTo, duration } from './lib/zeppelin-solidity/helpers/increaseTime';
import latestTime from './lib/zeppelin-solidity/helpers/latestTime';
import EVMRevert from './lib/zeppelin-solidity/helpers/EVMRevert';
import assertRevert from './lib/zeppelin-solidity/helpers/assertRevert';
export {ether, advanceBlock, increaseTimeTo, duration, latestTime, EVMRevert,assertRevert}

export const BigNumber = web3.BigNumber;
export const should = require('chai')
                      .use(require('chai-as-promised'))
                      .use(require('chai-bignumber')(BigNumber))
                      .should();

// Smart Contracts
export const TkoToken        = artifacts.require("TkoToken");
export const TkoWhitelist    = artifacts.require("TkoWhitelist");
export const TkoTokenSale    = artifacts.require("TkoTokenSale");
export const MultiSigWallet  = artifacts.require("MultiSigWallet");

// Read Params
const fs = require('fs');
export const params = JSON.parse(fs.readFileSync('./config/params.json', 'utf8'));