pragma solidity 0.4.21;

import './lib/zeppelin-solidity/crowdsale/distribution/FinalizableCrowdsale.sol';
import './lib/zeppelin-solidity/lifecycle/Pausable.sol';
import './lib/zeppelin-solidity/math/SafeMath.sol';

import './TkoToken.sol';
import './TkoWhitelist.sol';

/// @title TKO Token Sale contract.
/// @author Takeoff Technology OU - <info@takeoff.ws>
contract TkoTokenSale is FinalizableCrowdsale, Pausable {

    using SafeMath for uint256;

    uint256 public initialRate;
    uint256 public finalRate;

    uint256 public limitEther;
    uint256 public largeContribThreshold;
    uint256 public largeContribPercentage;

    TkoWhitelist internal whitelist;

    /**
     * TkoTokenSale
     * @dev TkoTokensale sells tokens at a set rate for the specified period.
     * Tokens that can be purchased per 1 Ether will decrease linearly over the period.
     * Bonus tokens are issued for large contributor at the rate specified.
     * If you wish to purchase above the specified amount, you need to be registered in the whitelist.
     * @param _openingTime Opening unix timestamp for TKO token pre-sale.
     * @param _closingTime Closing unix timestamp for TKO token pre-sale.
     * @param _initialRate Number of tokens issued at start (minimum unit) per 1wei.
     * @param _finalRate   Number of tokens issued at end (minimum unit) per 1wei.
     * @param _limitEther  Threshold value of purchase amount not required to register in whitelist (unit Ether).
     * @param _largeContribThreshold Threshold value of purchase amount in which bonus occurs (unit Ether)
     * @param _largeContribPercentage Percentage of added bonus
     * @param _wallet Wallet address to store Ether.
     * @param _token The address of the token to be sold in the token sale. TkoTokenSale must have ownership for mint.
     * @param _whitelist The address of the whitelist.
     */
    function TkoTokenSale (
        uint256 _openingTime,
        uint256 _closingTime,
        uint256 _initialRate,
        uint256 _finalRate,
        uint256 _limitEther,
        uint256 _largeContribThreshold,
        uint256 _largeContribPercentage,
        address _wallet,
        TkoToken _token,
        TkoWhitelist _whitelist
    )
    public
    Crowdsale(_initialRate, _wallet, _token)
    TimedCrowdsale(_openingTime, _closingTime)
    {
        initialRate = _initialRate;
        finalRate   = _finalRate;

        limitEther = _limitEther;
        largeContribThreshold  = _largeContribThreshold;
        largeContribPercentage = _largeContribPercentage;

        whitelist = _whitelist;
    }

    /**
     * @dev Extend parent behavior to confirm purchase amount and whitelist.
     * @param _beneficiary Token purchaser
     * @param _weiAmount Amount of wei contributed
     */
    function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal onlyWhileOpen whenNotPaused {

        uint256 limitWeiAmount = limitEther.mul(1 ether);
        require( whitelist.isWhitelisted(_beneficiary) ||
                    whitelist.getTotalIndividualWeiAmount(_beneficiary).add(_weiAmount) < limitWeiAmount);
        super._preValidatePurchase(_beneficiary, _weiAmount);
    }

    /**
     * @dev Returns the rate of tokens per wei at the present time.
     * Note that, as price _increases_ with time, the rate _decreases_.
     * @return The number of tokens a buyer gets per wei at a given time
     */
    function getCurrentRate() public view returns (uint256) {
        uint256 elapsedTime = now.sub(openingTime);
        uint256 timeRange = closingTime.sub(openingTime);
        uint256 rateRange = initialRate.sub(finalRate);
        return initialRate.sub(elapsedTime.mul(rateRange).div(timeRange));
    }


    /**
     * @dev Overrides parent method taking into account variable rate and add bonus for large contributor.
     * @param _weiAmount The value in wei to be converted into tokens
     * @return The number of tokens _weiAmount wei will buy at present time
     */
    function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {

        uint256 currentRate = getCurrentRate();
        uint256 tokenAmount = currentRate.mul(_weiAmount);

        uint256 largeContribThresholdWeiAmount = largeContribThreshold.mul(1 ether);
        if ( _weiAmount >= largeContribThresholdWeiAmount ) {
            tokenAmount = tokenAmount.mul(largeContribPercentage).div(100);
        }

        return tokenAmount;
    }

    /**
     * @dev Add wei amount to the address's amount on the whitelist contract.
     * @param _beneficiary Address receiving the tokens
     * @param _weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address _beneficiary, uint256 _weiAmount) internal {
        whitelist.addTotalIndividualWeiAmount(_beneficiary, _weiAmount);
        super._updatePurchasingState(_beneficiary, _weiAmount);
    }

    /**
    * @dev Overrides delivery by minting tokens upon purchase.
    * @param _beneficiary Token purchaser
    * @param _tokenAmount Number of tokens to be minted
    */
    function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal onlyWhileOpen whenNotPaused {
        // Don't call super._deliverTokens() to transfer token.
        // Following call will mint FOR _beneficiary, So need not to call transfer token .
        require(TkoToken(token).mint(_beneficiary, _tokenAmount));
    }

    /**
     * @dev called by the owner to pause, triggers stopped state
     */
    function pauseCrowdsale() public onlyOwner whenNotPaused {
        TkoToken(token).pause();
        super.pause();
    }

    /**
     * @dev called by the owner to unpause, returns to normal state
    */
    function unpauseCrowdsale() public onlyOwner whenPaused {
        TkoToken(token).unpause();
        super.unpause();
    }

    /**
     * @dev called by the owner to change owner of token and whitelist.
    */
    function evacuate() public onlyOwner {
        TkoToken(token).transferOwnership(wallet);
        whitelist.transferOwnership(wallet);
    }

    /**
     * @dev Can be overridden to add finalization logic. The overriding function
     * should call super.finalization() to ensure the chain of finalization is
     * executed entirely.
     */
    function finalization() internal {
        TkoToken(token).transferOwnership(wallet);
        whitelist.transferOwnership(wallet);
        super.finalization();
    }

}