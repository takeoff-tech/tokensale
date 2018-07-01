module.exports = {
  compileCommand: 'truffle compile',
  testCommand: 'truffle test --network coverage',
  skipFiles: ['lib/gnosis-MultiSigWallet/MultiSigWallet.sol',
              'lib/zeppelin-solidity/math/SafeMath.sol'],
  norpc:true
};
