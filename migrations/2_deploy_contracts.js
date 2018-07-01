const fs = require('fs');

// Smart Contracts
var MultiSigWallet  = artifacts.require('./lib/gnosis-MultiSigWallet/lib/MultiSigWallet.sol');
var TkoToken        = artifacts.require("./TkoToken.sol");
var TkoWhitelist    = artifacts.require("./TkoWhitelist.sol");
var TkoTokenSale = artifacts.require("./TkoTokenSale.sol");

// Read Params
const params = JSON.parse(fs.readFileSync('../config/params.json', 'utf8'));
const openingTime = parseInt(Date.parse(params.openingDate) / 1000);
const closingTime = parseInt(Date.parse(params.closingDate) / 1000);

module.exports = function (deployer, network) {

    // Contracts are deployed at test scripts.
    if(network == 'localtest' || network == 'coverage') return;

    deployer.deploy([
        [MultiSigWallet, params.multiSigAddresses, params.multiSigRequired],
        [TkoWhitelist, params.whitelistAdminAddress],
        TkoToken,
    ]).then(function(){

        deployer.deploy(TkoTokenSale,
            openingTime, closingTime,
            params.initialRate, params.finalRate,
            params.limitEther,
            params.largeContribThreshold,
            params.largeContribPercentage,
            MultiSigWallet.address, TkoToken.address, TkoWhitelist.address
        ).then(function(){

            // Set owner to crowdsale.
            TkoToken.at(TkoToken.address).transferOwnership(TkoTokenSale.address).then( (v) => {
                // Check owner address.
                TkoToken.at(TkoToken.address).owner().then( (value) => {
                    console.log("Token Owner Address:");
                    console.log(value)
                });
            });
            TkoWhitelist.at(TkoWhitelist.address).transferOwnership(TkoTokenSale.address).then( (v) => {
                // Check owner address.
                TkoWhitelist.at(TkoWhitelist.address).owner().then( (value) => {
                    console.log("Whitelist Owner Address:");
                    console.log(value)
                });
            });

            // Set owner to wallet.
            TkoTokenSale.at(TkoTokenSale.address).transferOwnership(MultiSigWallet.address).then( (v) => {
                // Check owner address.
                TkoTokenSale.at(TkoTokenSale.address).owner().then( (value) => {
                    console.log("Crowdsale Owner Address:");
                    console.log(value)
                });
            });
         });
    });
}
