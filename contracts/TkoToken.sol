pragma solidity 0.4.21;

import './lib/zeppelin-solidity/token/ERC20/MintableToken.sol';
import './lib/zeppelin-solidity/token/ERC20/BurnableToken.sol';
import './lib/zeppelin-solidity/token/ERC20/PausableToken.sol';

contract TkoToken is MintableToken, BurnableToken, PausableToken {

    string public constant name = 'TkoToken';

    string public constant symbol = 'TKO';

    uint public constant decimals = 18;

}