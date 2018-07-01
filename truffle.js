require('babel-register');
require('babel-polyfill');
require('web3');

var HDWalletProvider = require("truffle-hdwallet-provider");

var params_test,params_live;
try {
  const fs = require('fs');
  params_test = JSON.parse(fs.readFileSync('../wallet_mnemonic/mnemonic_test.json', 'utf8'));
  params_live = JSON.parse(fs.readFileSync('../wallet_mnemonic/mnemonic_live.json', 'utf8'));
}catch (err){
}

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 7545,
      network_id: '*'
    },
    localtest: {
      host: 'localhost',
      port: 7545,
      network_id: '*',
    },
    coverage: {
      host: 'localhost',
      port: 8545,
      network_id: '*',
      gas: 0xfffffffffff,
      gasPrice: 1
    },
    ropsten: {
      provider: function() {
        return new HDWalletProvider(params_test.mnemonic, params_test.infra_url)
      },
      network_id: 3,
      gasPrice: 100 * (10 ** 9), // 100 Gwei
      gas:4700000
    },
    live: {
      provider: function() {
        return new HDWalletProvider(params_live.mnemonic, params_live.infra_url)
      },
      network_id: 1,
      gasPrice: 10 * (10 ** 9), // 10 Gwei
      gas:4700000
    }
  }
};